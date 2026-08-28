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
        textView.tabId = tabId
        textView.backgroundColor = NSColor(red: 9/255.0, green: 10/255.0, blue: 15/255.0, alpha: 1.0)
        textView.textColor = NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0)
        textView.font = NSFont.monospacedSystemFont(ofSize: 13.0, weight: .regular)
        textView.isEditable = false
        textView.isSelectable = true
        textView.insertionPointColor = NSColor(red: 56/255.0, green: 189/255.0, blue: 248/255.0, alpha: 1.0)
        textView.autoresizingMask = [.width]
        textView.textContainer?.containerSize = NSSize(width: scrollView.contentSize.width, height: CGFloat.greatestFiniteMagnitude)
        textView.textContainer?.widthTracksTextView = true
        textView.startCursorBlinkTimer()

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
            textView.tabId = tabId

            if let existingStorage = appState.terminalStorages[sid], textView.textStorage !== existingStorage {
                textView.layoutManager?.replaceTextStorage(existingStorage)
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
        private var decoders: [String: Utf8StreamDecoder] = [:]

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

                let ssh = SSHSession(sessionId: sid, host: host)
                appState.sshSessions[sid] = ssh

                ssh.onDataReceived = { [weak self] data in
                    self?.appendRawData(data, sessionId: sid)
                }

                ssh.onError = { [weak self] err in
                    self?.appendPlainText("\r\n[SSH 連線錯誤]: \(err)\r\n", sessionId: sid)
                }

                if isYubiKeyAuth {
                    let devs = YubikeyService.shared.listDevices()
                    let serial = devs.first?.serial ?? yubiKey?.yubikeySerial ?? "YK-17891328"
                    let keyDisplayName = yubiKey?.name ?? hostKey?.name ?? "YubiKey 5 FIDO2/PIV"

                    self.appendPlainText("[YubiKey 硬體認證]: 正在調用 YubiKey 5 實體硬體金鑰「\(keyDisplayName)」，請觸碰設備金屬環...\r\n", sessionId: sid)

                    appState.yubikeyTouchPrompt = YubiKeyTouchPromptData(
                        hostLabel: host.label,
                        keyName: keyDisplayName,
                        serial: serial,
                        onConfirm: {
                            _ = ssh.connect()
                        },
                        onCancel: { [weak self] in
                            self?.appendPlainText("\r\n[YubiKey 認證已取消]: 連線已終止。\r\n", sessionId: sid)
                            appState.sshSessions.removeValue(forKey: sid)
                        }
                    )
                } else if needsTouchId {
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
            textView?.setSelectedRange(NSRange(location: textStorage.length, length: 0))
            textView?.scrollToEndOfDocument(nil)
            textView?.needsDisplay = true
        }

        func appendRawData(_ data: Data, sessionId: String) {
            let storage = appState?.terminalStorages[sessionId] ?? textView?.textStorage
            guard let textStorage = storage else { return }

            if decoders[sessionId] == nil {
                decoders[sessionId] = Utf8StreamDecoder()
            }
            guard let decoder = decoders[sessionId] else { return }

            let decodedString = decoder.decode(data)
            guard !decodedString.isEmpty else { return }

            let clean = cleanAnsi(decodedString)
            guard !clean.isEmpty else { return }

            let attr = NSAttributedString(
                string: clean,
                attributes: [
                    .font: NSFont.monospacedSystemFont(ofSize: 13.0, weight: .regular),
                    .foregroundColor: NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0)
                ]
            )
            textStorage.append(attr)
            textView?.setSelectedRange(NSRange(location: textStorage.length, length: 0))
            textView?.scrollToEndOfDocument(nil)
            textView?.needsDisplay = true
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
            
            return str
        }
    }
}

public class Utf8StreamDecoder {
    private var buffer = Data()

    public init() {}

    public func decode(_ data: Data) -> String {
        buffer.append(data)
        
        var validLen = buffer.count
        while validLen > 0 {
            let lastByte = buffer[validLen - 1]
            if (lastByte & 0x80) == 0 {
                break
            }
            var leadIdx = validLen - 1
            while leadIdx >= 0 && (buffer[leadIdx] & 0xC0) == 0x80 {
                leadIdx -= 1
            }
            if leadIdx >= 0 {
                let leadByte = buffer[leadIdx]
                let expectedLen: Int
                if (leadByte & 0xE0) == 0xC0 { expectedLen = 2 }
                else if (leadByte & 0xF0) == 0xE0 { expectedLen = 3 }
                else if (leadByte & 0xF8) == 0xF0 { expectedLen = 4 }
                else { expectedLen = 1 }

                let available = buffer.count - leadIdx
                if available < expectedLen {
                    validLen = leadIdx
                }
            }
            break
        }

        if validLen == 0 {
            return ""
        }

        let readyData = buffer.subdata(in: 0..<validLen)
        buffer.removeSubrange(0..<validLen)
        return String(decoding: readyData, as: UTF8.self)
    }
}

public class CustomTerminalTextView: NSTextView {
    public weak var appState: AppState?
    public var sessionId: String = ""
    public var tabId: String = ""

    private var cursorTimer: Timer?
    private var isCursorVisible: Bool = true

    public override var acceptsFirstResponder: Bool { true }

    public override func resignFirstResponder() -> Bool {
        cursorTimer?.invalidate()
        cursorTimer = nil
        self.needsDisplay = true
        return true
    }

    public override func becomeFirstResponder() -> Bool {
        let ok = super.becomeFirstResponder()
        if ok {
            startCursorBlinkTimer()
            self.needsDisplay = true
        }
        return ok
    }

    public override var shouldDrawInsertionPoint: Bool { true }

    public func startCursorBlinkTimer() {
        cursorTimer?.invalidate()
        isCursorVisible = true
        cursorTimer = Timer.scheduledTimer(withTimeInterval: 0.55, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.isCursorVisible.toggle()
            self.needsDisplay = true
        }
    }

    public override func drawInsertionPoint(in rect: NSRect, color: NSColor, turnedOn: Bool) {
        let isFocused = (self.window?.firstResponder === self)
        var blockRect = rect
        blockRect.size.width = max(rect.width * 2, 8.5)

        let cursorColor = NSColor(red: 56/255.0, green: 189/255.0, blue: 248/255.0, alpha: 0.95)

        if isFocused {
            if isCursorVisible {
                cursorColor.setFill()
                let path = NSBezierPath(roundedRect: blockRect, xRadius: 1, yRadius: 1)
                path.fill()
            }
        } else {
            // Unfocused hollow outline cursor (standard terminal style)
            cursorColor.setStroke()
            let path = NSBezierPath(roundedRect: blockRect, xRadius: 1, yRadius: 1)
            path.lineWidth = 1.0
            path.stroke()
        }
    }

    public override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        // Draw terminal cursor block at insertion position
        if self.selectedRange().length == 0, let layoutManager = self.layoutManager, let textContainer = self.textContainer {
            let totalLen = (self.string as NSString).length
            let charIndex = min(self.selectedRange().location, totalLen)
            
            var cursorRect: NSRect
            if totalLen == 0 {
                cursorRect = NSRect(x: 4, y: 4, width: 8.5, height: 16)
            } else if charIndex >= totalLen {
                let glyphIndex = layoutManager.glyphIndexForCharacter(at: max(0, totalLen - 1))
                let charRect = layoutManager.boundingRect(forGlyphRange: NSRange(location: glyphIndex, length: 1), in: textContainer)
                
                if (self.string as NSString).hasSuffix("\n") || (self.string as NSString).hasSuffix("\r") {
                    cursorRect = NSRect(x: 4, y: charRect.maxY, width: 8.5, height: charRect.height > 0 ? charRect.height : 16)
                } else {
                    cursorRect = NSRect(x: charRect.maxX, y: charRect.minY, width: 8.5, height: charRect.height > 0 ? charRect.height : 16)
                }
            } else {
                let glyphIndex = layoutManager.glyphIndexForCharacter(at: charIndex)
                let charRect = layoutManager.boundingRect(forGlyphRange: NSRange(location: glyphIndex, length: 1), in: textContainer)
                cursorRect = NSRect(x: charRect.minX, y: charRect.minY, width: 8.5, height: charRect.height > 0 ? charRect.height : 16)
            }

            drawInsertionPoint(in: cursorRect, color: self.insertionPointColor, turnedOn: isCursorVisible)
        }
    }

    public override func mouseDown(with event: NSEvent) {
        super.mouseDown(with: event)
        self.window?.makeFirstResponder(self)
        self.isCursorVisible = true
        self.needsDisplay = true
    }

    public override func performKeyEquivalent(with event: NSEvent) -> Bool {
        let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)

        // Command + V: Paste directly into terminal session
        if flags == .command && event.charactersIgnoringModifiers == "v" {
            paste(nil)
            return true
        }

        // Command + C: Copy selected terminal text to clipboard
        if flags == .command && event.charactersIgnoringModifiers == "c" {
            if self.selectedRange().length > 0 {
                copy(nil)
                appState?.addToast("info", "已複製所選終端文字")
                return true
            }
            return false
        }

        // Command + A: Select all terminal text
        if flags == .command && event.charactersIgnoringModifiers == "a" {
            self.selectAll(nil)
            return true
        }

        // Command + K: Toggle AI Agent Bar
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

    public override func keyDown(with event: NSEvent) {
        guard let window = self.window, window.firstResponder === self else {
            super.keyDown(with: event)
            return
        }

        let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)

        // If Command key is pressed (and not handled by performKeyEquivalent), let system handle it
        if flags.contains(.command) {
            super.keyDown(with: event)
            return
        }

        // Handle macOS Special Keys by keyCode
        switch event.keyCode {
        case 126: // Up Arrow
            if flags.contains(.option) {
                sendString("\u{001B}[1;3A")
            } else if flags.contains(.control) {
                sendString("\u{001B}[1;5A")
            } else {
                sendString("\u{001B}[A")
            }
            return
        case 125: // Down Arrow
            if flags.contains(.option) {
                sendString("\u{001B}[1;3B")
            } else if flags.contains(.control) {
                sendString("\u{001B}[1;5B")
            } else {
                sendString("\u{001B}[B")
            }
            return
        case 124: // Right Arrow
            if flags.contains(.option) { // macOS Option+Right (Word forward)
                sendString("\u{001B}f")
            } else if flags.contains(.control) {
                sendString("\u{001B}[1;5C")
            } else {
                sendString("\u{001B}[C")
            }
            return
        case 123: // Left Arrow
            if flags.contains(.option) { // macOS Option+Left (Word backward)
                sendString("\u{001B}b")
            } else if flags.contains(.control) {
                sendString("\u{001B}[1;5D")
            } else {
                sendString("\u{001B}[D")
            }
            return
        case 115: // Home
            sendString("\u{001B}[H")
            return
        case 119: // End
            sendString("\u{001B}[F")
            return
        case 116: // Page Up
            sendString("\u{001B}[5~")
            return
        case 121: // Page Down
            sendString("\u{001B}[6~")
            return
        case 117: // Forward Delete (fn + delete)
            sendString("\u{001B}[3~")
            return
        case 51: // Backspace (Delete key on macOS)
            if flags.contains(.option) {
                sendString("\u{0017}") // Ctrl+W (delete word backward)
            } else {
                sendString("\u{007F}")
            }
            return
        case 36, 76: // Enter / Return / Keypad Enter
            sendString("\r")
            return
        case 48: // Tab (Shell Autocompletion)
            if flags.contains(.shift) {
                sendString("\u{001B}[Z")
            } else {
                sendString("\t")
            }
            return
        case 53: // Escape
            sendString("\u{001B}")
            return
        default:
            break
        }

        // Handle Control + Character Key Combinations
        if flags.contains(.control), let unmod = event.charactersIgnoringModifiers?.lowercased().first {
            if let ascii = unmod.asciiValue, ascii >= 97 && ascii <= 122 { // 'a'...'z'
                let ctrlCode = UInt8(ascii - 96) // 1 for 'a', 3 for 'c' (SIGINT), 4 for 'd' (EOF), 26 for 'z' (SIGTSTP)
                let data = Data([ctrlCode])
                appState?.sendDataToSession(sessionId: sessionId, data: data)
                return
            }
        }

        // Normal Characters (including UTF-8 input, numbers, symbols)
        if let chars = event.characters, !chars.isEmpty {
            if let data = chars.data(using: .utf8) {
                appState?.sendDataToSession(sessionId: sessionId, data: data)
            }
        }
    }

    private func sendString(_ str: String) {
        if let data = str.data(using: .utf8) {
            appState?.sendDataToSession(sessionId: sessionId, data: data)
        }
    }

    public override func paste(_ sender: Any?) {
        if let text = NSPasteboard.general.string(forType: .string) {
            if let data = text.data(using: .utf8) {
                appState?.sendDataToSession(sessionId: sessionId, data: data)
            }
        }
    }

    public override func copy(_ sender: Any?) {
        let range = self.selectedRange()
        if range.length > 0 {
            let selectedText = (self.string as NSString).substring(with: range)
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(selectedText, forType: .string)
        }
    }

    public override func menu(for event: NSEvent) -> NSMenu? {
        let menu = NSMenu(title: "TerminalContext")

        let copyItem = NSMenuItem(title: "複製 (Copy)", action: #selector(contextCopy), keyEquivalent: "c")
        copyItem.target = self
        copyItem.isEnabled = self.selectedRange().length > 0
        menu.addItem(copyItem)

        let pasteItem = NSMenuItem(title: "貼上 (Paste)", action: #selector(contextPaste), keyEquivalent: "v")
        pasteItem.target = self
        menu.addItem(pasteItem)

        menu.addItem(NSMenuItem.separator())

        let clearItem = NSMenuItem(title: "清空螢幕 (Clear)", action: #selector(contextClear), keyEquivalent: "k")
        clearItem.target = self
        menu.addItem(clearItem)

        let aiItem = NSMenuItem(title: "呼叫 AI 智能體 (Cmd+K)", action: #selector(contextToggleAI), keyEquivalent: "k")
        aiItem.target = self
        menu.addItem(aiItem)

        menu.addItem(NSMenuItem.separator())

        let selectAllItem = NSMenuItem(title: "選擇全部 (Select All)", action: #selector(selectAll(_:)), keyEquivalent: "a")
        selectAllItem.target = self
        menu.addItem(selectAllItem)

        return menu
    }

    @objc private func contextCopy() {
        copy(nil)
    }

    @objc private func contextPaste() {
        paste(nil)
    }

    @objc private func contextClear() {
        if let storage = appState?.terminalStorages[sessionId] {
            storage.setAttributedString(NSAttributedString(string: ""))
        }
        sendString("\u{000C}") // Send Ctrl+L to remote shell
    }

    @objc private func contextToggleAI() {
        appState?.inlineAIAgentOpen.toggle()
    }
}
