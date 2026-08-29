import Foundation
import Combine

@MainActor
public class DevOpsAgentService: ObservableObject {
    public static let shared = DevOpsAgentService()

    @Published public var activeMissions: [String: DevOpsMission] = [:] // Key: sessionId
    private var missionOutputBuffers: [String: String] = [:] // Key: sessionId
    private var isWaitingSentinel: [String: Bool] = [:] // Key: sessionId
    private var sentinelRegex: NSRegularExpression?

    private init() {
        self.sentinelRegex = try? NSRegularExpression(pattern: "___ITGEEK_AGENT_SENTINEL:(\\d+)___", options: [])
    }

    // MARK: - Start Mission
    public func startMission(
        sessionId: String,
        goal: String,
        host: HostItem?,
        isLocal: Bool,
        isAutonomous: Bool,
        appState: AppState
    ) {
        let mission = DevOpsMission(
            sessionId: sessionId,
            goal: goal,
            status: .planning,
            isAutonomous: isAutonomous,
            steps: [],
            currentStepIndex: 0
        )

        self.activeMissions[sessionId] = mission
        self.missionOutputBuffers[sessionId] = ""
        self.isWaitingSentinel[sessionId] = false

        Task {
            await self.planAndExecuteNextStep(
                sessionId: sessionId,
                host: host,
                isLocal: isLocal,
                appState: appState
            )
        }
    }

    // MARK: - Continue Mission with Follow-up Instruction
    public func continueMission(
        sessionId: String,
        followUp: String,
        host: HostItem?,
        isLocal: Bool,
        appState: AppState
    ) {
        guard var mission = activeMissions[sessionId] else { return }

        mission.followUps.append(followUp)
        mission.status = .planning
        mission.finalConclusion = nil
        mission.errorMessage = nil
        self.activeMissions[sessionId] = mission

        Task {
            await self.planAndExecuteNextStep(
                sessionId: sessionId,
                host: host,
                isLocal: isLocal,
                appState: appState
            )
        }
    }

    // MARK: - Plan and Execute Next Step (ReAct Loop)
    public func planAndExecuteNextStep(
        sessionId: String,
        host: HostItem?,
        isLocal: Bool,
        appState: AppState
    ) async {
        guard var mission = activeMissions[sessionId] else { return }

        mission.status = .planning
        self.activeMissions[sessionId] = mission

        let termContext = appState.sessionBuffers[sessionId]?.suffix(4000).description ?? ""
        let config = appState.vault.settings.aiConfig

        // Build Multi-turn History Context for Agent
        var prompt = """
        你是一個具備自主決策能力的頂級「伺服器 DevOps 智能體 (Autonomous Infrastructure Agent)」。
        初始運維目標：【\(mission.goal)】
        """

        if !mission.followUps.isEmpty {
            prompt += "\n【使用者提出的後續深入處理指令】:\n"
            for (idx, fu) in mission.followUps.enumerated() {
                prompt += "\(idx + 1). \(fu)\n"
            }
        }

        prompt += """
        \n【目標環境】
        - 類型: \(isLocal ? "本地 macOS Shell" : "遠端 SSH 主機 \(host?.label ?? "") (\(host?.hostname ?? ""):\(host?.port ?? 22))")
        - 用戶: \(host?.username ?? "root")
        - 作業系統: \(host?.osType ?? "Linux")

        【目前已執行的所有步驟與終端回傳觀測 (History Steps)】:
        """

        if mission.steps.isEmpty {
            prompt += "\n（目前尚未執行任何步驟，準備開始第 1 步）\n"
        } else {
            for step in mission.steps {
                prompt += """
                \n[步驟 \(step.stepNumber)] \(step.title)
                - 執行指令: `\(step.command)`
                - 終端回傳觀測 (Observation):
                ```text
                \(step.observation.isEmpty ? "(無輸出或快速執行)" : step.observation.prefix(1500))
                ```
                - 執行狀態: \(step.status) (Exit Code: \(step.exitCode ?? 0))
                """
            }
        }

        prompt += """
        \n【當前終端最近即時螢幕日誌】:
        ```text
        \(termContext.isEmpty ? "（無歷史日誌）" : termContext.suffix(2000))
        ```

        【你的決策指令】:
        請根據目標、使用者後續需求與先前的觀測結果，進行嚴謹的 DevOps 思考與推論。

        【🚨 不可逾越之最高 DevOps 鐵律：執行具體操作前必須先確認系統發行版與版本】:
        1. 嚴禁在未確定目標作業系統發行版的情況下，盲目猜測並執行包管理器或系統配置命令！
        2. 若目前是第 1 步且終端日誌中尚未包含完整的 Linux 發行版詳細資訊，【第 1 步必須優先探測發行版與架構】：
           探測指令優先使用：`cat /etc/os-release 2>/dev/null || hostnamectl 2>/dev/null || uname -a`
        3. 嚴格根據目標 Linux 發行版使用其原生對應的套件管理器與設定路徑，嚴禁跨發行版亂用命令：
           - 【Debian / Ubuntu / Deepin / Kali】：只能使用 `apt` / `apt-get` / `dpkg`，軟體源在 `/etc/apt/`，服務配置在 `/etc/default/`、`systemd`。
           - 【RHEL / CentOS / Rocky Linux / AlmaLinux / Fedora】：只能使用 `dnf` / `yum` / `rpm`，軟體源在 `/etc/yum.repos.d/`，服務配置在 `/etc/sysconfig/`。
           - 【Alpine Linux】：只能使用 `apk`，服務管理器為 `rc-service` / `OpenRC`。
           - 【Arch Linux / Manjaro】：只能使用 `pacman`。
           - 【macOS (Darwin)】：只能使用 `brew` / `launchctl` / `defaults`，嚴禁執行 Linux 特定命令。
        4. 任何涉及安裝套件、編譯、修改內核、配置系統服務的操作，都必須完全基於確認後的 OS 發行版與版本特性精確執行！

        【指令語法關鍵要求】:
        1. 輸出的 command 必須是可在 Bash 終端直接執行的單行乾淨指令。
        2. 寫入多行配置檔案時，請使用標準的 `printf '%s\n' '配置內容1' '配置內容2' | sudo tee /路徑/檔案` 或 `echo -e "內容" | sudo tee /路徑/檔案`，嚴禁使用 `bash -c 'cat << '\''EOF'\'''` 等脆弱嵌套語法。
        3. 若不需要執行指令（例如純分析報告或解答使用者問題），command 請留空字串 `""`，並將結論完整填寫在 finalConclusion。

        請「嚴格」只返回一個標準 JSON 格式物件，不要包含額外的 Markdown 閒聊文字，JSON 結構如下：
        {
          "thought": "繁體中文詳細思考：分析系統狀態與需求，決定這一步為什麼要執行此指令或如何回答",
          "stepTitle": "簡明步驟標題（例如：檢測目前 TCP 擁塞控制算法與核心版本）",
          "command": "單行乾淨、安全且可直接執行的 Bash 指令（若僅需回覆說明或已無需執行命令，為空字串 \"\"）",
          "isFinal": false,
          "finalConclusion": "若 isFinal 為 true 或無需執行指令，在此填寫繁體中文的任務達成總結、深入分析報告或驗證結果；否則為空字串"
        }
        """

        do {
            var fullResponse = ""
            _ = try await AIService.shared.streamChat(
                config: config,
                messages: [AIMessage(role: "user", content: prompt)],
                host: host,
                isLocal: isLocal,
                terminalContext: nil
            ) { chunk, _ in
                fullResponse += chunk
            }

            guard let stepDecision = parseAgentDecision(from: fullResponse) else {
                if var m = self.activeMissions[sessionId] {
                    m.status = .failed
                    m.errorMessage = "AI 返回格式解析失敗，請重試或切換模型"
                    self.activeMissions[sessionId] = m
                }
                return
            }

            if stepDecision.isFinal || stepDecision.command.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                if var m = self.activeMissions[sessionId] {
                    m.status = .completed
                    m.finalConclusion = stepDecision.finalConclusion.isEmpty ? (stepDecision.thought.isEmpty ? "任務已順利完成並成功驗證！" : stepDecision.thought) : stepDecision.finalConclusion
                    self.activeMissions[sessionId] = m
                }
                appState.addToast("success", "🎉 AI DevOps 任務已完成分析/執行！")
                return
            }

            let nextStepNumber = mission.steps.count + 1
            let newStep = DevOpsStep(
                stepNumber: nextStepNumber,
                title: stepDecision.stepTitle,
                thought: stepDecision.thought,
                command: stepDecision.command,
                status: "pending"
            )

            if var m = self.activeMissions[sessionId] {
                m.steps.append(newStep)
                m.currentStepIndex = m.steps.count - 1

                if m.isAutonomous {
                    m.status = .executing
                    self.activeMissions[sessionId] = m
                    self.runCurrentStep(sessionId: sessionId, host: host, isLocal: isLocal, appState: appState)
                } else {
                    m.status = .waitingApproval
                    self.activeMissions[sessionId] = m
                }
            }
        } catch {
            if var m = self.activeMissions[sessionId] {
                m.status = .failed
                m.errorMessage = "AI 連線或推論失敗: \(error.localizedDescription)"
                self.activeMissions[sessionId] = m
            }
        }
    }

    // MARK: - Execute Current Step
    public func runCurrentStep(
        sessionId: String,
        host: HostItem?,
        isLocal: Bool,
        appState: AppState
    ) {
        guard var mission = activeMissions[sessionId],
              mission.currentStepIndex < mission.steps.count else { return }

        let stepIndex = mission.currentStepIndex
        var currentStep = mission.steps[stepIndex]

        currentStep.status = "running"
        mission.steps[stepIndex] = currentStep
        mission.status = .executing
        self.activeMissions[sessionId] = mission

        // Reset output buffer and arm sentinel
        self.missionOutputBuffers[sessionId] = ""
        self.isWaitingSentinel[sessionId] = true

        let rawCmd = currentStep.command.trimmingCharacters(in: .whitespacesAndNewlines)
        let wrappedCommand = "\(rawCmd) ; echo \"___ITGEEK_AGENT_SENTINEL:$?___\""

        // Execute in Terminal
        appState.sendCommandToTerminal(command: wrappedCommand, sessionId: sessionId, bypassWarning: true)

        // Safety fallback timeout (25 seconds) in case command hangs
        DispatchQueue.main.asyncAfter(deadline: .now() + 25.0) { [weak self] in
            guard let self = self else { return }
            if self.isWaitingSentinel[sessionId] == true {
                self.handleSentinelFound(
                    sessionId: sessionId,
                    exitCode: 124,
                    host: host,
                    isLocal: isLocal,
                    appState: appState,
                    timedOut: true
                )
            }
        }
    }

    // MARK: - Terminal Stream Interceptor
    public func onTerminalOutput(sessionId: String, text: String, host: HostItem?, isLocal: Bool, appState: AppState) {
        guard isWaitingSentinel[sessionId] == true else { return }

        missionOutputBuffers[sessionId, default: ""].append(text)

        if let buffer = missionOutputBuffers[sessionId],
           let regex = sentinelRegex {
            let nsString = buffer as NSString
            if let match = regex.firstMatch(in: buffer, options: [], range: NSRange(location: 0, length: nsString.length)) {
                let codeStr = nsString.substring(with: match.range(at: 1))
                let exitCode = Int(codeStr) ?? 0

                // Sentinel detected!
                handleSentinelFound(
                    sessionId: sessionId,
                    exitCode: exitCode,
                    host: host,
                    isLocal: isLocal,
                    appState: appState,
                    timedOut: false
                )
            }
        }
    }

    private func handleSentinelFound(
        sessionId: String,
        exitCode: Int,
        host: HostItem?,
        isLocal: Bool,
        appState: AppState,
        timedOut: Bool
    ) {
        guard isWaitingSentinel[sessionId] == true else { return }
        isWaitingSentinel[sessionId] = false

        let rawBuffer = missionOutputBuffers[sessionId] ?? ""
        let cleaned = cleanTerminalOutput(rawBuffer)

        guard var mission = self.activeMissions[sessionId],
              mission.currentStepIndex < mission.steps.count else { return }

        let stepIndex = mission.currentStepIndex
        var currentStep = mission.steps[stepIndex]

        currentStep.exitCode = exitCode
        currentStep.observation = cleaned.isEmpty ? (timedOut ? "(指令執行超時)" : "(執行成功，無標準輸出)") : cleaned
        currentStep.status = (exitCode == 0 ? "success" : "failed")
        mission.steps[stepIndex] = currentStep
        self.activeMissions[sessionId] = mission

        if mission.isAutonomous {
            Task {
                await self.planAndExecuteNextStep(
                    sessionId: sessionId,
                    host: host,
                    isLocal: isLocal,
                    appState: appState
                )
            }
        } else {
            mission.status = .waitingApproval
            self.activeMissions[sessionId] = mission
        }
    }

    // MARK: - Cancel Mission
    public func cancelMission(sessionId: String, appState: AppState) {
        if var mission = activeMissions[sessionId] {
            mission.status = .cancelled
            activeMissions[sessionId] = mission
        }
        isWaitingSentinel[sessionId] = false
        // Send ^C to interrupt any running terminal command
        appState.sendDataToSession(sessionId: sessionId, data: Data([0x03]))
        appState.addToast("info", "已終止 AI Agent 運維任務")
    }

    // MARK: - Utility JSON & Text Parsers
    private func parseAgentDecision(from text: String) -> (thought: String, stepTitle: String, command: String, isFinal: Bool, finalConclusion: String)? {
        var cleanJson = text.trimmingCharacters(in: .whitespacesAndNewlines)

        // Strip ```json markdown wrappers if present
        if cleanJson.contains("```json") {
            cleanJson = cleanJson.replacingOccurrences(of: "```json", with: "")
        }
        if cleanJson.contains("```") {
            cleanJson = cleanJson.replacingOccurrences(of: "```", with: "")
        }
        cleanJson = cleanJson.trimmingCharacters(in: .whitespacesAndNewlines)

        // Find JSON bounds
        if let startIdx = cleanJson.firstIndex(of: "{"),
           let endIdx = cleanJson.lastIndex(of: "}") {
            cleanJson = String(cleanJson[startIdx...endIdx])
        }

        guard let data = cleanJson.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }

        let thought = dict["thought"] as? String ?? ""
        let stepTitle = dict["stepTitle"] as? String ?? "執行運維操作"
        let command = dict["command"] as? String ?? ""
        let isFinal = dict["isFinal"] as? Bool ?? false
        let finalConclusion = dict["finalConclusion"] as? String ?? ""

        return (thought, stepTitle, command, isFinal, finalConclusion)
    }

    private func cleanTerminalOutput(_ raw: String) -> String {
        var cleaned = raw

        // Remove sentinel marker lines
        if let regex = sentinelRegex {
            cleaned = regex.stringByReplacingMatches(in: cleaned, options: [], range: NSRange(location: 0, length: cleaned.utf16.count), withTemplate: "")
        }

        // Remove ANSI escape sequences
        let ansiPattern = "\\x1B(?:\\[[0-?]*[ -/]*[@-~]|\\].*?\\x07|\\].*?\\x1B\\\\)"
        if let ansiRegex = try? NSRegularExpression(pattern: ansiPattern, options: []) {
            cleaned = ansiRegex.stringByReplacingMatches(in: cleaned, options: [], range: NSRange(location: 0, length: cleaned.utf16.count), withTemplate: "")
        }

        return cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
