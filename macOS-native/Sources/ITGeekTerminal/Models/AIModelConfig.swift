import Foundation

public enum AIProvider: String, Codable, CaseIterable, Identifiable {
    case deepseek = "deepseek"
    case openai = "openai"
    case anthropic = "anthropic"
    case gemini = "gemini"
    case qwen = "qwen"
    case moonshot = "moonshot"
    case zhipu = "zhipu"
    case siliconflow = "siliconflow"
    case groq = "groq"
    case ollama = "ollama"
    case custom = "custom"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .deepseek: return "DeepSeek (深度求索)"
        case .openai: return "OpenAI (ChatGPT)"
        case .anthropic: return "Anthropic (Claude)"
        case .gemini: return "Google Gemini"
        case .qwen: return "Qwen (阿里通義千問)"
        case .moonshot: return "Moonshot AI (月之暗面)"
        case .zhipu: return "Zhipu AI (智譜清言 GLM)"
        case .siliconflow: return "SiliconFlow (硅基流動)"
        case .groq: return "Groq (超極速 LPU)"
        case .ollama: return "Ollama (本地離線私有模型)"
        case .custom: return "Custom (自定義 OpenAI 相容端點)"
        }
    }

    public var defaultBaseUrl: String {
        switch self {
        case .deepseek: return "https://api.deepseek.com/v1"
        case .openai: return "https://api.openai.com/v1"
        case .anthropic: return "https://api.anthropic.com/v1"
        case .gemini: return "https://generativelanguage.googleapis.com/v1beta"
        case .qwen: return "https://dashscope.aliyuncs.com/compatible-mode/v1"
        case .moonshot: return "https://api.moonshot.cn/v1"
        case .zhipu: return "https://open.bigmodel.cn/api/paas/v4"
        case .siliconflow: return "https://api.siliconflow.cn/v1"
        case .groq: return "https://api.groq.com/openai/v1"
        case .ollama: return "http://localhost:11434/v1"
        case .custom: return "https://api.openai.com/v1"
        }
    }

    public var defaultModels: [String] {
        switch self {
        case .deepseek: return ["deepseek-chat", "deepseek-reasoner", "deepseek-v3", "deepseek-r1"]
        case .openai: return ["gpt-5", "gpt-4.5-preview", "o3", "o3-mini", "gpt-4o", "gpt-4o-mini"]
        case .anthropic: return ["claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-haiku-4-5-20251001"]
        case .gemini: return ["gemini-3.7-flash", "gemini-3.5-pro", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"]
        case .qwen: return ["qwen3-max", "qwen3.5-plus", "qwq-plus", "qwen-max-latest", "qwen-plus-latest"]
        case .moonshot: return ["kimi-k3", "kimi-k2.7-code", "kimi-k2.6"]
        case .zhipu: return ["glm-5.3", "glm-5.3-flash", "glm-5.2", "glm-5.1"]
        case .siliconflow: return ["deepseek-ai/DeepSeek-V3", "deepseek-ai/DeepSeek-R1", "Qwen/Qwen2.5-72B-Instruct"]
        case .groq: return ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"]
        case .ollama: return ["deepseek-r1:latest", "deepseek-v3:latest", "qwen2.5-coder:latest", "llama3.3:latest"]
        case .custom: return ["default-model"]
        }
    }
}

public struct AIModelConfig: Codable, Hashable {
    public var provider: AIProvider
    public var apiKey: String?
    public var baseUrl: String?
    public var model: String
    public var temperature: Double
    public var maxTokens: Int
    public var enableTerminalContext: Bool
    public var dangerousCommandWarning: Bool
    public var customSystemPrompt: String?

    public init(
        provider: AIProvider = .deepseek,
        apiKey: String? = nil,
        baseUrl: String? = nil,
        model: String = "deepseek-chat",
        temperature: Double = 0.3,
        maxTokens: Int = 4096,
        enableTerminalContext: Bool = true,
        dangerousCommandWarning: Bool = true,
        customSystemPrompt: String? = nil
    ) {
        self.provider = provider
        self.apiKey = apiKey
        self.baseUrl = baseUrl
        self.model = model
        self.temperature = temperature
        self.maxTokens = maxTokens
        self.enableTerminalContext = enableTerminalContext
        self.dangerousCommandWarning = dangerousCommandWarning
        self.customSystemPrompt = customSystemPrompt
    }
}
