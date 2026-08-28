import SwiftUI
import AppKit

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

    public func makeNSView(context: Context) -> NSScrollView {
        let sid = pane.sessionId ?? pane.paneId

        let scrollView = NSScrollView()
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.autohidesScrollers = true
        scrollView.borderType = .noBorder
        scrollView.backgroundColor = NSColor(red: 9/255.0, green: 10/255.0, blue: 15/255.0, alpha: 1.0)

        let textView = CustomTerminalTextView()
        textView.appState = appState
        textView.sessionId = sid
        textView.backgroundColor = NSColor(red: 9/255.0, green: 10/255.0, blue: 15/255.0, alpha: 1.0)
        textView.textColor = NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0)
        textView.font = NSFont.monospacedSystemFont(ofSize: 13.0, weight: .regular)
        textView.isEditable = false
        textView.isSelectable = true
        textView.insertionPointColor = NSColor(red: 56/255.0, green: 189/255.0, blue: 248/255.0, alpha: 1.0)
        textView.autoresizingMask = [.width]
        textView.textContainer?.containerSize = NSSize(width: scrollView.contentSize.width, height: CGFloat.greatestFiniteMagnitude)
        textView.textContainer?.widthTracksTextView = true

        // Attach or restore persistent NSTextStorage
        if let existingStorage = appState.terminalStorages[sid] {
            textView.layoutManager?.replaceTextStorage(existingStorage)
        } else {
            let storage = NSTextStorage()
            appState.terminalStorages[sid] = storage
            textView.layoutManager?.replaceTextStorage(storage)
        }

        scrollView.documentView = textView
        context.coordinator.textView = textView
        context.coordinator.appState = appState

        context.coordinator.startSession(appState: appState, pane: pane)
        return scrollView
    }

    public func updateNSView(_ nsView: NSScrollView, context: Context) {
        let sid = pane.sessionId ?? pane.paneId
        if let textView = nsView.documentView as? CustomTerminalTextView {
            textView.appState = appState
            textView.sessionId = sid

            if let existingStorage = appState.terminalStorages[sid], textView.textStorage !== existingStorage {
                textView.layoutManager?.replaceTextStorage(existingStorage)
            }

            if isActive && textView.window?.firstResponder != textView {
                textView.window?.makeFirstResponder(textView)
            }
        }
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    @MainActor
    public class Coordinator: NSObject {
        var parent: NativeTerminalPaneView
        weak var textView: CustomTerminalTextView?
        weak var appState: AppState?

        init(_ parent: NativeTerminalPaneView) {
            self.parent = parent
        }

        func startSession(appState: AppState, pane: TerminalPaneState) {
            let sid = pane.sessionId ?? pane.paneId

            if pane.isLocal {
                // If local PTY session is already running, simply re-bind listener!
                if let existingPty = appState.localSessions[sid] {
                    existingPty.onDataReceived = { [weak self] data in
                        self?.appendRawData(data, sessionId: sid)
                    }
                    return
                }

                let pty = LocalPtySession(sessionId: sid)
                appState.localSessions[sid] = pty

                pty.onDataReceived = { [weak self] data in
                    self?.appendRawData(data, sessionId: sid)
                }

                _ = pty.start()
            } else if let host = pane.host {
                // If SSH session is already running, simply re-bind listener!
                if let existingSSH = appState.sshSessions[sid] {
                    existingSSH.onDataReceived = { [weak self] data in
                        self?.appendRawData(data, sessionId: sid)
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

                if isYubiKeyAuth {
                    self.appendPlainText("[YubiKey 硬體認證]: 偵測到硬體金鑰配置，若設備綠燈閃爍請觸碰金屬觸控環...\r\n", sessionId: sid)
                }

                let ssh = SSHSession(sessionId: sid, host: host)
                appState.sshSessions[sid] = ssh

                ssh.onDataReceived = { [weak self] data in
                    self?.appendRawData(data, sessionId: sid)
                }

                ssh.onError = { [weak self] err in
                    self?.appendPlainText("\r\n[SSH 連線錯誤]: \(err)\r\n", sessionId: sid)
                }

                if needsTouchId {
                    let keyDisplayName = hostKey?.name ?? fallbackKey?.name ?? host.label
                    self.appendPlainText("[Touch ID 安全驗證]: 正在調用「\(keyDisplayName)」私鑰，請按壓指紋授權...\r\n", sessionId: sid)
                    Task {
                        let res = await BiometricsService.shared.promptTouchID(
                            reason: "調用「\(keyDisplayName)」私鑰認證伺服器「\(host.label)」，請驗證 Touch ID 指紋"
                        )
                        if !res.success {
                            self.appendPlainText("\r\n[Touch ID 認證未通過]: \(res.error ?? "指紋識別未授權或已取消，連線已終止。")\r\n", sessionId: sid)
                            appState.sshSessions.removeValue(forKey: sid)
                            return
                        }
                        self.appendPlainText("[Touch ID 驗證成功]: 指紋授權通過，正在建立原生 SSH 連線至 \(host.label) (\(host.hostname):\(host.port))...\r\n", sessionId: sid)
                        _ = ssh.connect()
                    }
                } else {
                    self.appendPlainText("正在建立原生 SSH 連線至 \(host.label) (\(host.hostname):\(host.port))...\r\n", sessionId: sid)
                    _ = ssh.connect()
                }
            }
        }

        func appendPlainText(_ text: String, sessionId: String) {
            let storage = appState?.terminalStorages[sessionId] ?? textView?.textStorage
            guard let textStorage = storage else { return }

            let attr = NSAttributedString(
                string: text,
                attributes: [
                    .font: NSFont.monospacedSystemFont(ofSize: 13.0, weight: .regular),
                    .foregroundColor: NSColor(red: 56/255.0, green: 189/255.0, blue: 248/255.0, alpha: 1.0)
                ]
            )
            textStorage.append(attr)
            textView?.scrollToEndOfDocument(nil)
        }

        func appendRawData(_ data: Data, sessionId: String) {
            let storage = appState?.terminalStorages[sessionId] ?? textView?.textStorage
            guard let textStorage = storage else { return }

            if let string = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .ascii) {
                let clean = cleanAnsi(string)
                guard !clean.isEmpty else { return }

                let attr = NSAttributedString(
                    string: clean,
                    attributes: [
                        .font: NSFont.monospacedSystemFont(ofSize: 13.0, weight: .regular),
                        .foregroundColor: NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0)
                    ]
                )
                textStorage.append(attr)
                textView?.scrollToEndOfDocument(nil)
            }
        }

        private func cleanAnsi(_ text: String) -> String {
            var str = text
            // 1. OSC sequences: \x1b]...(\x07|\x1b\\)
            str = str.replacingOccurrences(of: "\u{001B}\\][^\u{0007}\u{001B}]*(\u{0007}|\u{001B}\\\\)?", with: "", options: .regularExpression)
            
            // 2. CSI sequences: \x1b\[[?>=<]?[0-9;]*[a-zA-Z~]
            str = str.replacingOccurrences(of: "\u{001B}\\[[?>=<]?[0-9;]*[a-zA-Z~]", with: "", options: .regularExpression)
            
            // 3. 2-character escape sequences: \x1b[@-Z\\-_=><]
            str = str.replacingOccurrences(of: "\u{001B}[@-Z\\\\-_=><]", with: "", options: .regularExpression)
            
            // 4. Standalone escape or control characters (\x00-\x08, \x0B, \x0C, \x0E-\x1F except \t, \n, \r)
            str = str.replacingOccurrences(of: "[\u{0000}-\u{0008}\u{000B}\u{000C}\u{000E}-\u{001F}\u{007F}]", with: "", options: .regularExpression)
            
            // 5. In case escape character was split across packets: strip leftover dangling ?2004h/l or ]0;...
            str = str.replacingOccurrences(of: "\\[\\?[0-9]+[hl]", with: "", options: .regularExpression)
            str = str.replacingOccurrences(of: "\\?[0-9]{3,5}[hl]", with: "", options: .regularExpression)
            str = str.replacingOccurrences(of: "\\]0;[^\r\n\u{0007}]*[\u{0007}]?", with: "", options: .regularExpression)
            
            return str
        }
    }
}

public class CustomTerminalTextView: NSTextView {
    public weak var appState: AppState?
    public var sessionId: String = ""

    public override var acceptsFirstResponder: Bool { true }

    public override func resignFirstResponder() -> Bool {
        return true
    }

    public override func mouseDown(with event: NSEvent) {
        super.mouseDown(with: event)
        self.window?.makeFirstResponder(self)
    }

    public override func keyDown(with event: NSEvent) {
        // Strictly verify that this terminal view is currently the active focused firstResponder in the window
        guard let window = self.window, window.firstResponder === self else {
            super.keyDown(with: event)
            return
        }

        guard let chars = event.characters, !chars.isEmpty else {
            super.keyDown(with: event)
            return
        }

        if let data = chars.data(using: .utf8) {
            appState?.sendDataToSession(sessionId: sessionId, data: data)
        }
    }

    public override func paste(_ sender: Any?) {
        if let text = NSPasteboard.general.string(forType: .string),
           let data = text.data(using: .utf8) {
            appState?.sendDataToSession(sessionId: sessionId, data: data)
        }
    }
}
