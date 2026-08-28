import Foundation
import SwiftUI
import Combine
import AppKit

@MainActor
public class AppState: ObservableObject {
    @Published public var vault: AppVaultData
    @Published public var activeView: String = "hosts"
    @Published public var tabs: [TerminalTab] = []
    @Published public var activeTabId: String? = nil

    // Terminal Keyboard Sync & Broadcast
    @Published public var isGlobalKeystrokeSync: Bool = false
    @Published public var syncTargetScope: String = "all" // "all", "current-tab", "current-pane"
    @Published public var composeBarOpen: Bool = false
    @Published public var composeCommand: String = ""

    // AI States
    @Published public var isDrawerOpen: Bool = false
    @Published public var inlineAssistOpen: Bool = false
    @Published public var aiSessions: [AIChatSession] = []
    @Published public var activeAISessionId: String? = nil
    @Published public var isAIStreaming: Bool = false
    @Published public var pendingDangerousCommand: ExtractedCommand? = nil

    // Active PTY & SSH Session objects & text buffer map
    public var localSessions: [String: LocalPtySession] = [:]
    public var sshSessions: [String: SSHSession] = [:]
    public var terminalStorages: [String: NSTextStorage] = [:]

    // UI Overlays & Modals
    @Published public var quickConnectOpen: Bool = false
    @Published public var hostEditModalOpen: Bool = false
    @Published public var editingHost: HostItem? = nil
    @Published public var toasts: [ToastItem] = []
    @Published public var yubikeyTouchPrompt: YubiKeyTouchPromptData? = nil

    // View UI States (ObservableObject-backed)
    @Published public var aiDrawerInput: String = ""
    @Published public var hostSearchText: String = ""
    @Published public var hostSelectedGroup: String = "all"
    @Published public var quickConnectString: String = ""
    @Published public var quickConnectPassword: String = ""
    @Published public var snippetSearchText: String = ""
    @Published public var settingsSelectedTab: String = "ai"

    // Host Edit Form States
    @Published public var editHostLabel: String = ""
    @Published public var editHostHostname: String = ""
    @Published public var editHostPort: String = "22"
    @Published public var editHostUsername: String = "root"
    @Published public var editHostPassword: String = ""
    @Published public var editHostGroup: String = "prod"
    @Published public var editHostOsType: String = "linux"
    @Published public var editHostRequireTouchId: Bool = false

    public struct ToastItem: Identifiable, Equatable {
        public let id: String = UUID().uuidString
        public let type: String // "success", "error", "warning", "info"
        public let message: String
    }

    public init() {
        self.vault = VaultStorageService.shared.loadVault()
    }

    public func addToast(_ type: String, _ message: String) {
        let toast = ToastItem(type: type, message: message)
        self.toasts.append(toast)
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if let idx = self.toasts.firstIndex(of: toast) {
                self.toasts.remove(at: idx)
            }
        }
    }

    public func saveVault() {
        VaultStorageService.shared.saveVault(self.vault)
    }

    // MARK: - Tab & Pane Management
    public func createTab(title: String, type: String = "terminal", host: HostItem? = nil, isLocal: Bool = false) -> String {
        let tabId = "tab-\(UUID().uuidString)"
        let paneId = "pane-\(UUID().uuidString)"

        let pane = TerminalPaneState(
            paneId: paneId,
            title: host?.label ?? (isLocal ? "本地 macOS Shell" : title),
            hostId: host?.id,
            host: host,
            sessionId: paneId,
            isLocal: isLocal,
            status: "connecting"
        )

        let newTab = TerminalTab(
            id: tabId,
            title: title,
            type: type,
            hostId: host?.id,
            splitMode: .single,
            panes: [pane],
            activePaneId: paneId,
            broadcast: false
        )

        self.tabs.append(newTab)
        self.activeTabId = tabId
        self.activeView = "terminal"
        return tabId
    }

    public func closeTab(tabId: String) {
        if let tab = tabs.first(where: { $0.id == tabId }) {
            for pane in tab.panes {
                if let sid = pane.sessionId {
                    localSessions[sid]?.terminate()
                    localSessions.removeValue(forKey: sid)
                    sshSessions[sid]?.closeSession()
                    sshSessions.removeValue(forKey: sid)
                    terminalStorages.removeValue(forKey: sid)
                }
            }
        }

        self.tabs.removeAll(where: { $0.id == tabId })
        if activeTabId == tabId {
            self.activeTabId = self.tabs.last?.id
            if self.tabs.isEmpty {
                self.activeView = "hosts"
            }
        }
    }

    public func openHostTerminal(host: HostItem) {
        let targetKeyId = host.yubikeyKeyId ?? host.keyId ?? host.fallbackKeyId
        let targetKey = vault.keys.first(where: { $0.id == targetKeyId })

        let isYubiKeyAuth = (host.authType == .yubikey) ||
                            (host.authType == .hybrid) ||
                            (host.yubikeyKeyId != nil) ||
                            (targetKey?.storageType == "yubikey_fido2") ||
                            (targetKey?.storageType == "yubikey_piv")

        let needsTouchId = (host.requireTouchId == true) ||
                           (vault.settings.touchIdForHosts == true) ||
                           (host.touchIdForKey == true) ||
                           (targetKey?.touchIdProtected == true)

        let proceedConnection: () -> Void = { [weak self] in
            guard let self = self else { return }
            if needsTouchId {
                Task {
                    let keyName = targetKey?.name ?? host.label
                    let res = await BiometricsService.shared.promptTouchID(
                        reason: "正在調用「\(keyName)」私鑰認證主機「\(host.label)」，請驗證 Touch ID 指紋"
                    )
                    if !res.success {
                        self.addToast("warning", "Touch ID 指紋識別未通過或已取消，連線已終止")
                        return
                    }
                    _ = self.createTab(title: host.label, type: "terminal", host: host, isLocal: false)
                }
            } else {
                _ = self.createTab(title: host.label, type: "terminal", host: host, isLocal: false)
            }
        }

        if isYubiKeyAuth {
            let devs = YubikeyService.shared.listDevices()
            let serial = devs.first?.serial ?? targetKey?.yubikeySerial ?? "YK-17891328"
            let keyDisplayName = targetKey?.name ?? "YubiKey 5 FIDO2/PIV"

            self.yubikeyTouchPrompt = YubiKeyTouchPromptData(
                hostLabel: host.label,
                keyName: keyDisplayName,
                serial: serial,
                onConfirm: {
                    proceedConnection()
                },
                onCancel: { [weak self] in
                    self?.addToast("info", "已取消 YubiKey 認證連線")
                }
            )
        } else {
            proceedConnection()
        }
    }

    public func openLocalTerminal() {
        _ = self.createTab(title: "本地 macOS Shell", type: "terminal", host: nil, isLocal: true)
    }

    // MARK: - Keystroke Dispatcher
    public func sendDataToSession(sessionId: String, data: Data) {
        if isGlobalKeystrokeSync {
            for (_, pty) in localSessions {
                pty.writeData(data)
            }
            for (_, ssh) in sshSessions {
                ssh.writeData(data)
            }
            return
        }

        if let pty = localSessions[sessionId] {
            pty.writeData(data)
        } else if let ssh = sshSessions[sessionId] {
            ssh.writeData(data)
        }
    }

    public func sendCommandToTerminal(command: String, sessionId: String? = nil, bypassWarning: Bool = false) {
        guard !command.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        if !bypassWarning && vault.settings.aiConfig.dangerousCommandWarning {
            let eval = AIService.shared.evaluateCommandRisk(command)
            if eval.riskLevel == "danger" {
                self.pendingDangerousCommand = ExtractedCommand(command: command, riskLevel: eval.riskLevel, riskReason: eval.reason)
                return
            }
        }

        let payload = command.hasSuffix("\n") || command.hasSuffix("\r") ? command : command + "\r"
        guard let data = payload.data(using: .utf8) else { return }

        if let sid = sessionId {
            sendDataToSession(sessionId: sid, data: data)
        } else if let activeTab = tabs.first(where: { $0.id == activeTabId }),
                  let activePane = activeTab.panes.first(where: { $0.paneId == activeTab.activePaneId }) ?? activeTab.panes.first,
                  let sid = activePane.sessionId {
            sendDataToSession(sessionId: sid, data: data)
        }

        addToast("success", "已在終端發送並執行指令")
    }
}
