import SwiftUI
import AppKit

public struct NativeMacOSTextField: NSViewRepresentable {
    @Binding var text: String
    var placeholder: String
    var fontSize: CGFloat = 12
    var isMonospaced: Bool = false
    var onSubmit: (() -> Void)?

    public init(
        text: Binding<String>,
        placeholder: String,
        fontSize: CGFloat = 12,
        isMonospaced: Bool = false,
        onSubmit: (() -> Void)? = nil
    ) {
        self._text = text
        self.placeholder = placeholder
        self.fontSize = fontSize
        self.isMonospaced = isMonospaced
        self.onSubmit = onSubmit
    }

    public func makeNSView(context: Context) -> NSTextField {
        let textField = CustomNSTextField()
        textField.delegate = context.coordinator
        textField.placeholderString = placeholder
        textField.isBordered = false
        textField.drawsBackground = false
        textField.textColor = NSColor.white
        textField.focusRingType = .none
        textField.font = isMonospaced ? NSFont.monospacedSystemFont(ofSize: fontSize, weight: .regular) : NSFont.systemFont(ofSize: fontSize)
        textField.stringValue = text
        textField.target = context.coordinator
        textField.action = #selector(Coordinator.onEnterPressed(_:))
        return textField
    }

    public func updateNSView(_ nsView: NSTextField, context: Context) {
        if nsView.stringValue != text {
            nsView.stringValue = text
        }
        nsView.placeholderString = placeholder
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    public class Coordinator: NSObject, NSTextFieldDelegate {
        var parent: NativeMacOSTextField

        init(_ parent: NativeMacOSTextField) {
            self.parent = parent
        }

        public func controlTextDidChange(_ obj: Notification) {
            if let tf = obj.object as? NSTextField {
                self.parent.text = tf.stringValue
            }
        }

        @objc func onEnterPressed(_ sender: NSTextField) {
            self.parent.text = sender.stringValue
            self.parent.onSubmit?()
        }
    }
}

public class CustomNSTextField: NSTextField {
    public override var acceptsFirstResponder: Bool { true }

    public override func becomeFirstResponder() -> Bool {
        let result = super.becomeFirstResponder()
        if result {
            // Select all or place cursor at end
            self.currentEditor()?.selectedRange = NSRange(location: self.stringValue.count, length: 0)
        }
        return result
    }
}
