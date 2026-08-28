import { AIModelConfig, AIMessage, ExtractedCommand, CommandRiskLevel, HostItem } from '../types';

export const PROVIDER_PRESETS: Record<string, {
  name: string;
  defaultBaseUrl: string;
  models: Array<{ id: string; name: string; description: string; reasoning?: boolean }>;
}> = {
  deepseek: {
    name: 'DeepSeek (深度求索)',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek-V4 Flash (最新標準旗艦)', description: '2026 最新官方主力模型，極速響應並強化 Agent 運維與自動化能力' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek-V4 Pro (高階旗艦)', description: '具備深度思考與複雜系統架構推理能力的滿血模型', reasoning: true },
      { id: 'deepseek-v4-flash-vision-exp', name: 'DeepSeek-V4 Vision (多模態)', description: '支援終端截圖與圖形視窗辨識的實驗模型' },
      { id: 'deepseek-chat', name: 'DeepSeek-Chat (舊版兼容標籤)', description: '相容於既有腳本的別名' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-Reasoner (R1 思考鏈)', description: '具備完整思維鏈的推理模型', reasoning: true }
    ]
  },
  openai: {
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol (旗艦推理與編程)', description: '2026 OpenAI 旗艦前沿模型，專為複雜推理、Agentic Coding 與長程任務打造' },
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra (通用專業版)', description: '兼顧高智慧與成本效益的通用旗艦，適合各類企業級運維' },
      { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna (極速高吞吐)', description: '專為高並發、高頻查詢優化的超低延遲模型' },
      { id: 'o4-mini', name: 'o4-mini (新一代推理模型)', description: '輕量高智能推理模型，深度分析複雜 Linux 腳本與網路拓撲', reasoning: true },
      { id: 'o3', name: 'o3 (頂級深度思考)', description: 'OpenAI 頂尖深度推理模型', reasoning: true },
      { id: 'o3-mini', name: 'o3-mini (STEM & 程式推理)', description: '代碼與工程深度推理', reasoning: true },
      { id: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', description: '具備廣泛知識的世界模型' },
      { id: 'gpt-4o', name: 'GPT-4o (經典多模態)', description: '經典全能多模態模型' }
    ]
  },
  anthropic: {
    name: 'Anthropic Claude',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-fable-5', name: 'Claude Fable 5 (自主 Agent 旗艦)', description: '2026 次世代前沿智能，專注於長程自主 Agent 執行與系統掌控' },
      { id: 'claude-opus-5', name: 'Claude Opus 5 (企業級架構旗艦)', description: '頂級運算力與架構設計模型，適合處理大型分散式叢集與複雜代碼庫' },
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5 (速度智能平衡)', description: '當前首選主力模型，極致的代碼生成精準度與極快速度' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: '具備接近 Frontier 智慧的超高速輕量模型' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (混合推理)', description: '支援混合思考鏈的經典旗艦', reasoning: true }
    ]
  },
  gemini: {
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (2026 旗艦主力)', description: 'Google 最新軟體工程與 Agent 旗艦主力模型，代碼精確度最高' },
      { id: 'gemini-3.5-pro', name: 'Gemini 3.5 Pro (深度推理旗艦)', description: '100 萬 Token 超大上下文，解決超難度系統故障與跨日誌排查', reasoning: true },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (持續任務主力)', description: '100 萬 Token 長上下文高效主力' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (超極速)', description: '極低延遲高吞吐模型' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (穩定版)', description: '穩定版百萬上下文推理模型', reasoning: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (穩定版)', description: '穩定版高效模型' }
    ]
  },
  qwen: {
    name: 'Qwen (阿里通義千問 / 百煉)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen3-max', name: 'Qwen3-Max (2026 通義旗艦)', description: '阿里最新千億級旗艦模型，全面強化的系統理解與中文運維' },
      { id: 'qwen3.5-plus', name: 'Qwen3.5-Plus (高智能平衡)', description: '最新一代主力模型，兼具極致性價比與卓越推理' },
      { id: 'qwen-max-latest', name: 'Qwen-Max Latest', description: '動態指向通義 Max 最新版' },
      { id: 'qwen-plus-latest', name: 'Qwen-Plus Latest', description: '動態指向通義 Plus 最新版' },
      { id: 'qwen-turbo-latest', name: 'Qwen-Turbo Latest', description: '極速低延遲終端指令生成' },
      { id: 'qwq-plus', name: 'QwQ-Plus (深度思考推理)', description: '通義旗艦級強化學習推理模型，具備長思維鏈', reasoning: true },
      { id: 'qwq-32b', name: 'QwQ-32B (推理專用)', description: '開源領先的深度邏輯推理模型', reasoning: true },
      { id: 'qwen2.5-coder-32b-instruct', name: 'Qwen2.5-Coder-32B', description: '全球領先的開源代碼大模型，精通 Linux Shell 與腳本編寫' }
    ]
  },
  moonshot: {
    name: 'Moonshot AI (月之暗面 / Kimi)',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'kimi-k3', name: 'Kimi K3 (2026 旗艦 2.8T)', description: '2.8T 參數量原生多模態旗艦，100 萬 Token 超長上下文與長程推理' },
      { id: 'kimi-k2.7-code', name: 'Kimi K2.7 Code (代碼專用)', description: '專門針對編程與超長上下文指令跟隨優化' },
      { id: 'kimi-k2.7-code-highspeed', name: 'Kimi K2.7 Code HighSpeed', description: '極速輸出代碼版本' },
      { id: 'kimi-k2.6', name: 'Kimi K2.6 (全能多模態)', description: '通用多模態大模型，支援圖文混合分析' }
    ]
  },
  zhipu: {
    name: 'Zhipu AI (智譜清言 GLM / Z.ai)',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-5.3', name: 'GLM-5.3 (2026 旗艦深度推理)', description: '智譜最新旗艦模型，支援可調 Deep Thinking 與 100 萬上下文', reasoning: true },
      { id: 'glm-5.3-flash', name: 'GLM-5.3 Flash (高效多模態)', description: '混合稀疏注意力架構，極致性價比與超高速輸出' },
      { id: 'glm-5.2', name: 'GLM-5.2 (744B MoE 旗艦)', description: '744B 參數量長程任務與代碼開源旗艦' },
      { id: 'glm-5.1', name: 'GLM-5.1 (Agent 工程專用)', description: '專為 Agentic 流程與多步驟推理打造' },
      { id: 'glm-4-plus', name: 'GLM-4 Plus (經典版)', description: '經典高智能通用模型' }
    ]
  },
  siliconflow: {
    name: 'SiliconFlow (硅基流動)',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'deepseek-ai/DeepSeek-V4-Flash', name: 'DeepSeek-V4 Flash (硅基託管)', description: '全速託管的高並發 DeepSeek-V4 官方主力模型' },
      { id: 'deepseek-ai/DeepSeek-V4-Pro', name: 'DeepSeek-V4 Pro (滿血推理版)', description: '滿血版深度思考推理模型', reasoning: true },
      { id: 'Qwen/Qwen3-Max', name: 'Qwen3-Max (硅基)', description: '通義千問最新旗艦託管' },
      { id: 'Qwen/QwQ-32B', name: 'QwQ-32B (推理旗艦)', description: '開源最強推理思考模型之一', reasoning: true },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama-3.3-70B (硅基)', description: 'Meta 最新旗艦開源模型' }
    ]
  },
  groq: {
    name: 'Groq (LPU 毫秒級極速推理)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek-R1 Distill Llama 70B', description: 'Groq LPU 加速的 DeepSeek-R1 蒸餾模型，超高速輸出思考鏈', reasoning: true },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'Meta 旗艦模型，數百 Token/秒的極致吞吐' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: '毫秒級極速響應輕量模型' },
      { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B (Groq)', description: 'Groq 加速的通義代碼模型' }
    ]
  },
  ollama: {
    name: 'Ollama (本地私有化大模型)',
    defaultBaseUrl: 'http://localhost:11434/v1',
    models: [
      { id: 'deepseek-v4-flash:latest', name: 'DeepSeek-V4 Flash (本地版)', description: 'DeepSeek-V4 本地通用模型' },
      { id: 'deepseek-r1:latest', name: 'DeepSeek-R1 (Local Default)', description: '本地私有化部署的 DeepSeek-R1 推理模型', reasoning: true },
      { id: 'deepseek-r1:32b', name: 'DeepSeek-R1:32b (本地高階)', description: '32B 參數量本地推理大模型', reasoning: true },
      { id: 'deepseek-r1:14b', name: 'DeepSeek-R1:14b (本地平衡)', description: '14B 參數量中等推理模型', reasoning: true },
      { id: 'deepseek-r1:7b', name: 'DeepSeek-R1:7b (本地輕量)', description: '7B 輕量推理模型，一般電腦皆可流暢運行', reasoning: true },
      { id: 'qwen3:latest', name: 'Qwen3 (Local)', description: '通義千問 3 系列本地版' },
      { id: 'qwen2.5-coder:latest', name: 'Qwen 2.5 Coder (Local)', description: '專注於程式碼與 Linux Shell 運維的本地模型' },
      { id: 'qwen2.5-coder:32b', name: 'Qwen 2.5 Coder 32B (本地滿血)', description: '開源代碼之王本地滿血版' },
      { id: 'qwq:latest', name: 'QwQ:latest (本地推理)', description: '通義 QwQ 本地深度思考模型', reasoning: true },
      { id: 'glm-5:latest', name: 'GLM-5 (Local)', description: '智譜 GLM-5 本地版' },
      { id: 'llama3.3:latest', name: 'Llama 3.3 (Local)', description: 'Meta 開源大模型本地版' },
      { id: 'phi4:latest', name: 'Phi-4 (Local)', description: '微軟 Phi-4 高智能開源小模型' }
    ]
  },
  custom: {
    name: '自訂 OpenAI 相容服務 (Custom API)',
    defaultBaseUrl: '',
    models: [
      { id: 'custom-model', name: '自訂模型 (Custom Model)', description: '相容於 OpenAI 規範的自建或第三方中轉 API (如 vLLM、LocalAI、OpenRouter、OneAPI 等)' }
    ]
  }
};

// Dangerous command detection rules
const DANGER_PATTERNS = [
  { pattern: /\brm\s+-(?:r[fv]|f[rv]|r|f)\s+(?:\/|\/\*|\.\/|\*|~|~\/)\b/i, reason: '遞迴刪除根目錄、當前目錄或關鍵系統路徑' },
  { pattern: /\b(?:mkfs|mke2fs|mkfs\.ext[234]|mkfs\.xfs|mkfs\.vfat)\b/i, reason: '格式化磁碟或檔案系統' },
  { pattern: /\bdd\s+if=.*of=\/dev\/(?:sd|hd|nvme|vd|disk)/i, reason: '直接寫入底層硬碟區塊設備' },
  { pattern: />\s*\/dev\/(?:sd|hd|nvme|vd|null|kmem|mem)/i, reason: '直接重定向破壞磁碟或系統核心設備' },
  { pattern: /\bchmod\s+(?:-R\s+)?777\s+\//i, reason: '將根目錄全域權限變更為 777，嚴重破壞系統安全' },
  { pattern: /\bkill\s+(?:-9\s+)?1\b/i, reason: '嘗試強制終止 PID 1 (init / systemd) 核心進程' },
  { pattern: /:\(\)\{\s*:\|:&\s*\};:/i, reason: 'Fork 炸彈 (Fork Bomb)，將耗盡系統進程與記憶體' },
  { pattern: /\b(?:fdisk|parted|gdisk|wipefs)\b.*\/dev\//i, reason: '修改磁碟分區表或抹除檔案系統特徵碼' }
];

const CAUTION_PATTERNS = [
  { pattern: /\b(?:reboot|shutdown|poweroff|init\s+[06]|halt)\b/i, reason: '重新開機或關閉伺服器' },
  { pattern: /\b(?:iptables|nftables|ufw)\s+(?:-F|--flush|reset|disable)\b/i, reason: '清空或停用防火牆規則' },
  { pattern: /\bsystemctl\s+(?:stop|restart|disable)\s+(?:sshd?|network|firewalld)\b/i, reason: '重啟或關閉 SSH/網路等關鍵服務可能導致遠端斷連' },
  { pattern: /\bkillall\s+-9\b/i, reason: '強制終止指定名稱的所有進程' },
  { pattern: /\bchmod\s+-R\b/i, reason: '遞迴修改檔案權限' },
  { pattern: /\bchown\s+-R\b/i, reason: '遞迴修改檔案擁有者' },
  { pattern: /\bDROP\s+DATABASE\b/i, reason: '刪除資料庫' },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, reason: '清空資料表' }
];

export class AIService {
  /**
   * Evaluate command safety and risk level
   */
  public static evaluateCommandRisk(command: string): { riskLevel: CommandRiskLevel; reason?: string } {
    const cleanCmd = command.trim();
    if (!cleanCmd) return { riskLevel: 'safe' };

    for (const rule of DANGER_PATTERNS) {
      if (rule.pattern.test(cleanCmd)) {
        return { riskLevel: 'danger', reason: rule.reason };
      }
    }

    for (const rule of CAUTION_PATTERNS) {
      if (rule.pattern.test(cleanCmd)) {
        return { riskLevel: 'caution', reason: rule.reason };
      }
    }

    return { riskLevel: 'safe' };
  }

  /**
   * Extract executable shell commands and their risk levels from markdown output
   */
  public static extractCommandsFromMarkdown(markdown: string): ExtractedCommand[] {
    const commands: ExtractedCommand[] = [];
    const codeBlockRegex = /```(?:bash|sh|shell|zsh|console)?\s*\n([\s\S]*?)```/gi;
    let match;

    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      const code = match[1].trim();
      if (!code) continue;

      // Extract lines that look like actual commands (skip pure comments or outputs)
      const lines = code.split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));

      if (lines.length > 0) {
        const commandText = lines.join('\n');
        const evaluation = this.evaluateCommandRisk(commandText);
        commands.push({
          command: commandText,
          riskLevel: evaluation.riskLevel,
          riskReason: evaluation.reason
        });
      }
    }

    return commands;
  }

  /**
   * Build ground-truth system prompt including active host & terminal environment context
   */
  public static buildSystemPrompt(
    config: AIModelConfig,
    host?: HostItem,
    isLocal?: boolean,
    terminalContext?: string
  ): string {
    let prompt = `你是由 ITGeek SSH Terminal 開發的專業高階「伺服器終端 AI 智能體 (AI Infrastructure Agent)」。
你具備強大的 Linux/Unix/macOS 系統架構、DevOps、網路除錯、安全運維與容器化技術能力。

【你的職責與核心準則】
1. **精準解決問題**：提供高質量、安全且可直接執行的 Shell 命令與系統維護方案。
2. **作業系統相容性**：嚴格根據當前目標伺服器的作業系統發行版（如 Ubuntu、CentOS、Debian、Alpine、macOS）與架構，使用正確的套件管理器（apt/yum/dnf/apk/brew）與指令語法。
3. **清晰的程式碼區塊標記**：所有可執行的 Shell 指令「必須」包裹在標準 markdown 程式碼區塊中（例如 \`\`\`bash\\n<command>\\n\`\`\`），方便軟體自動解析並提供一鍵在終端執行的動作按鈕。
4. **安全第一與高危警告**：若指令涉及重啟、刪除檔案、修改網路/防火牆或可能導致斷連的操作，請在指令上方給予明確的繁體中文說明與防呆警示。
5. **簡潔有力**：除非使用者要求詳細教學，否則請保持回答精簡、直擊核心，避免冗長無用的客套話。
`;

    if (config.customSystemPrompt?.trim()) {
      prompt += `\n【使用者自訂附加指令】\n${config.customSystemPrompt.trim()}\n`;
    }

    prompt += `\n【當前連線伺服器基礎設施環境資訊】\n`;
    if (isLocal) {
      prompt += `- 環境類型: 本地主機 (Local Machine Shell)\n`;
      prompt += `- 本地平台: ${process.platform === 'darwin' ? 'macOS' : process.platform === 'win32' ? 'Windows' : 'Linux'}\n`;
    } else if (host) {
      prompt += `- 主機名稱/標籤: ${host.label}\n`;
      prompt += `- 連線位址: ${host.hostname}:${host.port || 22}\n`;
      prompt += `- 登入用戶: ${host.username}\n`;
      prompt += `- 目標作業系統: ${host.osType || 'Linux (自動識別)'}\n`;
      prompt += `- 連線協議: ${host.protocol === 'serial' ? 'Serial (串口控制台)' : 'SSH'}\n`;
      if (host.notes) {
        prompt += `- 主機備忘說明: ${host.notes}\n`;
      }
    } else {
      prompt += `- 未連接具體主機 (通用 Linux/Unix 環境)\n`;
    }

    if (terminalContext && terminalContext.trim()) {
      prompt += `\n【當前終端畫面與最新輸出 (Terminal Buffer Context)】\n\`\`\`text\n${terminalContext.trim()}\n\`\`\`\n`;
      prompt += `請基於上方終端實際輸出，協助使用者分析目前狀態、定位報錯原因並提出解決步驟。\n`;
    }

    return prompt;
  }

  /**
   * Universal streaming chat completion handler
   */
  public static async streamChat(
    config: AIModelConfig,
    messages: AIMessage[],
    onChunk: (chunk: string, reasoningChunk?: string) => void,
    signal?: AbortSignal,
    host?: HostItem,
    isLocal?: boolean,
    terminalContext?: string
  ): Promise<string> {
    const provider = config.provider || 'deepseek';
    const systemPrompt = this.buildSystemPrompt(config, host, isLocal, terminalContext);

    if (provider === 'anthropic') {
      return this.streamAnthropic(config, systemPrompt, messages, onChunk, signal);
    } else if (provider === 'gemini') {
      return this.streamGemini(config, systemPrompt, messages, onChunk, signal);
    } else {
      // OpenAI, DeepSeek, Ollama, Custom (OpenAI-compatible)
      return this.streamOpenAICompatible(config, systemPrompt, messages, onChunk, signal);
    }
  }

  /**
   * OpenAI-compatible SSE Streaming (OpenAI, DeepSeek, Ollama, Custom)
   */
  private static async streamOpenAICompatible(
    config: AIModelConfig,
    systemPrompt: string,
    messages: AIMessage[],
    onChunk: (chunk: string, reasoningChunk?: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const preset = PROVIDER_PRESETS[config.provider] || PROVIDER_PRESETS.deepseek;
    let baseUrl = (config.baseUrl || preset.defaultBaseUrl).replace(/\/+$/, '');
    if (!baseUrl) {
      baseUrl = 'https://api.deepseek.com/v1';
    }

    const url = `${baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    ];

    const body: any = {
      model: config.model || preset.models[0]?.id || 'deepseek-chat',
      messages: formattedMessages,
      temperature: config.temperature ?? 0.3,
      stream: true
    };

    if (config.maxTokens) {
      body.max_tokens = config.maxTokens;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `API 請求失敗 (${response.status} ${response.statusText})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          errMsg = parsed.error.message;
        }
      } catch {}
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('無法建立資料串流讀取器');

    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta;
          if (delta) {
            const content = delta.content || '';
            const reasoning = delta.reasoning_content || delta.reasoning || '';
            if (content || reasoning) {
              fullText += content;
              onChunk(content, reasoning);
            }
          }
        } catch {}
      }
    }

    return fullText;
  }

  /**
   * Anthropic Messages API Streaming
   */
  private static async streamAnthropic(
    config: AIModelConfig,
    systemPrompt: string,
    messages: AIMessage[],
    onChunk: (chunk: string, reasoningChunk?: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    const url = `${baseUrl}/messages`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey?.trim() || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };

    const formattedMessages = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: m.content
      }));

    const body: any = {
      model: config.model || 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      messages: formattedMessages,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.3,
      stream: true
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Anthropic API 請求失敗 (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          errMsg = parsed.error.message;
        }
      } catch {}
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('無法建立 Anthropic 串流讀取器');

    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'content_block_delta') {
            if (parsed.delta?.type === 'text_delta') {
              const text = parsed.delta.text || '';
              fullText += text;
              onChunk(text);
            } else if (parsed.delta?.type === 'thinking_delta') {
              const thinking = parsed.delta.thinking || '';
              onChunk('', thinking);
            }
          }
        } catch {}
      }
    }

    return fullText;
  }

  /**
   * Google Gemini API Streaming
   */
  private static async streamGemini(
    config: AIModelConfig,
    systemPrompt: string,
    messages: AIMessage[],
    onChunk: (chunk: string, reasoningChunk?: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const apiKey = config.apiKey?.trim() || '';
    if (!apiKey) throw new Error('請輸入 Google Gemini API Key');

    const model = config.model || 'gemini-2.0-flash';
    const baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    const url = `${baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt + '\n\n了解上述指令，我準備好了。' }]
      },
      {
        role: 'model',
        parts: [{ text: '收到，我是 ITGeek SSH Terminal 的專屬伺服器 AI 助手，請隨時告訴我您的需求！' }]
      },
      ...messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))
    ];

    const body = {
      contents,
      generationConfig: {
        temperature: config.temperature ?? 0.3,
        maxOutputTokens: config.maxTokens || 4096
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Gemini API 請求失敗 (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          errMsg = parsed.error.message;
        }
      } catch {}
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('無法建立 Gemini 串流讀取器');

    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');

        try {
          const parsed = JSON.parse(dataStr);
          const candidates = parsed.candidates || [];
          if (candidates.length > 0) {
            const parts = candidates[0].content?.parts || [];
            for (const part of parts) {
              if (part.thought) {
                onChunk('', part.text || '');
              } else if (part.text) {
                fullText += part.text;
                onChunk(part.text);
              }
            }
          }
        } catch {}
      }
    }

    return fullText;
  }

  /**
   * Test connection to verify model credentials
   */
  public static async testConnection(config: AIModelConfig): Promise<{ success: boolean; message: string }> {
    try {
      const testMsg: AIMessage = {
        id: 'test-1',
        role: 'user',
        content: '請回覆「ITGeek AI 連線測試成功」八個字。',
        timestamp: Date.now()
      };

      const result = await this.streamChat(
        { ...config, maxTokens: 50 },
        [testMsg],
        () => {},
        undefined,
        undefined,
        false,
        undefined
      );

      return {
        success: true,
        message: `連線成功！模型回應：${result.slice(0, 60)}`
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || '連線失敗，請檢查 API Key 或端點位址'
      };
    }
  }
}
