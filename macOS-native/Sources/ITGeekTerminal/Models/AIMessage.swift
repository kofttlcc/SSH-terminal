import Foundation

public struct ExtractedCommand: Identifiable, Codable, Hashable {
    public var id: String = UUID().uuidString
    public var command: String
    public var riskLevel: String // "safe", "caution", "danger"
    public var riskReason: String?

    public init(command: String, riskLevel: String = "safe", riskReason: String? = nil) {
        self.command = command
        self.riskLevel = riskLevel
        self.riskReason = riskReason
    }
}

public struct AIMessage: Identifiable, Codable, Hashable {
    public var id: String
    public var role: String // "user" or "assistant"
    public var content: String
    public var reasoningContent: String?
    public var commands: [ExtractedCommand]?
    public var timestamp: Double

    public init(
        id: String = UUID().uuidString,
        role: String,
        content: String,
        reasoningContent: String? = nil,
        commands: [ExtractedCommand]? = nil,
        timestamp: Double = Date().timeIntervalSince1970 * 1000
    ) {
        self.id = id
        self.role = role
        self.content = content
        self.reasoningContent = reasoningContent
        self.commands = commands
        self.timestamp = timestamp
    }
}

public struct AIChatSession: Identifiable, Codable, Hashable {
    public var id: String
    public var title: String
    public var hostId: String?
    public var messages: [AIMessage]
    public var createdAt: Double
    public var updatedAt: Double

    public init(
        id: String = UUID().uuidString,
        title: String = "新對話",
        hostId: String? = nil,
        messages: [AIMessage] = [],
        createdAt: Double = Date().timeIntervalSince1970 * 1000,
        updatedAt: Double = Date().timeIntervalSince1970 * 1000
    ) {
        self.id = id
        self.title = title
        self.hostId = hostId
        self.messages = messages
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
