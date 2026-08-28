import SwiftUI

public struct InlineTerminalAIAgentBarView: View {
    @ObservedObject var appState: AppState
    let tabId: String
    let sessionId: String
    let host: HostItem?

    public var body: some View {
        VStack(spacing: 8) {
            // Main Input & Controls Row
            HStack(spacing: 8) {
                // AI Agent Badge
                HStack(spacing: 4) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)
                        .font(.system(size: 13, weight: .bold))
                    Text("AI Agent")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.purple)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color.purple.opacity(0.15))
                .cornerRadius(6)

                // Natural Language Command Input
                NativeMacOSTextField(
                    text: $appState.inlineAIAgentInput,
                    placeholder: "輸入指令或運維需求（例：排查 80 端口佔用並重啟、查看記憶體並清理暫存）...",
                    fontSize: 12,
                    isMonospaced: false,
                    onSubmit: {
                        executeAgentCommand()
                    }
                )
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(6)

                // Auto-Run Mode Toggle Pill
                Button(action: {
                    appState.isAIAgentAutoRun.toggle()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: appState.isAIAgentAutoRun ? "bolt.fill" : "hand.raised.fill")
                            .foregroundColor(appState.isAIAgentAutoRun ? .green : .orange)
                            .font(.system(size: 10))
                        Text(appState.isAIAgentAutoRun ? "自動直連執行" : "確認後執行")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(appState.isAIAgentAutoRun ? .green : .orange)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(appState.isAIAgentAutoRun ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
                .help("切換是否由 AI 直接在遠端終端中自動執行命令")

                // Execute Button
                Button(action: executeAgentCommand) {
                    HStack(spacing: 4) {
                        if appState.isAIAgentRunning {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Image(systemName: "paperplane.fill")
                            Text("發送執行")
                        }
                    }
                    .font(.system(size: 11, weight: .bold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(LinearGradient(colors: [Color.purple, Color.blue], startPoint: .leading, endPoint: .trailing))
                    .foregroundColor(.white)
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
                .disabled(appState.isAIAgentRunning || appState.inlineAIAgentInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }

            // Quick Operations Pills Row
            HStack(spacing: 6) {
                Text("快速操作:")
                    .font(.system(size: 10))
                    .foregroundColor(.gray)

                QuickAgentPill(title: "🔍 診斷伺服器負載") {
                    appState.inlineAIAgentInput = "快速檢查目前伺服器的 CPU、記憶體、負載與磁碟空間"
                    executeAgentCommand()
                }

                QuickAgentPill(title: "🧹 清理系統暫存") {
                    appState.inlineAIAgentInput = "安全清理系統 /tmp 暫存檔案與快取以釋放磁碟"
                    executeAgentCommand()
                }

                QuickAgentPill(title: "🐳 檢查 Docker 容器") {
                    appState.inlineAIAgentInput = "檢視正在運行的 Docker 容器與異常重啟狀態"
                    executeAgentCommand()
                }

                QuickAgentPill(title: "🌐 排查網路與端口") {
                    appState.inlineAIAgentInput = "檢查當前伺服器監聽的所有網路端口與連線狀態"
                    executeAgentCommand()
                }

                Spacer()

                if !appState.aiAgentStatusText.isEmpty {
                    Text(appState.aiAgentStatusText)
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(.yellow)
                        .lineLimit(1)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
        .overlay(Rectangle().frame(height: 1).foregroundColor(Color.purple.opacity(0.25)), alignment: .bottom)
    }

    private func executeAgentCommand() {
        let input = appState.inlineAIAgentInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !input.isEmpty, !appState.isAIAgentRunning else { return }

        appState.inlineAIAgentInput = ""
        appState.isAIAgentRunning = true
        appState.aiAgentStatusText = "🧠 AI 正在分析目標主機與終端日誌..."

        let termContext = appState.terminalStorages[sessionId]?.string.suffix(3000).description

        Task {
            do {
                let userMsg = AIMessage(role: "user", content: input)
                var responseFull = ""

                _ = try await AIService.shared.streamChat(
                    config: appState.vault.settings.aiConfig,
                    messages: [userMsg],
                    host: host,
                    isLocal: host == nil,
                    terminalContext: termContext
                ) { chunk, _ in
                    responseFull += chunk
                }

                // Extract shell commands from markdown code blocks
                let commands = extractCommands(from: responseFull)

                await MainActor.run {
                    appState.isAIAgentRunning = false

                    if commands.isEmpty {
                        appState.aiAgentStatusText = "ℹ️ AI 分析完成（未提取到直接執行命令）"
                        // Output AI explanation directly to terminal!
                        let cleanExplanation = responseFull.replacingOccurrences(of: "\n", with: "\r\n")
                        appState.sendDataToSession(sessionId: sessionId, data: "\r\n\u{001B}[35m[AI 智能體回覆]\u{001B}[0m\r\n\(cleanExplanation)\r\n".data(using: .utf8) ?? Data())
                    } else {
                        let cmdToRun = commands.joined(separator: " && ")
                        appState.aiAgentStatusText = "⚡ 正在執行: \(cmdToRun)"

                        if appState.isAIAgentAutoRun {
                            // Direct Autonomous Execution in remote terminal
                            appState.sendCommandToTerminal(command: cmdToRun, sessionId: sessionId)
                            appState.addToast("success", "AI Agent 已自動在遠端伺服器執行指令")
                        } else {
                            appState.inlineAIAgentInput = cmdToRun
                            appState.addToast("info", "已為您生成指令，請確認後按 Enter 執行")
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    appState.isAIAgentRunning = false
                    appState.aiAgentStatusText = "❌ AI 執行出錯: \(error.localizedDescription)"
                    appState.addToast("error", "AI 呼叫失敗: \(error.localizedDescription)")
                }
            }
        }
    }

    private func extractCommands(from text: String) -> [String] {
        var results: [String] = []
        let pattern = "```(?:bash|sh|shell|zsh)?\\s*\\n([\\s\\S]*?)```"
        if let regex = try? NSRegularExpression(pattern: pattern, options: []) {
            let ns = text as NSString
            let matches = regex.matches(in: text, options: [], range: NSRange(location: 0, length: ns.length))
            for m in matches {
                if m.numberOfRanges > 1 {
                    let block = ns.substring(with: m.range(at: 1)).trimmingCharacters(in: .whitespacesAndNewlines)
                    let lines = block.components(separatedBy: .newlines)
                        .map { $0.trimmingCharacters(in: .whitespaces) }
                        .filter { !$0.isEmpty && !$0.hasPrefix("#") }
                    results.append(contentsOf: lines)
                }
            }
        }
        return results
    }
}

struct QuickAgentPill: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.cyan)
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Color.cyan.opacity(0.12))
                .cornerRadius(5)
        }
        .buttonStyle(.plain)
    }
}
