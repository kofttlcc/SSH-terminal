import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Square, 
  Play, 
  Copy, 
  Edit3, 
  Trash2, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Server, 
  Terminal as TerminalIcon, 
  Check, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  FileText, 
  Plus, 
  Settings, 
  Maximize2,
  RefreshCw,
  Cpu,
  HardDrive,
  Activity,
  Zap
} from 'lucide-react';
import { useAIStore } from '../../stores/useAIStore';
import { useVaultStore } from '../../stores/useVaultStore';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { useAppStore } from '../../stores/useAppStore';
import { PROVIDER_PRESETS } from '../../services/aiService';
import { ExtractedCommand, HostItem } from '../../types';

interface AIAssistantDrawerProps {
  host?: HostItem;
  isLocal?: boolean;
  activeSessionId?: string;
  getTerminalBuffer?: () => string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  host,
  isLocal,
  activeSessionId,
  getTerminalBuffer
}) => {
  const {
    isDrawerOpen,
    setDrawerOpen,
    drawerWidth,
    setDrawerWidth,
    getActiveSession,
    createSession,
    clearActiveSession,
    sendMessage,
    isStreaming,
    abortStreaming,
    reasoningExpanded,
    toggleReasoningExpanded,
    includeTerminalBuffer,
    setIncludeTerminalBuffer,
    includeHostContext,
    setIncludeHostContext,
    executeCommand,
    insertToComposeBar
  } = useAIStore();

  const { settings } = useVaultStore();
  const { setActiveView, addToast } = useAppStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedCmdIndex, setCopiedCmdIndex] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = getActiveSession();
  const aiConfig = settings.aiConfig || {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.3
  };

  const currentProvider = PROVIDER_PRESETS[aiConfig.provider] || PROVIDER_PRESETS.deepseek;

  useEffect(() => {
    if (isDrawerOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isDrawerOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isStreaming]);

  // Drawer Resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setDrawerWidth]);

  if (!isDrawerOpen) return null;

  const handleSend = async () => {
    if (!inputPrompt.trim() || isStreaming) return;
    const promptText = inputPrompt;
    setInputPrompt('');

    const terminalSnippet = (includeTerminalBuffer && getTerminalBuffer) ? getTerminalBuffer() : undefined;

    await sendMessage(promptText, {
      host,
      isLocal,
      terminalSnippet
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyCommand = (cmd: string, idKey: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmdIndex(idKey);
    addToast('info', '已複製指令至剪貼簿');
    setTimeout(() => setCopiedCmdIndex(null), 2000);
  };

  const quickPrompts = [
    { title: '系統負載診斷', prompt: '請幫我檢查這台伺服器的 CPU 負載、記憶體使用率與主要磁碟空間。' },
    { title: '查詢端口佔用', prompt: '請提供指令查詢伺服器上目前正在監聽的 TCP 端口與對應的進程 PID。' },
    { title: 'Docker 狀態檢查', prompt: '請檢視正在運行的 Docker 容器狀態，並檢查是否有重啟或異常退出的容器。' },
    { title: '查詢大檔案', prompt: '請幫我找出根目錄下佔用磁碟空間大於 100MB 的前 10 個檔案。' },
    { title: '網路連線除錯', prompt: '請檢查伺服器的 DNS 解析、預設閘道連通性與外部網路連線狀態。' }
  ];

  return (
    <div 
      style={{ width: `${drawerWidth}px` }}
      className="h-full bg-sidebar border-l border-border/80 flex flex-col relative flex-shrink-0 select-none z-20 shadow-2xl animate-fade-in"
    >
      {/* Left Resize Handle */}
      <div 
        onMouseDown={() => setIsResizing(true)}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/50 transition-colors z-30"
      />

      {/* Top Header */}
      <div className="h-12 border-b border-border/60 px-4 flex items-center justify-between bg-card/40 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-glow flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-100">
              <span>ITGeek AI 智能體</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                {aiConfig.model || 'DeepSeek-V3'}
              </span>
            </div>
            <div className="text-[10px] text-mutedDark font-mono truncate">
              {host ? `連線: ${host.label} (${host.osType || 'Linux'})` : isLocal ? '本機 Shell 環境' : '通用基礎設施'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-muted">
          <button
            onClick={() => createSession(host?.id, activeSessionId, '新對話')}
            className="p-1.5 hover:bg-card hover:text-slate-200 rounded-lg transition-colors"
            title="開啟新對話"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearActiveSession}
            className="p-1.5 hover:bg-card hover:text-slate-200 rounded-lg transition-colors"
            title="清空當前對話記錄"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className="p-1.5 hover:bg-card hover:text-slate-200 rounded-lg transition-colors"
            title="設定 AI 模型與 API Key"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 hover:bg-card hover:text-slate-200 rounded-lg transition-colors ml-1"
            title="收折 AI 抽屜 (Cmd+L / Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Context Awareness Bar */}
      <div className="px-3 py-1.5 border-b border-border/40 bg-sidebar/90 flex items-center justify-between text-[11px] flex-shrink-0">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-muted hover:text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeTerminalBuffer}
              onChange={(e) => setIncludeTerminalBuffer(e.target.checked)}
              className="w-3 h-3 accent-purple-500 rounded cursor-pointer"
            />
            <span>讀取終端畫面</span>
          </label>

          <label className="flex items-center gap-1.5 text-muted hover:text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeHostContext}
              onChange={(e) => setIncludeHostContext(e.target.checked)}
              className="w-3 h-3 accent-purple-500 rounded cursor-pointer"
            />
            <span>注入主機環境</span>
          </label>
        </div>

        <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>情境感知已就緒</span>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {(!activeSession || activeSession.messages.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-3 shadow-glow">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">與您的伺服器基礎設施對話</h3>
            <p className="text-xs text-mutedDark max-w-xs mt-1 leading-relaxed">
              輸入自然語言需求，AI 智能體將根據目前主機作業系統與終端即時情境，生成高精準 Shell 指令並支援一鍵執行。
            </p>

            {/* Quick Prompt Cards */}
            <div className="w-full mt-6 space-y-2 text-left">
              <div className="text-[10px] text-mutedDark uppercase font-semibold tracking-wider px-1">
                推薦快捷診斷指令：
              </div>
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputPrompt(item.prompt);
                    textareaRef.current?.focus();
                  }}
                  className="w-full p-2.5 rounded-xl bg-card/60 hover:bg-card border border-border/60 hover:border-purple-500/40 text-left transition-all group shadow-sm flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-mutedDark truncate mt-0.5">
                      {item.prompt}
                    </div>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-muted group-hover:text-purple-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          activeSession.messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={msg.id || index}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-fade-in`}
              >
                {/* Message Header */}
                <div className="flex items-center gap-1.5 text-[10px] text-mutedDark font-mono px-1">
                  <span>{isUser ? '您' : 'AI 智能體'}</span>
                  <span>·</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Message Body */}
                <div className={`rounded-2xl p-3.5 max-w-[95%] text-xs leading-relaxed ${
                  isUser 
                    ? 'bg-primary/25 border border-primary/40 text-slate-100 rounded-tr-sm shadow-sm'
                    : 'bg-card border border-border/80 text-slate-200 rounded-tl-sm shadow-sm w-full'
                }`}>
                  {/* Reasoning Content (DeepSeek-R1 / Thinking models) */}
                  {msg.reasoningContent && (
                    <div className="mb-3 rounded-xl bg-background/80 border border-purple-500/30 overflow-hidden">
                      <button
                        onClick={() => toggleReasoningExpanded(msg.id)}
                        className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] text-purple-300 font-mono hover:bg-card/50 transition-colors"
                      >
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>深度思考歷程 (Reasoning Chain)</span>
                        </span>
                        {reasoningExpanded[msg.id] ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {reasoningExpanded[msg.id] && (
                        <div className="p-3 border-t border-purple-500/20 text-[11px] text-muted font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto no-scrollbar">
                          {msg.reasoningContent}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Markdown / Text Content */}
                  <div className="whitespace-pre-wrap select-text font-sans">
                    {msg.content}
                  </div>

                  {/* Extracted Executable Command Cards */}
                  {msg.commands && msg.commands.length > 0 && (
                    <div className="mt-3.5 space-y-2.5 pt-2 border-t border-border/60">
                      <div className="text-[10px] font-bold text-mutedDark uppercase tracking-wider flex items-center justify-between">
                        <span>可執行命令建議：</span>
                        <span className="text-[9px] font-mono lowercase">點擊一鍵在終端發送</span>
                      </div>

                      {msg.commands.map((cmd, cIdx) => {
                        const idKey = `${msg.id}-${cIdx}`;
                        const isCopied = copiedCmdIndex === idKey;
                        const isDanger = cmd.riskLevel === 'danger';
                        const isCaution = cmd.riskLevel === 'caution';

                        return (
                          <div
                            key={cIdx}
                            className={`rounded-xl border overflow-hidden transition-all ${
                              isDanger 
                                ? 'bg-rose-500/10 border-rose-500/40 shadow-sm shadow-rose-500/10'
                                : isCaution
                                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-500/10'
                                : 'bg-background border-border/80'
                            }`}
                          >
                            {/* Command Header / Risk Badge */}
                            <div className="px-3 py-1.5 border-b border-border/40 flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5 font-mono">
                                <TerminalIcon className="w-3 h-3 text-termiusCyan" />
                                <span className="font-semibold text-slate-300">Shell Command</span>
                              </div>

                              {isDanger && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold flex items-center gap-1 border border-rose-500/30">
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>高危操作</span>
                                </span>
                              )}
                              {isCaution && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium flex items-center gap-1 border border-amber-500/30">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>注意操作</span>
                                </span>
                              )}
                              {!isDanger && !isCaution && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium flex items-center gap-1 border border-emerald-500/30">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>安全指令</span>
                                </span>
                              )}
                            </div>

                            {/* Command Code Preview */}
                            <div className="p-3 font-mono text-xs text-amber-300 select-text overflow-x-auto whitespace-pre-wrap break-all leading-relaxed bg-black/40">
                              {cmd.command}
                            </div>

                            {/* Risk Reason text */}
                            {cmd.riskReason && (
                              <div className="px-3 py-1 bg-card/60 text-[10px] text-rose-300 border-t border-border/30 flex items-center gap-1 font-mono">
                                <span>⚠️ {cmd.riskReason}</span>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="p-2 bg-sidebar/80 border-t border-border/40 flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleCopyCommand(cmd.command, idKey)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card hover:bg-cardHover border border-border/60 text-[11px] text-slate-300 hover:text-white transition-colors"
                                title="複製指令至剪貼簿"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied ? '已複製' : '複製'}</span>
                              </button>

                              <button
                                onClick={() => insertToComposeBar(cmd.command)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card hover:bg-cardHover border border-border/60 text-[11px] text-slate-300 hover:text-white transition-colors"
                                title="將指令填入底部撰寫欄以修改參數"
                              >
                                <Edit3 className="w-3 h-3 text-blue-400" />
                                <span>填入撰寫欄</span>
                              </button>

                              <button
                                onClick={() => executeCommand(cmd.command, activeSessionId, isLocal, host?.protocol === 'serial')}
                                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-white text-[11px] font-semibold transition-all active:scale-95 shadow-sm ${
                                  isDanger 
                                    ? 'bg-rose-600 hover:bg-rose-500'
                                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                                }`}
                                title="直接發送至當前終端執行"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>在終端執行</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="p-3 border-t border-border/60 bg-sidebar flex-shrink-0 space-y-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'AI 正在分析與生成指令中...' : '向 AI 智能體提問或描述運維需求（Enter 發送，Shift+Enter 換行）...'}
            disabled={isStreaming}
            className="w-full p-2.5 pb-8 rounded-xl bg-card border border-border/80 focus:border-purple-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none resize-none no-scrollbar font-sans shadow-inner transition-colors disabled:opacity-50"
          />

          {/* Action Bar inside textarea */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
            {isStreaming ? (
              <button
                onClick={abortStreaming}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition-all shadow-sm active:scale-95"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>停止生成</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputPrompt.trim()}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-[11px] font-semibold transition-all shadow-sm active:scale-95 shadow-purple-600/20"
              >
                <Send className="w-3 h-3" />
                <span>發送</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between text-[10px] text-mutedDark font-mono px-1">
          <span>模型: {aiConfig.provider} · {aiConfig.model || '預設'}</span>
          <span>捷徑: ⌘L 抽屜 / ⌘K 快速命令</span>
        </div>
      </div>
    </div>
  );
};
