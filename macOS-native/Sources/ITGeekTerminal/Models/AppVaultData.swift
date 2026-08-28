import Foundation

public struct TerminalSettings: Codable, Hashable {
    public var theme: String
    public var fontFamily: String
    public var fontSize: Double
    public var lineHeight: Double
    public var letterSpacing: Double
    public var cursorStyle: String
    public var cursorBlink: Bool
    public var scrollback: Int
    public var copyOnSelect: Bool
    public var bellSound: Bool
    public var localShell: String
    public var touchIdEnabled: Bool
    public var touchIdForHosts: Bool
    public var aiConfig: AIModelConfig

    public init(
        theme: String = "itgeek",
        fontFamily: String = "JetBrains Mono, Menlo, Monaco, monospace",
        fontSize: Double = 13.5,
        lineHeight: Double = 1.25,
        letterSpacing: Double = 0.0,
        cursorStyle: String = "block",
        cursorBlink: Bool = true,
        scrollback: Int = 5000,
        copyOnSelect: Bool = true,
        bellSound: Bool = false,
        localShell: String = ProcessInfo.processInfo.environment["SHELL"] ?? "/bin/zsh",
        touchIdEnabled: Bool = false,
        touchIdForHosts: Bool = false,
        aiConfig: AIModelConfig = AIModelConfig()
    ) {
        self.theme = theme
        self.fontFamily = fontFamily
        self.fontSize = fontSize
        self.lineHeight = lineHeight
        self.letterSpacing = letterSpacing
        self.cursorStyle = cursorStyle
        self.cursorBlink = cursorBlink
        self.scrollback = scrollback
        self.copyOnSelect = copyOnSelect
        self.bellSound = bellSound
        self.localShell = localShell
        self.touchIdEnabled = touchIdEnabled
        self.touchIdForHosts = touchIdForHosts
        self.aiConfig = aiConfig
    }

    enum CodingKeys: String, CodingKey {
        case theme, fontFamily, fontSize, lineHeight, letterSpacing, cursorStyle, cursorBlink
        case scrollback, copyOnSelect, bellSound, localShell, touchIdEnabled, touchIdForHosts, aiConfig
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.theme = try container.decodeIfPresent(String.self, forKey: .theme) ?? "itgeek"
        self.fontFamily = try container.decodeIfPresent(String.self, forKey: .fontFamily) ?? "JetBrains Mono, Menlo, Monaco, monospace"
        self.fontSize = try container.decodeIfPresent(Double.self, forKey: .fontSize) ?? 13.5
        self.lineHeight = try container.decodeIfPresent(Double.self, forKey: .lineHeight) ?? 1.25
        self.letterSpacing = try container.decodeIfPresent(Double.self, forKey: .letterSpacing) ?? 0.0
        self.cursorStyle = try container.decodeIfPresent(String.self, forKey: .cursorStyle) ?? "block"
        self.cursorBlink = try container.decodeIfPresent(Bool.self, forKey: .cursorBlink) ?? true
        self.scrollback = try container.decodeIfPresent(Int.self, forKey: .scrollback) ?? 5000
        self.copyOnSelect = try container.decodeIfPresent(Bool.self, forKey: .copyOnSelect) ?? true
        self.bellSound = try container.decodeIfPresent(Bool.self, forKey: .bellSound) ?? false
        self.localShell = try container.decodeIfPresent(String.self, forKey: .localShell) ?? (ProcessInfo.processInfo.environment["SHELL"] ?? "/bin/zsh")
        self.touchIdEnabled = try container.decodeIfPresent(Bool.self, forKey: .touchIdEnabled) ?? false
        self.touchIdForHosts = try container.decodeIfPresent(Bool.self, forKey: .touchIdForHosts) ?? false
        self.aiConfig = try container.decodeIfPresent(AIModelConfig.self, forKey: .aiConfig) ?? AIModelConfig()
    }
}

public struct AppVaultData: Codable {
    public var version: String
    public var hosts: [HostItem]
    public var groups: [HostGroup]
    public var snippets: [Snippet]
    public var keys: [SSHKeyItem]
    public var settings: TerminalSettings

    public init(
        version: String = "1.0.0",
        hosts: [HostItem] = [],
        groups: [HostGroup] = [],
        snippets: [Snippet] = [],
        keys: [SSHKeyItem] = [],
        settings: TerminalSettings = TerminalSettings()
    ) {
        self.version = version
        self.hosts = hosts
        self.groups = groups
        self.snippets = snippets
        self.keys = keys
        self.settings = settings
    }

    enum CodingKeys: String, CodingKey {
        case version, hosts, groups, snippets, keys, settings
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        if let strVer = try? container.decodeIfPresent(String.self, forKey: .version) {
            self.version = strVer
        } else if let intVer = try? container.decodeIfPresent(Int.self, forKey: .version) {
            self.version = "\(intVer)"
        } else {
            self.version = "1.0.0"
        }

        self.hosts = try container.decodeIfPresent([HostItem].self, forKey: .hosts) ?? []
        self.groups = try container.decodeIfPresent([HostGroup].self, forKey: .groups) ?? []
        self.snippets = try container.decodeIfPresent([Snippet].self, forKey: .snippets) ?? []
        self.keys = try container.decodeIfPresent([SSHKeyItem].self, forKey: .keys) ?? []
        self.settings = try container.decodeIfPresent(TerminalSettings.self, forKey: .settings) ?? TerminalSettings()
    }
}
