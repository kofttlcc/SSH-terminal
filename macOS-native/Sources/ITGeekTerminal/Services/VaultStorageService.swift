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
        // 1. Try loading from native vault.json
        if fileManager.fileExists(atPath: vaultFileURL.path) {
            do {
                let data = try Data(contentsOf: vaultFileURL)
                let decoded = try JSONDecoder().decode(AppVaultData.self, from: data)
                if !decoded.hosts.isEmpty && !decoded.hosts.allSatisfy({ $0.id.hasPrefix("host-demo") }) {
                    return decoded
                }
            } catch {
                print("Failed to decode native vault.json: \(error)")
            }
        }

        // 2. Check and migrate from legacy Electron storage if available
        if let migrated = attemptLegacyMigration() {
            saveVault(migrated)
            return migrated
        }

        // 3. Return default seeded data
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

    public func attemptLegacyMigration() -> AppVaultData? {
        let urls = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)
        guard let base = urls.first else { return nil }

        let legacyPaths = [
            base.appendingPathComponent("itgeek-ssh").appendingPathComponent("vault_store.json"),
            base.appendingPathComponent("termius-ssh-terminal").appendingPathComponent("vault_store.json"),
            URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent(".itgeek-ssh").appendingPathComponent("vault_store.json")
        ]

        for legacyFile in legacyPaths {
            if fileManager.fileExists(atPath: legacyFile.path) {
                do {
                    let data = try Data(contentsOf: legacyFile)
                    let decoded = try JSONDecoder().decode(AppVaultData.self, from: data)
                    if !decoded.hosts.isEmpty {
                        print("Successfully migrated \(decoded.hosts.count) hosts from \(legacyFile.path)")
                        return decoded
                    }
                } catch {
                    print("Failed to decode legacy vault from \(legacyFile.path): \(error)")
                }
            }
        }

        return nil
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
            )
        ]

        return AppVaultData(
            version: "1.0.0",
            hosts: [],
            groups: groups,
            snippets: snippets,
            keys: [],
            settings: TerminalSettings()
        )
    }
}
