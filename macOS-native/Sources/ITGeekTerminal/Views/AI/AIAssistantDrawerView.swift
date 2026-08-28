import SwiftUI

public struct AIAssistantDrawerView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.purple.opacity(0.2))
                            .frame(width: 28, height: 28)
                        Image(systemName: "sparkles")
                            .foregroundColor(.purple)
                            .font(.system(size: 13))
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text("AI 伺服器智能體")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                        Text(appState.vault.settings.aiConfig.provider.displayName)
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                    }
                }

                Spacer()

                Button(action: {
                    appState.isDrawerOpen = false
                }) {
                    Image(systemName: "xmark")
                        .foregroundColor(.gray)
                        .font(.system(size: 11))
                }
                .buttonStyle(.plain)
            }
            .padding(12)
            .background(Color(red: 15/255, green: 17/255, blue: 26/255))
            .overlay(Rectangle().frame(height: 1).foregroundColor(Color.gray.opacity(0.2)), alignment: .bottom)

            // Chat Messages List
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 14) {
                        if currentSession.messages.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "bolt.shield.fill")
                                    .font(.system(size: 36))
                                    .foregroundColor(.purple.opacity(0.6))
                                    .padding(.top, 40)
                                Text("我是您的伺服器 AI 運維工程師")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                Text("隨時為您分析終端報錯、撰寫部署腳本或執行系統診斷指令。")
                                    .font(.system(size: 11))
                                    .foregroundColor(.gray)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 24)

                                // Quick Prompts
                                VStack(spacing: 6) {
                                    QuickPromptButton(title: "系統資源負載檢查", prompt: "請提供指令檢查這台伺服器的 CPU、記憶體與磁碟使用率。") {
                                        sendPrompt($0)
                                    }
                                    QuickPromptButton(title: "查詢 80/443 端口佔用進程", prompt: "請查詢 80 與 443 端口由哪個進程監聽佔用。") {
                                        sendPrompt($0)
                                    }
                                    QuickPromptButton(title: "Docker 運行狀態診斷", prompt: "請檢視當前 Docker 容器與重啟異常日誌。") {
                                        sendPrompt($0)
                                    }
                                }
                                .padding(.top, 16)
                            }
                        } else {
                            ForEach(currentSession.messages) { msg in
                                MessageBubbleView(message: msg, onExecuteCommand: { cmd in
                                    appState.sendCommandToTerminal(command: cmd)
                                })
                                .id(msg.id)
                            }
                        }
                    }
                    .padding(12)
                }
                .onChange(of: currentSession.messages.count) { _ in
                    if let last = currentSession.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            // Input Area
            VStack(spacing: 8) {
                HStack {
                    TextField("用自然語言描述需求 (Enter 發送)...", text: $appState.aiDrawerInput, axis: .vertical)
                        .lineLimit(1...4)
                        .textFieldStyle(.plain)
                        .font(.system(size: 12))
                        .padding(8)
                        .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                        .cornerRadius(8)
                        .onSubmit {
                            sendInput()
                        }

                    Button(action: {
                        sendInput()
                    }) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(appState.aiDrawerInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .gray : .purple)
                    }
                    .buttonStyle(.plain)
                    .disabled(appState.aiDrawerInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || appState.isAIStreaming)
                }
            }
            .padding(12)
            .background(Color(red: 15/255, green: 17/255, blue: 26/255))
            .overlay(Rectangle().frame(height: 1).foregroundColor(Color.gray.opacity(0.2)), alignment: .top)
        }
        .background(Color(red: 11/255, green: 12/255, blue: 19/255))
    }

    private var currentSession: AIChatSession {
        if let sid = appState.activeAISessionId,
           let found = appState.aiSessions.first(where: { $0.id == sid }) {
            return found
        }
        if let first = appState.aiSessions.first {
            return first
        }
        let newSession = AIChatSession(title: "新對話")
        appState.aiSessions.append(newSession)
        appState.activeAISessionId = newSession.id
        return newSession
    }

    private func sendInput() {
        guard !appState.aiDrawerInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let text = appState.aiDrawerInput
        appState.aiDrawerInput = ""
        sendPrompt(text)
    }

    private func sendPrompt(_ prompt: String) {
        let userMsg = AIMessage(role: "user", content: prompt)
        let assistantMsg = AIMessage(role: "assistant", content: "")

        var session = currentSession
        session.messages.append(userMsg)
        session.messages.append(assistantMsg)

        if let idx = appState.aiSessions.firstIndex(where: { $0.id == session.id }) {
            appState.aiSessions[idx] = session
        }

        let assistantId = assistantMsg.id
        appState.isAIStreaming = true

        Task {
            do {
                _ = try await AIService.shared.streamChat(
                    config: appState.vault.settings.aiConfig,
                    messages: session.messages.dropLast(),
                    onChunk: { chunk, reasoning in
                        DispatchQueue.main.async {
                            if let sIdx = self.appState.aiSessions.firstIndex(where: { $0.id == session.id }),
                               let mIdx = self.appState.aiSessions[sIdx].messages.firstIndex(where: { $0.id == assistantId }) {
                                self.appState.aiSessions[sIdx].messages[mIdx].content += chunk
                                if let r = reasoning {
                                    self.appState.aiSessions[sIdx].messages[mIdx].reasoningContent = (self.appState.aiSessions[sIdx].messages[mIdx].reasoningContent ?? "") + r
                                }
                                let extracted = AIService.shared.extractCommandsFromMarkdown(self.appState.aiSessions[sIdx].messages[mIdx].content)
                                self.appState.aiSessions[sIdx].messages[mIdx].commands = extracted
                            }
                        }
                    }
                )
            } catch {
                DispatchQueue.main.async {
                    if let sIdx = self.appState.aiSessions.firstIndex(where: { $0.id == session.id }),
                       let mIdx = self.appState.aiSessions[sIdx].messages.firstIndex(where: { $0.id == assistantId }) {
                        self.appState.aiSessions[sIdx].messages[mIdx].content += "\n⚠️ 請求失敗: \(error.localizedDescription)"
                    }
                }
            }
            DispatchQueue.main.async {
                self.appState.isAIStreaming = false
            }
        }
    }
}

struct QuickPromptButton: View {
    let title: String
    let prompt: String
    let action: (String) -> Void

    var body: some View {
        Button(action: { action(prompt) }) {
            HStack {
                Text(title)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.purple.opacity(0.9))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 9))
                    .foregroundColor(.gray)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.purple.opacity(0.1))
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.purple.opacity(0.3), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

struct MessageBubbleView: View {
    let message: AIMessage
    let onExecuteCommand: (String) -> Void

    var body: some View {
        VStack(alignment: message.role == "user" ? .trailing : .leading, spacing: 6) {
            HStack {
                if message.role == "user" { Spacer() }

                VStack(alignment: .leading, spacing: 8) {
                    if let reasoning = message.reasoningContent, !reasoning.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("🧠 深度思考鏈 (Deep Thinking):")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.purple)
                            Text(reasoning)
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundColor(.gray)
                        }
                        .padding(8)
                        .background(Color.purple.opacity(0.08))
                        .cornerRadius(6)
                    }

                    Text(message.content)
                        .font(.system(size: 12))
                        .foregroundColor(message.role == "user" ? .white : Color(red: 226/255, green: 232/255, blue: 240/255))
                        .textSelection(.enabled)

                    // Extracted Executable Command Action Buttons
                    if let commands = message.commands, !commands.isEmpty {
                        VStack(spacing: 6) {
                            ForEach(commands) { cmd in
                                HStack {
                                    Text(cmd.command)
                                        .font(.system(size: 11, design: .monospaced))
                                        .foregroundColor(.yellow)
                                        .lineLimit(2)
                                    Spacer()
                                    Button(action: {
                                        onExecuteCommand(cmd.command)
                                    }) {
                                        HStack(spacing: 4) {
                                            Image(systemName: "play.fill")
                                            Text("在終端執行")
                                        }
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.green.opacity(0.8))
                                        .cornerRadius(6)
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(8)
                                .background(Color.black.opacity(0.4))
                                .cornerRadius(6)
                            }
                        }
                    }
                }
                .padding(10)
                .background(message.role == "user" ? Color.blue.opacity(0.3) : Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(12)

                if message.role == "assistant" { Spacer() }
            }
        }
    }
}
