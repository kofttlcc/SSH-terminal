import Foundation

public struct SSHKeyItem: Identifiable, Codable, Hashable {
    public var id: String
    public var name: String
    public var type: String // "ed25519" or "rsa"
    public var privateKey: String
    public var publicKey: String
    public var passphrase: String?
    public var fingerprint: String?
    public var touchIdProtected: Bool?
    public var storageType: String?
    public var yubikeySlot: String?
    public var yubikeySerial: String?
    public var touchPolicy: String?
    public var createdAt: Double

    public init(
        id: String = UUID().uuidString,
        name: String,
        type: String = "ed25519",
        privateKey: String,
        publicKey: String,
        passphrase: String? = nil,
        fingerprint: String? = nil,
        touchIdProtected: Bool? = false,
        storageType: String? = nil,
        yubikeySlot: String? = nil,
        yubikeySerial: String? = nil,
        touchPolicy: String? = nil,
        createdAt: Double = Date().timeIntervalSince1970 * 1000
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.privateKey = privateKey
        self.publicKey = publicKey
        self.passphrase = passphrase
        self.fingerprint = fingerprint
        self.touchIdProtected = touchIdProtected
        self.storageType = storageType
        self.yubikeySlot = yubikeySlot
        self.yubikeySerial = yubikeySerial
        self.touchPolicy = touchPolicy
        self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case id, name, type, privateKey, publicKey, passphrase, fingerprint, touchIdProtected
        case storageType, yubikeySlot, yubikeySerial, touchPolicy, createdAt
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        self.name = try container.decodeIfPresent(String.self, forKey: .name) ?? "未命名密鑰"
        self.type = try container.decodeIfPresent(String.self, forKey: .type) ?? "ed25519"
        self.privateKey = try container.decodeIfPresent(String.self, forKey: .privateKey) ?? ""
        self.publicKey = try container.decodeIfPresent(String.self, forKey: .publicKey) ?? ""
        self.passphrase = try container.decodeIfPresent(String.self, forKey: .passphrase)
        self.fingerprint = try container.decodeIfPresent(String.self, forKey: .fingerprint)
        self.touchIdProtected = try container.decodeIfPresent(Bool.self, forKey: .touchIdProtected)
        self.storageType = try container.decodeIfPresent(String.self, forKey: .storageType)
        self.yubikeySlot = try container.decodeIfPresent(String.self, forKey: .yubikeySlot)
        self.yubikeySerial = try container.decodeIfPresent(String.self, forKey: .yubikeySerial)
        self.touchPolicy = try container.decodeIfPresent(String.self, forKey: .touchPolicy)

        if let doubleVal = try? container.decodeIfPresent(Double.self, forKey: .createdAt) {
            self.createdAt = doubleVal
        } else if let intVal = try? container.decodeIfPresent(Int.self, forKey: .createdAt) {
            self.createdAt = Double(intVal)
        } else {
            self.createdAt = Date().timeIntervalSince1970 * 1000
        }
    }
}
