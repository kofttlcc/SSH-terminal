import Foundation

public class VaultStorageService {
    public static let shared = VaultStorageService()

    private let fileManager = FileManager.default
    private let appSupportDir: URL
    private let vaultFileURL: URL

    private init() {
        let urls = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)
        let base = urls.first ?? URL(fileURLWithPath: NSTemporaryDirectory())
        appSupportDir = base.appendingPathComponent("ITGeekTerminal", isDirectory: true)
        vaultFileURL = appSupportDir.appendingPathComponent("vault.json")

        try? fileManager.createDirectory(at: appSupportDir, withIntermediateDirectories: true)
    }

    public func loadVault() -> AppVaultData {
        if fileManager.fileExists(atPath: vaultFileURL.path) {
            do {
                let data = try Data(contentsOf: vaultFileURL)
                let decoded = try JSONDecoder().decode(AppVaultData.self, from: data)
                return decoded
            } catch {
                print("Failed to decode vault.json: \(error)")
            }
        }

        // Return default seeded data
        let defaultData = createDefaultVault()
        saveVault(defaultData)
        return defaultData
    }

    public func saveVault(_ vault: AppVaultData) {
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let data = try encoder.encode(vault)
            try data.write(to: vaultFileURL, options: .atomic)
        } catch {
            print("Failed to save vault: \(error)")
        }
    }

    private func createDefaultVault() -> AppVaultData {
        let groups = [
            HostGroup(id: "prod", name: "生產環境", color: "#ef4444"),
            HostGroup(id: "staging", name: "預發環境", color: "#f59e0b"),
            HostGroup(id: "dev", name: "開發測試", color: "#10b981"),
            HostGroup(id: "infra", name: "雲端基礎設施", color: "#3b82f6")
        ]

        let snippets = [
            Snippet(
                id: "snip-docker-ps",
                title: "Docker 活躍容器清單",
                command: "docker ps --format \"table {{.ID}}\\t{{.Image}}\\t{{.Status}}\\t{{.Names}}\"",
                tags: ["Docker", "監控"],
                description: "以格式化列格檢視正在運行的 Docker 容器"
            ),
            Snippet(
                id: "snip-sys-info",
                title: "系統資源快速診斷",
                command: "uptime && free -h 2>/dev/null || top -l 1 | head -n 10 && df -h",
                tags: ["系統", "Linux", "診斷"],
                description: "一鍵檢查伺服器負載、記憶體與磁碟空間"
            ),
            Snippet(
                id: "snip-find-port",
                title: "查詢端口佔用進程",
                command: "sudo lsof -i :{{port}} || sudo netstat -tlpn | grep :{{port}}",
                tags: ["網路", "除錯"],
                description: "檢查指定端口由哪個進程佔用",
                variables: ["port"]
            )
        ]

        let hosts = [
            HostItem(
                id: "host-demo-1",
                label: "AWS EC2 核心應用節點",
                hostname: "13.230.142.88",
                port: 22,
                username: "ubuntu",
                authType: .password,
                group: "prod",
                color: "#ef4444",
                osType: "ubuntu"
            ),
            HostItem(
                id: "host-demo-2",
                label: "Aliyun 開發測試伺服器",
                hostname: "47.96.23.112",
                port: 22,
                username: "root",
                authType: .password,
                group: "dev",
                color: "#10b981",
                osType: "centos"
            )
        ]

        return AppVaultData(
            version: "1.0.0",
            hosts: hosts,
            groups: groups,
            snippets: snippets,
            keys: [],
            settings: TerminalSettings()
        )
    }
}
