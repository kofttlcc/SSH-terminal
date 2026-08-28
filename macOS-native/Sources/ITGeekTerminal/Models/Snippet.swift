import Foundation

public struct Snippet: Identifiable, Codable, Hashable {
    public var id: String
    public var title: String
    public var command: String
    public var tags: [String]
    public var description: String?
    public var variables: [String]?
    public var createdAt: Double

    public init(
        id: String = UUID().uuidString,
        title: String,
        command: String,
        tags: [String] = [],
        description: String? = nil,
        variables: [String]? = nil,
        createdAt: Double = Date().timeIntervalSince1970 * 1000
    ) {
        self.id = id
        self.title = title
        self.command = command
        self.tags = tags
        self.description = description
        self.variables = variables
        self.createdAt = createdAt
    }
}
