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
}
