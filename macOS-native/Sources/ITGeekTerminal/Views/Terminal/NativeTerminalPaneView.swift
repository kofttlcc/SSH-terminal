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
        let scrollView = NSScrollView()
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.autohidesScrollers = true
        scrollView.borderType = .noBorder
        scrollView.backgroundColor = NSColor(red: 9/255.0, green: 10/255.0, blue: 15/255.0, alpha: 1.0)

        let textView = CustomTerminalTextView()
        textView.appState = appState
        textView.sessionId = pane.sessionId ?? pane.paneId
        textView.backgroundColor = NSColor(red: 9/255.0, green: 10/255.0, blue: 15/255.0, alpha: 1.0)
        textView.textColor = NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0)
        textView.font = NSFont.monospacedSystemFont(ofSize: 13.0, weight: .regular)
        textView.isEditable = false
        textView.isSelectable = true
        textView.insertionPointColor = NSColor(red: 56/255.0, green: 189/255.0, blue: 248/255.0, alpha: 1.0)
        textView.autoresizingMask = [.width]
        textView.textContainer?.containerSize = NSSize(width: scrollView.contentSize.width, height: CGFloat.greatestFiniteMagnitude)
        textView.textContainer?.widthTracksTextView = true

        scrollView.documentView = textView
        context.coordinator.textView = textView

        context.coordinator.startSession(appState: appState, pane: pane)
        return scrollView
    }

    public func updateNSView(_ nsView: NSScrollView, context: Context) {
        if let textView = nsView.documentView as? CustomTerminalTextView {
            textView.appState = appState
            textView.sessionId = pane.sessionId ?? pane.paneId
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

        init(_ parent: NativeTerminalPaneView) {
            self.parent = parent
        }

        func startSession(appState: AppState, pane: TerminalPaneState) {
            let sid = pane.sessionId ?? pane.paneId

            if pane.isLocal {
                let pty = LocalPtySession(sessionId: sid)
                appState.localSessions[sid] = pty

                pty.onDataReceived = { [weak self] data in
                    self?.appendRawData(data)
                }

                _ = pty.start()
            } else if let host = pane.host {
                let ssh = SSHSession(sessionId: sid, host: host)
                appState.sshSessions[sid] = ssh

                ssh.onDataReceived = { [weak self] data in
                    self?.appendRawData(data)
                }

                ssh.onError = { [weak self] err in
                    self?.appendPlainText("\r\n[SSH 錯誤]: \(err)\r\n")
                }

                self.appendPlainText("正在建立原生 SSH 連線至 \(host.label) (\(host.hostname):\(host.port))...\r\n")
                _ = ssh.connect()
            }
        }

        func appendPlainText(_ text: String) {
            guard let textView = textView else { return }
            let attr = NSAttributedString(
                string: text,
                attributes: [
                    .font: NSFont.monospacedSystemFont(ofSize: 13.0, weight: .regular),
                    .foregroundColor: NSColor(red: 56/255.0, green: 189/255.0, blue: 248/255.0, alpha: 1.0)
                ]
            )
            textView.textStorage?.append(attr)
            textView.scrollToEndOfDocument(nil)
        }

        func appendRawData(_ data: Data) {
            guard let textView = textView else { return }
            if let string = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .ascii) {
                // Strip/clean ANSI escape sequences for text storage
                let clean = cleanAnsi(string)
                let attr = NSAttributedString(
                    string: clean,
                    attributes: [
                        .font: NSFont.monospacedSystemFont(ofSize: 13.0, weight: .regular),
                        .foregroundColor: NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0)
                    ]
                )
                textView.textStorage?.append(attr)
                textView.scrollToEndOfDocument(nil)
            }
        }

        private func cleanAnsi(_ text: String) -> String {
            // Regex to strip ANSI color and control codes for plain text rendering
            return text.replacingOccurrences(of: "\u{001B}\\[[0-9;]*[a-zA-Z]", with: "", options: .regularExpression)
        }
    }
}

public class CustomTerminalTextView: NSTextView {
    public weak var appState: AppState?
    public var sessionId: String = ""

    public override var acceptsFirstResponder: Bool { true }

    public override func keyDown(with event: NSEvent) {
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
