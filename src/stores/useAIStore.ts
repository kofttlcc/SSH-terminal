import { create } from 'zustand';
import { AIChatSession, AIMessage, HostItem, AIModelConfig } from '../types';
import { AIService } from '../services/aiService';
import { useVaultStore } from './useVaultStore';
import { useTerminalStore } from './useTerminalStore';
import { useAppStore } from './useAppStore';

interface AIStoreState {
  // Drawer & Modal States
  isDrawerOpen: boolean;
  inlineAssistOpen: boolean;
  drawerWidth: number;
  reasoningExpanded: Record<string, boolean>;

  // Context attachment toggles
  includeTerminalBuffer: boolean;
  includeHostContext: boolean;

  // Session & Streaming States
  sessions: AIChatSession[];
  activeSessionId: string | null;
  isStreaming: boolean;
  currentStreamingMessageId: string | null;
  abortController: AbortController | null;

  // Dangerous command confirmation dialog state
  pendingDangerousCommand: {
    command: string;
    reason?: string;
    targetSessionId?: string;
    isLocal?: boolean;
    isSerial?: boolean;
  } | null;

  // Actions
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  setInlineAssistOpen: (open: boolean) => void;
  setDrawerWidth: (width: number) => void;
  toggleReasoningExpanded: (messageId: string) => void;
  setIncludeTerminalBuffer: (include: boolean) => void;
  setIncludeHostContext: (include: boolean) => void;
  setPendingDangerousCommand: (info: AIStoreState['pendingDangerousCommand']) => void;

  // Session Management
  getActiveSession: () => AIChatSession | undefined;
  createSession: (hostId?: string, sessionId?: string, initialTitle?: string) => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  clearActiveSession: () => void;

  // AI Interaction & Execution
  sendMessage: (
    prompt: string,
    options?: {
      host?: HostItem;
      isLocal?: boolean;
      terminalSnippet?: string;
    }
  ) => Promise<void>;
  diagnoseTerminalError: (terminalSnippet: string, host?: HostItem, isLocal?: boolean) => Promise<void>;
  abortStreaming: () => void;

  // Terminal Execution Dispatcher
  executeCommand: (
    command: string,
    targetSessionId?: string,
    isLocal?: boolean,
    isSerial?: boolean,
    bypassWarning?: boolean
  ) => void;
  insertToComposeBar: (command: string) => void;
}

export const useAIStore = create<AIStoreState>((set, get) => ({
  isDrawerOpen: false,
  inlineAssistOpen: false,
  drawerWidth: 420,
  reasoningExpanded: {},

  includeTerminalBuffer: true,
  includeHostContext: true,

  sessions: [],
  activeSessionId: null,
  isStreaming: false,
  currentStreamingMessageId: null,
  abortController: null,
  pendingDangerousCommand: null,

  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  setInlineAssistOpen: (open) => set({ inlineAssistOpen: open }),
  setDrawerWidth: (width) => set({ drawerWidth: Math.max(340, Math.min(width, 700)) }),

  toggleReasoningExpanded: (messageId) =>
    set((state) => ({
      reasoningExpanded: {
        ...state.reasoningExpanded,
        [messageId]: !state.reasoningExpanded[messageId]
      }
    })),

  setIncludeTerminalBuffer: (include) => set({ includeTerminalBuffer: include }),
  setIncludeHostContext: (include) => set({ includeHostContext: include }),
  setPendingDangerousCommand: (info) => set({ pendingDangerousCommand: info }),

  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    if (!activeSessionId) return sessions[0];
    return sessions.find((s) => s.id === activeSessionId) || sessions[0];
  },

  createSession: (hostId, sessionId, initialTitle = '新對話') => {
    const newSessionId = 'ai-session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const newSession: AIChatSession = {
      id: newSessionId,
      title: initialTitle,
      hostId,
      sessionId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      activeSessionId: newSessionId
    }));

    return newSessionId;
  },

  selectSession: (id) => set({ activeSessionId: id }),

  deleteSession: (id) =>
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      return {
        sessions: filtered,
        activeSessionId: state.activeSessionId === id ? (filtered[0]?.id || null) : state.activeSessionId
      };
    }),

  clearActiveSession: () => {
    const active = get().getActiveSession();
    if (!active) return;
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === active.id ? { ...s, messages: [], updatedAt: Date.now() } : s
      )
    }));
  },

  sendMessage: async (prompt, options) => {
    if (!prompt.trim()) return;

    let activeSession = get().getActiveSession();
    if (!activeSession) {
      const newId = get().createSession(options?.host?.id, undefined, prompt.slice(0, 20));
      activeSession = get().sessions.find((s) => s.id === newId);
    }

    if (!activeSession) return;

    const userMessageId = 'msg-' + Date.now() + '-user';
    const assistantMessageId = 'msg-' + (Date.now() + 1) + '-assistant';

    const userMessage: AIMessage = {
      id: userMessageId,
      role: 'user',
      content: prompt,
      contextSnapshot: {
        hostLabel: options?.host?.label,
        osType: options?.host?.osType,
        hostname: options?.host?.hostname,
        terminalSnippet: options?.terminalSnippet
      },
      timestamp: Date.now()
    };

    const initialAssistantMessage: AIMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      reasoningContent: '',
      timestamp: Date.now()
    };

    // Auto-update session title if it's the first message
    const updatedTitle = activeSession.messages.length === 0 ? prompt.slice(0, 24) : activeSession.title;

    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === activeSession!.id
          ? {
              ...s,
              title: updatedTitle,
              messages: [...s.messages, userMessage, initialAssistantMessage],
              updatedAt: Date.now()
            }
          : s
      ),
      isStreaming: true,
      currentStreamingMessageId: assistantMessageId
    }));

    const abortCtrl = new AbortController();
    set({ abortController: abortCtrl });

    const { settings } = useVaultStore.getState();
    const aiConfig: AIModelConfig = settings.aiConfig || {
      provider: 'deepseek',
      model: 'deepseek-chat',
      temperature: 0.3,
      maxTokens: 4096,
      enableTerminalContext: true,
      dangerousCommandWarning: true
    };

    const currentSessionMessages = [...activeSession.messages, userMessage];

    try {
      let accumulatedContent = '';
      let accumulatedReasoning = '';

      await AIService.streamChat(
        aiConfig,
        currentSessionMessages,
        (chunk, reasoningChunk) => {
          if (chunk) accumulatedContent += chunk;
          if (reasoningChunk) accumulatedReasoning += reasoningChunk;

          const extractedCommands = AIService.extractCommandsFromMarkdown(accumulatedContent);

          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === activeSession!.id
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMessageId
                        ? {
                            ...m,
                            content: accumulatedContent,
                            reasoningContent: accumulatedReasoning,
                            commands: extractedCommands
                          }
                        : m
                    )
                  }
                : s
            )
          }));
        },
        abortCtrl.signal,
        options?.host,
        options?.isLocal,
        get().includeTerminalBuffer ? options?.terminalSnippet : undefined
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        useAppStore.getState().addToast('info', 'AI 串流生成已手動停止');
      } else {
        const errorContent = `\n\n> ⚠️ **AI 請求發生錯誤**：${err.message || '無法連線至 AI 服務商，請檢查偏好設定中的 API Key 與網路'}`;
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === activeSession!.id
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: (m.content || '') + errorContent
                        }
                      : m
                  )
                }
              : s
          )
        }));
        useAppStore.getState().addToast('error', `AI 錯誤: ${err.message}`);
      }
    } finally {
      set({
        isStreaming: false,
        currentStreamingMessageId: null,
        abortController: null
      });
    }
  },

  diagnoseTerminalError: async (terminalSnippet, host, isLocal) => {
    if (!terminalSnippet.trim()) {
      useAppStore.getState().addToast('warning', '當前終端無可分析的輸出內容');
      return;
    }

    set({ isDrawerOpen: true });

    const prompt = `請檢視下方終端出現的報錯/異常日誌輸出，為我進行深度根因診斷（Root Cause Analysis），並提供修復與驗證的 Shell 指令：\n\n\`\`\`text\n${terminalSnippet.trim()}\n\`\`\``;

    await get().sendMessage(prompt, {
      host,
      isLocal,
      terminalSnippet
    });
  },

  abortStreaming: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({
        abortController: null,
        isStreaming: false,
        currentStreamingMessageId: null
      });
    }
  },

  executeCommand: (command, targetSessionId, isLocal = false, isSerial = false, bypassWarning = false) => {
    if (!command.trim()) return;

    const { settings } = useVaultStore.getState();
    const shouldWarn = settings.aiConfig?.dangerousCommandWarning !== false;

    // Check risk level if warning enabled and not explicitly bypassed
    if (shouldWarn && !bypassWarning) {
      const evaluation = AIService.evaluateCommandRisk(command);
      if (evaluation.riskLevel === 'danger' || evaluation.riskLevel === 'caution') {
        set({
          pendingDangerousCommand: {
            command,
            reason: evaluation.reason,
            targetSessionId,
            isLocal,
            isSerial
          }
        });
        return;
      }
    }

    // Determine target session (use provided session or active terminal pane)
    let finalSessionId = targetSessionId;
    if (!finalSessionId) {
      const { tabs, activeTabId } = useTerminalStore.getState();
      const currentTab = tabs.find((t) => t.id === activeTabId);
      const activePane = currentTab?.panes.find((p) => p.paneId === currentTab.activePaneId) || currentTab?.panes[0];
      finalSessionId = activePane?.sessionId;
      if (activePane) {
        isLocal = !!activePane.isLocal;
        isSerial = activePane.host?.protocol === 'serial';
      }
    }

    if (!finalSessionId) {
      useAppStore.getState().addToast('warning', '請先開啟或連線至一個終端會話以執行指令');
      return;
    }

    const payload = command.endsWith('\n') || command.endsWith('\r') ? command : command + '\r';

    if (isSerial && (window as any).electronAPI?.serial) {
      (window as any).electronAPI.serial.write(finalSessionId, payload);
    } else if ((window as any).electronAPI?.terminal) {
      (window as any).electronAPI.terminal.sendData(finalSessionId, payload, isLocal);
    }

    useAppStore.getState().addToast('success', `已在終端發送並執行指令: ${command.slice(0, 30)}...`);
  },

  insertToComposeBar: (command) => {
    if (!command.trim()) return;
    useTerminalStore.getState().setComposeBarOpen(true);
    useAppStore.getState().addToast('info', '已將指令填入底部撰寫欄');
  }
}));
