import Foundation

public class AIService {
    public static let shared = AIService()

    public func streamChat(
        config: AIModelConfig,
        messages: [AIMessage],
        host: HostItem? = nil,
        isLocal: Bool = false,
        terminalContext: String? = nil,
        onChunk: @escaping (String, String?) -> Void
    ) async throws -> String {
        let systemPrompt = buildSystemPrompt(config: config, host: host, isLocal: isLocal, terminalContext: terminalContext)

        switch config.provider {
        case .anthropic:
            return try await streamAnthropic(config: config, systemPrompt: systemPrompt, messages: messages, onChunk: onChunk)
        case .gemini:
            return try await streamGemini(config: config, systemPrompt: systemPrompt, messages: messages, onChunk: onChunk)
        default:
            return try await streamOpenAICompatible(config: config, systemPrompt: systemPrompt, messages: messages, onChunk: onChunk)
        }
    }

    private func buildSystemPrompt(
        config: AIModelConfig,
        host: HostItem?,
        isLocal: Bool,
        terminalContext: String?
    ) -> String {
        var prompt = """
        你是由 ITGeek SSH Terminal 開發的專業高階「伺服器終端 AI 智能體 (AI Infrastructure Agent)」。
        你具備強大的 Linux/Unix/macOS 系統架構、DevOps、網路除錯、安全運維與容器化技術能力。

        【你的職責與核心準則】
        1. 精準解決問題：提供高質量、安全且可直接執行的 Shell 命令與系統維護方案。
        2. 作業系統相容性：嚴格根據當前目標伺服器的作業系統發行版（如 Ubuntu、CentOS、Debian、macOS）與架構，使用正確的套件管理器與指令語法。
        3. 清晰的程式碼區塊標記：所有可執行的 Shell 指令「必須」包裹在標準 markdown 程式碼區塊中（例如 ```bash\\n<command>\\n```），方便軟體一鍵在終端執行。
        4. 安全第一與高危警告：若指令涉及重啟、刪除檔案、修改網路/防火牆或可能導致斷連的操作，請在指令上方給予明確的繁體中文說明與防呆警示。
        5. 簡潔有力：除非使用者要求詳細教學，否則請保持回答精簡、直擊核心。
        """

        if let custom = config.customSystemPrompt, !custom.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            prompt += "\n【使用者自訂附加指令】\n\(custom)\n"
        }

        prompt += "\n【當前連線伺服器基礎設施環境資訊】\n"
        if isLocal {
            prompt += "- 環境類型: 本地主機 (macOS Terminal Shell)\n"
        } else if let host = host {
            prompt += "- 主機名稱/標籤: \(host.label)\n"
            prompt += "- 連線位址: \(host.hostname):\(host.port)\n"
            prompt += "- 登入用戶: \(host.username)\n"
            prompt += "- 目標作業系統: \(host.osType ?? "Linux")\n"
        }

        if let context = terminalContext, !context.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            prompt += "\n【當前終端最近螢幕輸出日誌】\n```text\n\(context)\n```\n"
        }

        return prompt
    }

    private func streamOpenAICompatible(
        config: AIModelConfig,
        systemPrompt: String,
        messages: [AIMessage],
        onChunk: @escaping (String, String?) -> Void
    ) async throws -> String {
        let baseUrl = (config.baseUrl ?? config.provider.defaultBaseUrl).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: "\(baseUrl)/chat/completions") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let apiKey = config.apiKey, !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey.trimmingCharacters(in: .whitespacesAndNewlines))", forHTTPHeaderField: "Authorization")
        }

        var formattedMessages: [[String: String]] = [
            ["role": "system", "content": systemPrompt]
        ]
        for msg in messages {
            formattedMessages.append(["role": msg.role, "content": msg.content])
        }

        let body: [String: Any] = [
            "model": config.model.isEmpty ? (config.provider.defaultModels.first ?? "deepseek-chat") : config.model,
            "messages": formattedMessages,
            "temperature": config.temperature,
            "stream": true
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        guard httpResponse.statusCode == 200 else {
            throw NSError(domain: "AIService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "AI API 請求失敗，狀態碼: \(httpResponse.statusCode)"])
        }

        var fullText = ""
        for try await line in bytes.lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            guard trimmed.hasPrefix("data:") else { continue }
            let dataStr = trimmed.dropFirst(5).trimmingCharacters(in: .whitespacesAndNewlines)
            if dataStr == "[DONE]" { break }

            guard let jsonData = dataStr.data(using: .utf8),
                  let jsonObj = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                  let choices = jsonObj["choices"] as? [[String: Any]],
                  let firstChoice = choices.first,
                  let delta = firstChoice["delta"] as? [String: Any] else {
                continue
            }

            let contentChunk = delta["content"] as? String ?? ""
            let reasoningChunk = delta["reasoning_content"] as? String ?? delta["reasoning"] as? String

            if !contentChunk.isEmpty || reasoningChunk != nil {
                fullText += contentChunk
                onChunk(contentChunk, reasoningChunk)
            }
        }

        return fullText
    }

    private func streamAnthropic(
        config: AIModelConfig,
        systemPrompt: String,
        messages: [AIMessage],
        onChunk: @escaping (String, String?) -> Void
    ) async throws -> String {
        let baseUrl = (config.baseUrl ?? config.provider.defaultBaseUrl).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: "\(baseUrl)/messages") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.apiKey ?? "", forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")

        let formattedMessages = messages.map { ["role": $0.role, "content": $0.content] }

        let body: [String: Any] = [
            "model": config.model.isEmpty ? "claude-3-7-sonnet-20250219" : config.model,
            "system": systemPrompt,
            "messages": formattedMessages,
            "max_tokens": config.maxTokens,
            "temperature": config.temperature,
            "stream": true
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "AIService", code: 400, userInfo: [NSLocalizedDescriptionKey: "Anthropic API 請求失敗"])
        }

        var fullText = ""
        for try await line in bytes.lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            guard trimmed.hasPrefix("data:") else { continue }
            let dataStr = trimmed.dropFirst(5).trimmingCharacters(in: .whitespacesAndNewlines)

            guard let jsonData = dataStr.data(using: .utf8),
                  let jsonObj = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                  let type = jsonObj["type"] as? String else {
                continue
            }

            if type == "content_block_delta",
               let delta = jsonObj["delta"] as? [String: Any],
               let text = delta["text"] as? String {
                fullText += text
                onChunk(text, nil)
            }
        }

        return fullText
    }

    private func streamGemini(
        config: AIModelConfig,
        systemPrompt: String,
        messages: [AIMessage],
        onChunk: @escaping (String, String?) -> Void
    ) async throws -> String {
        let apiKey = config.apiKey ?? ""
        let model = config.model.isEmpty ? "gemini-3.7-flash" : config.model
        let baseUrl = (config.baseUrl ?? config.provider.defaultBaseUrl).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: "\(baseUrl)/models/\(model):streamGenerateContent?key=\(apiKey)&alt=sse") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var contents: [[String: Any]] = [
            ["role": "user", "parts": [["text": systemPrompt + "\n了解上述指令，我準備好了。"]]],
            ["role": "model", "parts": [["text": "收到，我是 ITGeek SSH Terminal 的專屬伺服器 AI 助手，請隨時告訴我您的需求！"]]]
        ]

        for msg in messages {
            contents.append([
                "role": msg.role == "user" ? "user" : "model",
                "parts": [["text": msg.content]]
            ])
        }

        let body: [String: Any] = [
            "contents": contents,
            "generationConfig": [
                "temperature": config.temperature,
                "maxOutputTokens": config.maxTokens
            ]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "AIService", code: 400, userInfo: [NSLocalizedDescriptionKey: "Google Gemini API 請求失敗"])
        }

        var fullText = ""
        for try await line in bytes.lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            guard trimmed.hasPrefix("data:") else { continue }
            let dataStr = trimmed.dropFirst(5).trimmingCharacters(in: .whitespacesAndNewlines)

            guard let jsonData = dataStr.data(using: .utf8),
                  let jsonObj = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                  let candidates = jsonObj["candidates"] as? [[String: Any]],
                  let first = candidates.first,
                  let content = first["content"] as? [String: Any],
                  let parts = content["parts"] as? [[String: Any]] else {
                continue
            }

            for part in parts {
                if let isThought = part["thought"] as? Bool, isThought, let text = part["text"] as? String {
                    onChunk("", text)
                } else if let text = part["text"] as? String {
                    fullText += text
                    onChunk(text, nil)
                }
            }
        }

        return fullText
    }

    public func extractCommandsFromMarkdown(_ markdown: String) -> [ExtractedCommand] {
        var commands: [ExtractedCommand] = []
        let pattern = "```(?:bash|sh|shell|zsh)?\\n([\\s\\S]*?)```"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else { return [] }

        let nsString = markdown as NSString
        let matches = regex.matches(in: markdown, options: [], range: NSRange(location: 0, length: nsString.length))

        for match in matches {
            if match.numberOfRanges > 1 {
                let cmdRange = match.range(at: 1)
                let rawCmd = nsString.substring(with: cmdRange).trimmingCharacters(in: .whitespacesAndNewlines)
                if !rawCmd.isEmpty {
                    let risk = evaluateCommandRisk(rawCmd)
                    commands.append(ExtractedCommand(command: rawCmd, riskLevel: risk.riskLevel, riskReason: risk.reason))
                }
            }
        }

        return commands
    }

    public func evaluateCommandRisk(_ command: String) -> (riskLevel: String, reason: String?) {
        let dangerousPatterns = [
            ("rm\\s+-[rfRF]*\\s+[/~]", "偵測到全盤/根目錄或家目錄遞歸刪除指令 (rm -rf / 或 ~)，將導致系統或數據永久丟失！"),
            ("mkfs|fdisk|parted|dd\\s+if=", "偵測到磁碟格式化或底層磁區寫入指令，可能覆蓋物理分區數據！"),
            (":(){ :|:& };:", "偵測到 Fork 炸彈惡意進程耗盡攻擊語法！"),
            ("shutdown|reboot|poweroff|init\\s+0", "偵測到系統關機/重啟指令，將導致當前 SSH 會話與線上服務中斷！"),
            ("iptables\\s+-F|ufw\\s+disable", "偵測到防火牆清空或關閉指令，可能造成伺服器安全屏障失效！"),
            ("chmod\\s+-R\\s+777", "偵測到全目錄 777 寬鬆權限賦予，存在嚴重安全提權漏洞風險！")
        ]

        for (pattern, reason) in dangerousPatterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]),
               regex.firstMatch(in: command, options: [], range: NSRange(location: 0, length: command.utf16.count)) != nil {
                return ("danger", reason)
            }
        }

        return ("safe", nil)
    }
}
