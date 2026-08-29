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
        contentController.add(context.coordinator, name: "terminalLog")
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

        // Start session immediately
        context.coordinator.startSession(appState: appState, pane: pane)

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
        private var sessionStarted: Bool = false
        private var isExplicitlyClosedByUser: Bool = false
        private var isUserInitiatedExit: Bool = false
        private var reconnectAttempt: Int = 0

        init(_ parent: NativeTerminalPaneView) {
            self.parent = parent
        }

        func loadTerminalHTML(webView: WKWebView) {
            var targetURL: URL? = nil

            // 1. Check App Bundle Resources
            if let bundleURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "terminal_bundle") {
                targetURL = bundleURL
            } else if let resourcePath = Bundle.main.resourcePath {
                let directPath = URL(fileURLWithPath: resourcePath).appendingPathComponent("terminal_bundle/index.html")
                if FileManager.default.fileExists(atPath: directPath.path) {
                    targetURL = directPath
                }
            }

            // 2. Development Fallback Path
            if targetURL == nil {
                let devPath = "/Users/lijt/項目/SSH-terminal/macOS-native/Sources/ITGeekTerminal/Resources/terminal_bundle/index.html"
                if FileManager.default.fileExists(atPath: devPath) {
                    targetURL = URL(fileURLWithPath: devPath)
                }
            }

            if let url = targetURL, let html = try? String(contentsOf: url, encoding: .utf8) {
                let baseURL = url.deletingLastPathComponent()
                webView.loadHTMLString(html, baseURL: baseURL)
            } else {
                print("Error: Could not locate terminal_bundle/index.html")
            }
        }

        public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let appState = self.appState, let webView = self.webView else { return }
            let sid = webView.sessionId

            if message.name == "terminalReady" {
                self.isTerminalReady = true

                // Flush pending buffered data
                let queued = self.pendingData
                self.pendingData.removeAll()
                for data in queued {
                    writeToXterm(data: data)
                }

                webView.evaluateJavaScript("if (window.fitTerminal) { window.fitTerminal(); window.focusTerminal(); }", completionHandler: nil)
            } else if message.name == "terminalData" {
                if let str = message.body as? String, let data = str.data(using: .utf8) {
                    let lower = str.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
                    if lower == "exit" || lower == "logout" || str.contains("exit\r") || str.contains("exit\n") || str.contains("logout\r") || str.contains("logout\n") || str == "\u{04}" {
                        self.isUserInitiatedExit = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) { [weak self] in
                            self?.isUserInitiatedExit = false
                        }
                    }
                    appState.sendDataToSession(sessionId: sid, data: data)
                }
            } else if message.name == "terminalResize" {
                if let dict = message.body as? [String: Any],
                   let cols = dict["cols"] as? Int,
                   let rows = dict["rows"] as? Int {
                    appState.resizeSession(sessionId: sid, cols: UInt16(cols), rows: UInt16(rows))
                }
            } else if message.name == "terminalLog" {
                print("[Xterm JS Log]: \(message.body)")
            }
        }

        func startSession(appState: AppState, pane: TerminalPaneState) {
            guard !sessionStarted else { return }
            sessionStarted = true

            let sid = pane.sessionId ?? pane.paneId
            appState.updatePaneStatus(sessionId: sid, status: "connecting")

            if pane.isLocal {
                if let existingPty = appState.localSessions[sid] {
                    existingPty.onDataReceived = { [weak self] data in
                        self?.appState?.updatePaneStatus(sessionId: sid, status: "connected")
                        self?.writeToXterm(data: data)
                    }
                    existingPty.onTerminated = { [weak self] _ in
                        self?.appState?.updatePaneStatus(sessionId: sid, status: "disconnected")
                    }
                    return
                }

                let pty = LocalPtySession(sessionId: sid)
                appState.localSessions[sid] = pty

                pty.onDataReceived = { [weak self] data in
                    self?.appState?.updatePaneStatus(sessionId: sid, status: "connected")
                    self?.writeToXterm(data: data)
                }

                pty.onTerminated = { [weak self] _ in
                    self?.appState?.updatePaneStatus(sessionId: sid, status: "disconnected")
                }

                _ = pty.start()
            } else if let host = pane.host {
                if let existingSSH = appState.sshSessions[sid] {
                    existingSSH.onDataReceived = { [weak self] data in
                        self?.appState?.updatePaneStatus(sessionId: sid, status: "connected")
                        self?.writeToXterm(data: data)
                    }
                    existingSSH.onClosed = { [weak self] exitCode in
                        self?.handleSSHClosed(host: host, sid: sid, exitCode: exitCode)
                    }
                    existingSSH.onError = { [weak self] err in
                        self?.appState?.updatePaneStatus(sessionId: sid, status: "error", errorMessage: err)
                        self?.writePlainText("\r\n\u{001B}[31m[SSH 連線錯誤]: \(err)\u{001B}[0m\r\n")
                    }
                    return
                }

                appState.reconnectHandlers[sid] = { [weak self] in
                    guard let self = self else { return }
                    self.writePlainText("\r\n\u{001B}[36m[手動重連]: 正在重新連線至 \(host.label) (\(host.hostname):\(host.port))...\u{001B}[0m\r\n")
                    self.reconnectAttempt = 0
                    self.connectSSH(host: host, sid: sid, isAutoReconnect: true)
                }

                connectSSH(host: host, sid: sid, isAutoReconnect: false)
            }
        }

        private func connectSSH(host: HostItem, sid: String, isAutoReconnect: Bool = false) {
            guard let appState = self.appState else { return }

            let hostKey = appState.vault.keys.first(where: { $0.id == host.keyId })
            let fallbackKey = appState.vault.keys.first(where: { $0.id == host.fallbackKeyId })

            let keyRequiresTouchId = (hostKey?.touchIdProtected == true) ||
                                     (fallbackKey?.touchIdProtected == true)

            let needsTouchId = (host.requireTouchId == true) ||
                               (appState.vault.settings.touchIdForHosts == true) ||
                               (host.touchIdForKey == true) ||
                               keyRequiresTouchId

            let ssh = SSHSession(sessionId: sid, host: host)
            appState.sshSessions[sid] = ssh

            ssh.onDataReceived = { [weak self] data in
                guard let self = self else { return }
                if self.reconnectAttempt > 0 || isAutoReconnect {
                    self.writePlainText("\r\n\u{001B}[32m[重連成功]: 已成功重新連線至 \(host.label) 並恢復終端通訊！\u{001B}[0m\r\n")
                    self.reconnectAttempt = 0

                    // Auto-execute sudo su to restore root environment for seamless Agent operations
                    if host.username.lowercased() != "root" {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
                            self?.writePlainText("\u{001B}[35m[環境自適應]: 自動執行 sudo su 切換至 root 環境...\u{001B}[0m\r\n")
                            if let sudoData = "sudo su\n".data(using: .utf8) {
                                self?.appState?.sendDataToSession(sessionId: sid, data: sudoData)
                            }
                        }
                    }
                }
                self.appState?.updatePaneStatus(sessionId: sid, status: "connected")
                self.writeToXterm(data: data)
            }

            ssh.onClosed = { [weak self] exitCode in
                self?.handleSSHClosed(host: host, sid: sid, exitCode: exitCode)
            }

            ssh.onError = { [weak self] err in
                self?.appState?.updatePaneStatus(sessionId: sid, status: "error", errorMessage: err)
                self?.writePlainText("\r\n\u{001B}[31m[SSH 連線錯誤]: \(err)\u{001B}[0m\r\n")
            }

            if isAutoReconnect {
                _ = ssh.connect()
                return
            }

            if needsTouchId {
                let keyDisplayName = hostKey?.name ?? fallbackKey?.name ?? host.label
                self.writePlainText("\u{001B}[35m[Touch ID 指紋安全授權]: 正在調用「\(keyDisplayName)」私鑰，請在彈出的系統指紋對話框按壓 Touch ID...\u{001B}[0m\r\n")
                Task {
                    let res = await BiometricsService.shared.promptTouchID(
                        reason: "調用「\(keyDisplayName)」私鑰認證伺服器「\(host.label)」，請驗證 Touch ID 指紋"
                    )
                    if !res.success {
                        self.writePlainText("\r\n\u{001B}[31m[Touch ID 認證未通過]: \(res.error ?? "指紋識別未授權或已取消，連線已終止。")\u{001B}[0m\r\n")
                        self.appState?.updatePaneStatus(sessionId: sid, status: "disconnected")
                        self.appState?.sshSessions.removeValue(forKey: sid)
                        return
                    }
                    self.writePlainText("\u{001B}[32m[Touch ID 驗證成功]: 指紋授權通過，正在建立原生 SSH 連線至 \(host.label) (\(host.hostname):\(host.port))...\u{001B}[0m\r\n")
                    _ = ssh.connect()
                }
            } else if host.authType == .yubikey {
                let yubiKey = appState.vault.keys.first(where: { $0.id == host.yubikeyKeyId })
                let serial = yubiKey?.yubikeySerial ?? "YK-17891328"
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
                        self?.appState?.updatePaneStatus(sessionId: sid, status: "disconnected")
                        self?.appState?.sshSessions.removeValue(forKey: sid)
                    }
                )
            } else {
                self.writePlainText("正在建立原生 SSH 連線至 \(host.label) (\(host.hostname):\(host.port))...\r\n")
                _ = ssh.connect()
            }
        }

        private func handleSSHClosed(host: HostItem, sid: String, exitCode: Int32) {
            self.appState?.updatePaneStatus(sessionId: sid, status: "disconnected")

            // Distinguish normal user exit from abnormal network/server drop
            let isNormalExit = (exitCode == 0) || self.isUserInitiatedExit

            if isNormalExit {
                self.reconnectAttempt = 0
                self.isUserInitiatedExit = false
                self.writePlainText("\r\n\u{001B}[32m[會話已結束]: 使用者手動退出連線 (exit \(exitCode))。如需重新連線，請點擊上方「一鍵重連」按鈕。\u{001B}[0m\r\n")
            } else if !self.isExplicitlyClosedByUser && self.reconnectAttempt < 5 {
                self.reconnectAttempt += 1
                let delay = Double(min(15, self.reconnectAttempt * 3))
                self.writePlainText("\r\n\u{001B}[33m[異常中斷 | 觸發自動重連]: 檢測到網路異常中斷或伺服器重啟 (Exit Code: \(exitCode))，將在 \(Int(delay)) 秒後進行第 \(self.reconnectAttempt)/5 次自動重連...\u{001B}[0m\r\n")
                self.appState?.updatePaneStatus(sessionId: sid, status: "connecting")

                DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                    guard let self = self, !self.isExplicitlyClosedByUser else { return }
                    self.writePlainText("\u{001B}[36m[自動重連]: 正在重新連線至 \(host.label) (\(host.hostname):\(host.port))...\u{001B}[0m\r\n")
                    self.connectSSH(host: host, sid: sid, isAutoReconnect: true)
                }
            } else {
                self.writePlainText("\r\n\u{001B}[31m[連線已中斷]: SSH 連線已終止。\u{001B}[0m\r\n")
            }
        }

        func writeToXterm(data: Data) {
            let text = String(decoding: data, as: UTF8.self)
            if let appState = self.appState, let webView = self.webView {
                let sid = webView.sessionId
                appState.appendTerminalOutput(sessionId: sid, text: text)
                DevOpsAgentService.shared.onTerminalOutput(
                    sessionId: sid,
                    text: text,
                    host: parent.pane.host,
                    isLocal: parent.pane.isLocal,
                    appState: appState
                )
            }

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
    public override func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        DispatchQueue.main.async { [weak self] in
            self?.evaluateJavaScript("if (window.fitTerminal) { window.fitTerminal(); }", completionHandler: nil)
        }
    }

    public override func layout() {
        super.layout()
        DispatchQueue.main.async { [weak self] in
            self?.evaluateJavaScript("if (window.fitTerminal) { window.fitTerminal(); }", completionHandler: nil)
        }
    }

    public override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window != nil {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                self?.evaluateJavaScript("if (window.fitTerminal) { window.fitTerminal(); window.focusTerminal(); }", completionHandler: nil)
            }
        }
    }

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
