import Foundation

public enum HostAuthType: String, Codable, CaseIterable {
    case password = "password"
    case privateKey = "privateKey"
    case hybrid = "hybrid"
    case yubikey = "yubikey"
    case agent = "agent"
}

public struct HostItem: Identifiable, Codable, Hashable {
    public var id: String
    public var label: String
    public var hostname: String
    public var port: Int
    public var username: String
    public var authType: HostAuthType
    public var password: String?
    public var privateKey: String?
    public var passphrase: String?
    public var keyId: String?
    public var fallbackKeyId: String?
    public var yubikeyKeyId: String?
    public var hybridPreferred: String?
    public var agentForward: Bool?
    public var group: String?
    public var tags: [String]?
    public var color: String?
    public var osType: String?
    public var protocolType: String?
    public var `protocol`: String?
    public var serialPort: String?
    public var baudRate: Int?
    public var startupCommand: String?
    public var jumpHostId: String?
    public var requireTouchId: Bool?
    public var touchIdForKey: Bool?
    public var notes: String?
    public var createdAt: Double

    public init(
        id: String = UUID().uuidString,
        label: String,
        hostname: String,
        port: Int = 22,
        username: String = "root",
        authType: HostAuthType = .password,
        password: String? = nil,
        privateKey: String? = nil,
        passphrase: String? = nil,
        keyId: String? = nil,
        fallbackKeyId: String? = nil,
        yubikeyKeyId: String? = nil,
        hybridPreferred: String? = nil,
        agentForward: Bool? = nil,
        group: String? = nil,
        tags: [String]? = nil,
        color: String? = "#3b82f6",
        osType: String? = "linux",
        protocolType: String? = "ssh",
        `protocol`: String? = "ssh",
        serialPort: String? = nil,
        baudRate: Int? = 9600,
        startupCommand: String? = nil,
        jumpHostId: String? = nil,
        requireTouchId: Bool? = false,
        touchIdForKey: Bool? = false,
        notes: String? = nil,
        createdAt: Double = Date().timeIntervalSince1970 * 1000
    ) {
        self.id = id
        self.label = label
        self.hostname = hostname
        self.port = port
        self.username = username
        self.authType = authType
        self.password = password
        self.privateKey = privateKey
        self.passphrase = passphrase
        self.keyId = keyId
        self.fallbackKeyId = fallbackKeyId
        self.yubikeyKeyId = yubikeyKeyId
        self.hybridPreferred = hybridPreferred
        self.agentForward = agentForward
        self.group = group
        self.tags = tags
        self.color = color
        self.osType = osType
        self.protocolType = protocolType
        self.protocol = `protocol`
        self.serialPort = serialPort
        self.baudRate = baudRate
        self.startupCommand = startupCommand
        self.jumpHostId = jumpHostId
        self.requireTouchId = requireTouchId
        self.touchIdForKey = touchIdForKey
        self.notes = notes
        self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case id, label, hostname, port, username, authType, password, privateKey, passphrase
        case keyId, fallbackKeyId, yubikeyKeyId, hybridPreferred, agentForward
        case group, tags, color, osType, protocolType, `protocol`, serialPort, baudRate
        case startupCommand, jumpHostId, requireTouchId, touchIdForKey, notes, createdAt
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        self.label = try container.decodeIfPresent(String.self, forKey: .label) ?? "未命名主機"
        self.hostname = try container.decodeIfPresent(String.self, forKey: .hostname) ?? "127.0.0.1"
        self.port = try container.decodeIfPresent(Int.self, forKey: .port) ?? 22
        self.username = try container.decodeIfPresent(String.self, forKey: .username) ?? "root"

        if let rawAuth = try? container.decodeIfPresent(String.self, forKey: .authType),
           let authEnum = HostAuthType(rawValue: rawAuth) {
            self.authType = authEnum
        } else {
            self.authType = .password
        }

        self.password = try container.decodeIfPresent(String.self, forKey: .password)
        self.privateKey = try container.decodeIfPresent(String.self, forKey: .privateKey)
        self.passphrase = try container.decodeIfPresent(String.self, forKey: .passphrase)
        self.keyId = try container.decodeIfPresent(String.self, forKey: .keyId)
        self.fallbackKeyId = try container.decodeIfPresent(String.self, forKey: .fallbackKeyId)
        self.yubikeyKeyId = try container.decodeIfPresent(String.self, forKey: .yubikeyKeyId)
        self.hybridPreferred = try container.decodeIfPresent(String.self, forKey: .hybridPreferred)
        self.agentForward = try container.decodeIfPresent(Bool.self, forKey: .agentForward)
        self.group = try container.decodeIfPresent(String.self, forKey: .group)
        self.tags = try container.decodeIfPresent([String].self, forKey: .tags)
        self.color = try container.decodeIfPresent(String.self, forKey: .color)
        self.osType = try container.decodeIfPresent(String.self, forKey: .osType)
        self.protocolType = try container.decodeIfPresent(String.self, forKey: .protocolType)
        self.protocol = try container.decodeIfPresent(String.self, forKey: .protocol)
        self.serialPort = try container.decodeIfPresent(String.self, forKey: .serialPort)
        self.baudRate = try container.decodeIfPresent(Int.self, forKey: .baudRate)
        self.startupCommand = try container.decodeIfPresent(String.self, forKey: .startupCommand)
        self.jumpHostId = try container.decodeIfPresent(String.self, forKey: .jumpHostId)
        self.requireTouchId = try container.decodeIfPresent(Bool.self, forKey: .requireTouchId)
        self.touchIdForKey = try container.decodeIfPresent(Bool.self, forKey: .touchIdForKey)
        self.notes = try container.decodeIfPresent(String.self, forKey: .notes)

        if let doubleVal = try? container.decodeIfPresent(Double.self, forKey: .createdAt) {
            self.createdAt = doubleVal
        } else if let intVal = try? container.decodeIfPresent(Int.self, forKey: .createdAt) {
            self.createdAt = Double(intVal)
        } else {
            self.createdAt = Date().timeIntervalSince1970 * 1000
        }
    }
}
