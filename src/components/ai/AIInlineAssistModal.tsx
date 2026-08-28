import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Terminal, Play, Edit3, Copy, X, ArrowRight, Check, ShieldAlert, Bot } from 'lucide-react';
import { useAIStore } from '../../stores/useAIStore';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';
import { AIService } from '../../services/aiService';
import { HostItem, ExtractedCommand } from '../../types';

interface AIInlineAssistModalProps {
  host?: HostItem;
  isLocal?: boolean;
  activeSessionId?: string;
  getTerminalBuffer?: () => string;
}

export const AIInlineAssistModal: React.FC<AIInlineAssistModalProps> = ({
  host,
  isLocal,
  activeSessionId,
  getTerminalBuffer
}) => {
  const {
    inlineAssistOpen,
    setInlineAssistOpen,
    setDrawerOpen,
    executeCommand,
    insertToComposeBar
  } = useAIStore();

  const { settings } = useVaultStore();
  const { addToast } = useAppStore();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCommand, setGeneratedCommand] = useState<ExtractedCommand | null>(null);
  const [explanation, setExplanation] = useState('');
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineAssistOpen) {
      setPrompt('');
      setGeneratedCommand(null);
      setExplanation('');
      setCopied(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inlineAssistOpen]);

  if (!inlineAssistOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setGeneratedCommand(null);
    setExplanation('');

    const aiConfig = settings.aiConfig || {
      provider: 'deepseek',
      model: 'deepseek-chat',
      temperature: 0.2
    };

    const terminalSnippet = getTerminalBuffer ? getTerminalBuffer() : undefined;

    const fullPrompt = `請將以下自然語言需求直接轉換為最精確、適配此作業系統環境的單行或簡明 Shell 指令，並在程式碼區塊後附帶一句簡短說明：\n需求：${prompt.trim()}`;

    try {
      let accumulated = '';
      await AIService.streamChat(
        { ...aiConfig, maxTokens: 500, temperature: 0.2 },
        [{ id: 'inline-req', role: 'user', content: fullPrompt, timestamp: Date.now() }],
        (chunk) => {
          accumulated += chunk;
        },
        undefined,
        host,
        isLocal,
        terminalSnippet
      );

      const cmds = AIService.extractCommandsFromMarkdown(accumulated);
      if (cmds.length > 0) {
        setGeneratedCommand(cmds[0]);
      } else {
        // Fallback: clean up markdown if no codeblock
        const cleaned = accumulated.replace(/```/g, '').trim();
        const evalRes = AIService.evaluateCommandRisk(cleaned);
        setGeneratedCommand({
          command: cleaned,
          riskLevel: evalRes.riskLevel,
          riskReason: evalRes.reason
        });
      }

      // Extract brief explanation text without code blocks
      const cleanExpl = accumulated.replace(/```[\s\S]*?```/g, '').trim();
      setExplanation(cleanExpl);
    } catch (err: any) {
      addToast('error', `AI 生成失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!generatedCommand) {
        handleGenerate();
      } else {
        handleExecute();
      }
    } else if (e.key === 'Escape') {
      setInlineAssistOpen(false);
    }
  };

  const handleExecute = () => {
    if (!generatedCommand) return;
    executeCommand(generatedCommand.command, activeSessionId, isLocal, host?.protocol === 'serial');
    setInlineAssistOpen(false);
  };

  const handleInsert = () => {
    if (!generatedCommand) return;
    insertToComposeBar(generatedCommand.command);
    setInlineAssistOpen(false);
  };

  const handleCopy = () => {
    if (!generatedCommand) return;
    navigator.clipboard.writeText(generatedCommand.command);
    setCopied(true);
    addToast('info', '已複製指令至剪貼簿');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4 select-none animate-fade-in">
      <div 
        className="bg-card border border-purple-500/50 rounded-3xl p-5 max-w-xl w-full shadow-2xl shadow-purple-500/20 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>AI 自然語言指令速生 (Inline Assist)</span>
            <span className="text-[10px] text-mutedDark font-mono font-normal">
              ({host ? host.label : '本機 Shell'})
            </span>
          </div>

          <button
            onClick={() => setInlineAssistOpen(false)}
            className="p-1 text-muted hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="用自然語言描述需求 (例: 查詢 80 端口佔用進程、解壓 tar.gz、查看記憶體)..."
            className="w-full pl-3 pr-24 py-2.5 rounded-2xl bg-background border border-border/80 focus:border-purple-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-sans shadow-inner transition-colors"
          />

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? '生成中...' : '生成指令'}</span>
          </button>
        </div>

        {/* Generated Command Card */}
        {generatedCommand && (
          <div className="space-y-2.5 animate-fade-in pt-1">
            <div className="p-3 rounded-2xl bg-background border border-border font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed shadow-inner">
              {generatedCommand.command}
            </div>

            {explanation && (
              <p className="text-[11px] text-mutedDark leading-relaxed px-1">
                💡 {explanation}
              </p>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setInlineAssistOpen(false);
                  setDrawerOpen(true);
                }}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>在側邊抽屜展開深度對話...</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sidebar hover:bg-card border border-border text-xs text-slate-300 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '已複製' : '複製'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleInsert}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sidebar hover:bg-card border border-border text-xs text-slate-300 hover:text-white transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>填入撰寫欄</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecute}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>在終端執行 (Enter)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
