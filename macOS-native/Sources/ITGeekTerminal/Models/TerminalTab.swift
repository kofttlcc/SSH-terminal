import Foundation

public enum SplitMode: String, Codable, CaseIterable {
    case single = "single"
    case splitHorizontal = "split-horizontal"
    case splitVertical = "split-vertical"
    case grid2x2 = "grid-2x2"
}

public struct TerminalPaneState: Identifiable, Codable, Hashable {
    public var id: String { paneId }
    public var paneId: String
    public var title: String
    public var hostId: String?
    public var host: HostItem?
    public var sessionId: String?
    public var isLocal: Bool
    public var status: String // "idle", "connecting", "connected", "disconnected", "error"
    public var ping: Int?
    public var errorMessage: String?

    public init(
        paneId: String = UUID().uuidString,
        title: String = "Terminal",
        hostId: String? = nil,
        host: HostItem? = nil,
        sessionId: String? = nil,
        isLocal: Bool = false,
        status: String = "idle",
        ping: Int? = nil,
        errorMessage: String? = nil
    ) {
        self.paneId = paneId
        self.title = title
        self.hostId = hostId
        self.host = host
        self.sessionId = sessionId
        self.isLocal = isLocal
        self.status = status
        self.ping = ping
        self.errorMessage = errorMessage
    }
}

public struct TerminalTab: Identifiable, Codable, Hashable {
    public var id: String
    public var title: String
    public var type: String // "terminal" or "sftp"
    public var hostId: String?
    public var splitMode: SplitMode
    public var panes: [TerminalPaneState]
    public var activePaneId: String
    public var broadcast: Bool

    public init(
        id: String = UUID().uuidString,
        title: String = "Terminal",
        type: String = "terminal",
        hostId: String? = nil,
        splitMode: SplitMode = .single,
        panes: [TerminalPaneState] = [],
        activePaneId: String = "",
        broadcast: Bool = false
    ) {
        self.id = id
        self.title = title
        self.type = type
        self.hostId = hostId
        self.splitMode = splitMode
        self.panes = panes
        self.activePaneId = activePaneId
        self.broadcast = broadcast
    }
}
