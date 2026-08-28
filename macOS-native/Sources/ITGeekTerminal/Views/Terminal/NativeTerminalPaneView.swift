import SwiftUI
import AppKit
import WebKit

public struct NativeTerminalPaneView: NSViewRepresentable {
    @ObservedObject var appState: AppState
    let pane: TerminalPaneState
    let tabId: String
    let isActive: Bool

    public init(appState: AppState, pane: TerminalPaneState, tabId: String, isActive: Bool) {
        self.appState = appState
        self.pane = pane
        self.tabId = tabId
        self.isActive = isActive
    }

    public func makeNSView(context: Context) -> CustomTerminalWebView {
        let sid = pane.sessionId ?? pane.paneId

        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "terminalData")
        contentController.add(context.coordinator, name: "terminalResize")
        contentController.add(context.coordinator, name: "terminalReady")
        config.userContentController = contentController
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        let webView = CustomTerminalWebView(frame: .zero, configuration: config)
        webView.appState = appState
        webView.tabId = tabId
        webView.sessionId = sid
        webView.navigationDelegate = context.coordinator
        webView.wantsLayer = true
        webView.layer?.backgroundColor = NSColor(red: 9/255.0, green: 10/255.0, blue: 15/255.0, alpha: 1.0).cgColor
        webView.setValue(false, forKey: "drawsBackground")

        context.coordinator.webView = webView
        context.coordinator.appState = appState
        context.coordinator.loadTerminalHTML(webView: webView)

        return webView
    }

    public func updateNSView(_ nsView: CustomTerminalWebView, context: Context) {
        let sid = pane.sessionId ?? pane.paneId
        nsView.appState = appState
        nsView.sessionId = sid
        nsView.tabId = tabId

        if isActive {
            nsView.evaluateJavaScript("if (window.fitTerminal) { window.fitTerminal(); window.focusTerminal(); }", completionHandler: nil)
        }
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    @MainActor
    public class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        var parent: NativeTerminalPaneView
        weak var webView: CustomTerminalWebView?
        weak var appState: AppState?
        private var isTerminalReady: Bool = false
        private var pendingData: [Data] = []

        init(_ parent: NativeTerminalPaneView) {
            self.parent = parent
        }

        func loadTerminalHTML(webView: WKWebView) {
            var htmlURL: URL? = nil

            // 1. Check App Bundle Resources
            if let bundleURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "terminal_bundle") {
                htmlURL = bundleURL
            } else if let resourcePath = Bundle.main.resourcePath {
                let directPath = URL(fileURLWithPath: resourcePath).appendingPathComponent("terminal_bundle/index.html")
                if FileManager.default.fileExists(atPath: directPath.path) {
                    htmlURL = directPath
                }
            }

            // 2. Development Fallback Path
            if htmlURL == nil {
                let devPath = "/Users/lijt/項目/SSH-terminal/macOS-native/Sources/ITGeekTerminal/Resources/terminal_bundle/index.html"
                if FileManager.default.fileExists(atPath: devPath) {
                    htmlURL = URL(fileURLWithPath: devPath)
                }
            }

            if let targetURL = htmlURL {
                let readAccessURL = targetURL.deletingLastPathComponent()
                webView.loadFileURL(targetURL, allowingReadAccessTo: readAccessURL)
            } else {
                print("Error: Could not locate terminal_bundle/index.html")
            }
        }

        public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let appState = self.appState, let webView = self.webView else { return }
            let sid = webView.sessionId

            if message.name == "terminalReady" {
                self.isTerminalReady = true
                self.startSession(appState: appState, pane: parent.pane)

                // Flush pending buffered data
                for data in pendingData {
                    writeToXterm(data: data)
                }
                pendingData.removeAll()
            } else if message.name == "terminalData" {
                if let str = message.body as? String, let data = str.data(using: .utf8) {
                    appState.sendDataToSession(sessionId: sid, data: data)
                }
            } else if message.name == "terminalResize" {
                if let dict = message.body as? [String: Any],
                   let cols = dict["cols"] as? Int,
                   let rows = dict["rows"] as? Int {
                    appState.resizeSession(sessionId: sid, cols: UInt16(cols), rows: UInt16(rows))
                }
            }
        }

        func startSession(appState: AppState, pane: TerminalPaneState) {
            let sid = pane.sessionId ?? pane.paneId

            if pane.isLocal {
                if let existingPty = appState.localSessions[sid] {
                    existingPty.onDataReceived = { [weak self] data in
                        self?.writeToXterm(data: data)
                    }
                    return
                }

                let pty = LocalPtySession(sessionId: sid)
                appState.localSessions[sid] = pty

                pty.onDataReceived = { [weak self] data in
                    self?.writeToXterm(data: data)
                }

                _ = pty.start()
            } else if let host = pane.host {
                if let existingSSH = appState.sshSessions[sid] {
                    existingSSH.onDataReceived = { [weak self] data in
                        self?.writeToXterm(data: data)
                    }
                    return
                }

                let hostKey = appState.vault.keys.first(where: { $0.id == host.keyId })
                let fallbackKey = appState.vault.keys.first(where: { $0.id == host.fallbackKeyId })
                let yubiKey = appState.vault.keys.first(where: { $0.id == host.yubikeyKeyId })

                let keyRequiresTouchId = (hostKey?.touchIdProtected == true) ||
                                         (fallbackKey?.touchIdProtected == true) ||
                                         (yubiKey?.touchIdProtected == true)

                let isYubiKeyAuth = (host.authType == .yubikey) ||
                                    (host.authType == .hybrid) ||
                                    (host.yubikeyKeyId != nil) ||
                                    (hostKey?.storageType == "yubikey_fido2") ||
                                    (yubiKey?.storageType == "yubikey_fido2")

                let needsTouchId = (host.requireTouchId == true) ||
                                   (appState.vault.settings.touchIdForHosts == true) ||
                                   (host.touchIdForKey == true) ||
                                   keyRequiresTouchId

                let ssh = SSHSession(sessionId: sid, host: host)
                appState.sshSessions[sid] = ssh

                ssh.onDataReceived = { [weak self] data in
                    self?.writeToXterm(data: data)
                }

                ssh.onError = { [weak self] err in
                    self?.writePlainText("\r\n\u{001B}[31m[SSH 連線錯誤]: \(err)\u{001B}[0m\r\n")
                }

                if isYubiKeyAuth {
                    let devs = YubikeyService.shared.listDevices()
                    let serial = devs.first?.serial ?? yubiKey?.yubikeySerial ?? "YK-17891328"
                    let keyDisplayName = yubiKey?.name ?? hostKey?.name ?? "YubiKey 5 FIDO2/PIV"

                    self.writePlainText("\u{001B}[33m[YubiKey 硬體認證]: 正在調用 YubiKey 5 實體硬體金鑰「\(keyDisplayName)」，請觸碰設備金屬環...\u{001B}[0m\r\n")

                    appState.yubikeyTouchPrompt = YubiKeyTouchPromptData(
                        hostLabel: host.label,
                        keyName: keyDisplayName,
                        serial: serial,
                        onConfirm: {
                            _ = ssh.connect()
                        },
                        onCancel: { [weak self] in
                            self?.writePlainText("\r\n\u{001B}[31m[YubiKey 認證已取消]: 連線已終止。\u{001B}[0m\r\n")
                            appState.sshSessions.removeValue(forKey: sid)
                        }
                    )
                } else if needsTouchId {
                    let keyDisplayName = hostKey?.name ?? fallbackKey?.name ?? host.label
                    self.writePlainText("\u{001B}[35m[Touch ID 安全驗證]: 正在調用「\(keyDisplayName)」私鑰，請按壓指紋授權...\u{001B}[0m\r\n")
                    Task {
                        let res = await BiometricsService.shared.promptTouchID(
                            reason: "調用「\(keyDisplayName)」私鑰認證伺服器「\(host.label)」，請驗證 Touch ID 指紋"
                        )
                        if !res.success {
                            self.writePlainText("\r\n\u{001B}[31m[Touch ID 認證未通過]: \(res.error ?? "指紋識別未授權或已取消，連線已終止。")\u{001B}[0m\r\n")
                            appState.sshSessions.removeValue(forKey: sid)
                            return
                        }
                        self.writePlainText("\u{001B}[32m[Touch ID 驗證成功]: 指紋授權通過，正在建立原生 SSH 連線至 \(host.label) (\(host.hostname):\(host.port))...\u{001B}[0m\r\n")
                        _ = ssh.connect()
                    }
                } else {
                    self.writePlainText("正在建立原生 SSH 連線至 \(host.label) (\(host.hostname):\(host.port))...\r\n")
                    _ = ssh.connect()
                }
            }
        }

        func writeToXterm(data: Data) {
            guard isTerminalReady else {
                pendingData.append(data)
                return
            }

            let base64 = data.base64EncodedString()
            DispatchQueue.main.async { [weak self] in
                self?.webView?.evaluateJavaScript("window.writeTerminalData('\(base64)')", completionHandler: nil)
            }
        }

        func writePlainText(_ text: String) {
            if let data = text.data(using: .utf8) {
                writeToXterm(data: data)
            }
        }
    }
}

public class CustomTerminalWebView: WKWebView {
    public weak var appState: AppState?
    public var sessionId: String = ""
    public var tabId: String = ""

    public override func performKeyEquivalent(with event: NSEvent) -> Bool {
        let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)

        // Command + K: Toggle AI Agent
        if flags == .command && event.charactersIgnoringModifiers == "k" {
            appState?.inlineAIAgentOpen.toggle()
            return true
        }

        // Command + L: Toggle AI Assistant Drawer
        if flags == .command && event.charactersIgnoringModifiers == "l" {
            appState?.isDrawerOpen.toggle()
            return true
        }

        // Command + W: Close current terminal tab
        if flags == .command && event.charactersIgnoringModifiers == "w" {
            if !tabId.isEmpty {
                appState?.closeTab(tabId: tabId)
                return true
            }
        }

        // Command + T: Open local shell tab
        if flags == .command && event.charactersIgnoringModifiers == "t" {
            appState?.openLocalTerminal()
            return true
        }

        return super.performKeyEquivalent(with: event)
    }
}
