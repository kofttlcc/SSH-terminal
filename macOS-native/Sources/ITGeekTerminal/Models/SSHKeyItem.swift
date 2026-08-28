import Foundation

public struct SSHKeyItem: Identifiable, Codable, Hashable {
    public var id: String
    public var name: String
    public var type: String // "ed25519" or "rsa"
    public var privateKey: String
    public var publicKey: String
    public var passphrase: String?
    public var touchIdProtected: Bool?
    public var createdAt: Double

    public init(
        id: String = UUID().uuidString,
        name: String,
        type: String = "ed25519",
        privateKey: String,
        publicKey: String,
        passphrase: String? = nil,
        touchIdProtected: Bool? = false,
        createdAt: Double = Date().timeIntervalSince1970 * 1000
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.privateKey = privateKey
        self.publicKey = publicKey
        self.passphrase = passphrase
        self.touchIdProtected = touchIdProtected
        self.createdAt = createdAt
    }
}
