import SwiftUI
import AppKit

public struct NativeResizeDividerView: NSViewRepresentable {
    @ObservedObject var appState: AppState
    var minHeight: CGFloat = 160
    var maxHeight: CGFloat = 850

    public init(appState: AppState, minHeight: CGFloat = 160, maxHeight: CGFloat = 850) {
        self.appState = appState
        self.minHeight = minHeight
        self.maxHeight = maxHeight
    }

    public func makeNSView(context: Context) -> ResizeDividerNSView {
        let view = ResizeDividerNSView()
        view.appState = appState
        view.minHeight = minHeight
        view.maxHeight = maxHeight
        return view
    }

    public func updateNSView(_ nsView: ResizeDividerNSView, context: Context) {
        nsView.appState = appState
        nsView.minHeight = minHeight
        nsView.maxHeight = maxHeight
    }
}

public class ResizeDividerNSView: NSView {
    public weak var appState: AppState?
    public var minHeight: CGFloat = 160
    public var maxHeight: CGFloat = 850

    private var startDragMouseY: CGFloat = 0
    private var startDragHeight: CGFloat = 0
    private var isDragging: Bool = false
    private var isHovered: Bool = false
    private var trackingAreaRef: NSTrackingArea?

    override public init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = NSColor(red: 15/255, green: 17/255, blue: 26/255, alpha: 1.0).cgColor
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override public func updateTrackingAreas() {
        super.updateTrackingAreas()
        if let existing = trackingAreaRef {
            removeTrackingArea(existing)
        }
        let trackingArea = NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways, .cursorUpdate],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(trackingArea)
        self.trackingAreaRef = trackingArea
    }

    override public func cursorUpdate(with event: NSEvent) {
        NSCursor.resizeUpDown.set()
    }

    override public func mouseEntered(with event: NSEvent) {
        isHovered = true
        needsDisplay = true
    }

    override public func mouseExited(with event: NSEvent) {
        if !isDragging {
            isHovered = false
            needsDisplay = true
        }
    }

    override public func mouseDown(with event: NSEvent) {
        guard let window = self.window, let state = appState else { return }
        isDragging = true
        isHovered = true
        startDragMouseY = window.mouseLocationOutsideOfEventStream.y
        startDragHeight = state.inlineAgentPanelHeight
        needsDisplay = true
    }

    override public func mouseDragged(with event: NSEvent) {
        guard isDragging, let window = self.window, let state = appState else { return }
        let currentMouseY = window.mouseLocationOutsideOfEventStream.y
        // In macOS window coordinates, Y increases from bottom to top.
        // Dragging DOWN reduces window.mouseLocation.y, which means panel height should INCREASE.
        let deltaY = startDragMouseY - currentMouseY
        let newHeight = max(minHeight, min(maxHeight, startDragHeight + deltaY))

        DispatchQueue.main.async {
            state.inlineAgentPanelHeight = newHeight
            state.inlineAgentInitialDragHeight = newHeight
        }
    }

    override public func mouseUp(with event: NSEvent) {
        isDragging = false
        isHovered = false
        needsDisplay = true
    }

    override public func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        // Draw Divider background
        let bgColor = isHovered ? NSColor(calibratedRed: 147/255, green: 51/255, blue: 234/255, alpha: 0.2) : NSColor(calibratedRed: 18/255, green: 20/255, blue: 28/255, alpha: 1.0)
        bgColor.setFill()
        dirtyRect.fill()

        // Draw Centered Grip Pill Handle
        let pillWidth: CGFloat = 46
        let pillHeight: CGFloat = 3.5
        let pillRect = NSRect(
            x: (bounds.width - pillWidth) / 2,
            y: (bounds.height - pillHeight) / 2,
            width: pillWidth,
            height: pillHeight
        )
        let pillPath = NSBezierPath(roundedRect: pillRect, xRadius: 2, yRadius: 2)
        let pillColor = isHovered ? NSColor(calibratedRed: 168/255, green: 85/255, blue: 247/255, alpha: 0.9) : NSColor(calibratedWhite: 0.4, alpha: 0.6)
        pillColor.setFill()
        pillPath.fill()
    }
}
