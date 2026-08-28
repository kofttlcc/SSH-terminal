import Foundation

public enum HostAuthType: String, Codable, CaseIterable {
    case password = "password"
    case privateKey = "privateKey"
    case hybrid = "hybrid"
    case yubikey = "yubikey"
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
    public var group: String?
    public var tags: [String]?
    public var color: String?
    public var osType: String? // "ubuntu", "debian", "centos", "macos", "docker", "windows", "linux"
    public var protocolType: String? // "ssh" or "serial"
    public var serialPort: String?
    public var baudRate: Int?
    public var startupCommand: String?
    public var jumpHostId: String?
    public var requireTouchId: Bool?
    public var touchIdForKey: Bool?
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
        group: String? = nil,
        tags: [String]? = nil,
        color: String? = "#3b82f6",
        osType: String? = "linux",
        protocolType: String? = "ssh",
        serialPort: String? = nil,
        baudRate: Int? = 9600,
        startupCommand: String? = nil,
        jumpHostId: String? = nil,
        requireTouchId: Bool? = false,
        touchIdForKey: Bool? = false,
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
        self.group = group
        self.tags = tags
        self.color = color
        self.osType = osType
        self.protocolType = protocolType
        self.serialPort = serialPort
        self.baudRate = baudRate
        self.startupCommand = startupCommand
        self.jumpHostId = jumpHostId
        self.requireTouchId = requireTouchId
        self.touchIdForKey = touchIdForKey
        self.createdAt = createdAt
    }
}
