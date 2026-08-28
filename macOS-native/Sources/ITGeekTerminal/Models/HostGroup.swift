import Foundation

public struct HostGroup: Identifiable, Codable, Hashable {
    public var id: String
    public var name: String
    public var color: String

    public init(id: String = UUID().uuidString, name: String, color: String = "#3b82f6") {
        self.id = id
        self.name = name
        self.color = color
    }
}
