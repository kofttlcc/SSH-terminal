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

    // AI States & Autonomous Agent
    @Published public var isDrawerOpen: Bool = false
    @Published public var inlineAIAgentOpen: Bool = true
    @Published public var inlineAIAgentInput: String = ""
    @Published public var isAIAgentAutoRun: Bool = true
    @Published public var isAIAgentRunning: Bool = false
    @Published public var aiAgentStatusText: String = ""
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
    @Published public var keyModalOpen: Bool = false
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
    @Published public var editHostKeyId: String = ""
    @Published public var editHostGroup: String = "prod"
    @Published public var editHostOsType: String = "linux"
    @Published public var editHostRequireTouchId: Bool = false

    // Key Modal Form States
    @Published public var keyModalTab: String = "generate"
    @Published public var keyModalName: String = "lijt-touchid"
    @Published public var keyModalType: String = "ed25519"
    @Published public var keyModalComment: String = ""
    @Published public var keyModalPassphrase: String = ""
    @Published public var keyModalTouchIdProtected: Bool = true
    @Published public var keyModalApplyToAllHosts: Bool = false
    @Published public var keyModalIsGenerating: Bool = false
    @Published public var keyModalImportName: String = ""
    @Published public var keyModalImportPrivateKey: String = ""
    @Published public var keyModalImportPassphrase: String = ""
    @Published public var keyModalImportTouchIdProtected: Bool = true
    @Published public var keyModalNewlyCreatedKey: SSHKeyItem? = nil

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
        _ = self.createTab(title: host.label, type: "terminal", host: host, isLocal: false)
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

    public func resizeSession(sessionId: String, cols: UInt16, rows: UInt16) {
        localSessions[sessionId]?.resize(rows: rows, cols: cols)
        sshSessions[sessionId]?.resize(rows: rows, cols: cols)
    }

    public func updatePaneStatus(sessionId: String, status: String, errorMessage: String? = nil) {
        DispatchQueue.main.async {
            for tabIdx in 0..<self.tabs.count {
                for paneIdx in 0..<self.tabs[tabIdx].panes.count {
                    if self.tabs[tabIdx].panes[paneIdx].sessionId == sessionId || self.tabs[tabIdx].panes[paneIdx].paneId == sessionId {
                        self.tabs[tabIdx].panes[paneIdx].status = status
                        if let err = errorMessage {
                            self.tabs[tabIdx].panes[paneIdx].errorMessage = err
                        }
                    }
                }
            }
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
