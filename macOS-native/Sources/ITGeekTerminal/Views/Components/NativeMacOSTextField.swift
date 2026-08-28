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
        let textField = NSTextField()
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
        // Only update text programmatically if the user is NOT actively editing the field
        if nsView.currentEditor() == nil {
            if nsView.stringValue != text {
                nsView.stringValue = text
            }
        }
        if nsView.placeholderString != placeholder {
            nsView.placeholderString = placeholder
        }
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
