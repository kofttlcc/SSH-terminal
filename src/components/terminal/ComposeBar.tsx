import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Target, 
  ChevronDown, 
  Sparkles, 
  CornerDownLeft, 
  X, 
  RotateCcw, 
  Layers, 
  Server, 
  Terminal as TerminalIcon,
  Globe,
  Square,
  Check
} from 'lucide-react';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { useVaultStore } from '../../stores/useVaultStore';
import { SyncTargetScope } from '../../types';

export const ComposeBar: React.FC = () => {
  const composeBarOpen = useTerminalStore((state) => state.composeBarOpen);
  const setComposeBarOpen = useTerminalStore((state) => state.setComposeBarOpen);
  const syncTargetScope = useTerminalStore((state) => state.syncTargetScope);
  const setSyncTargetScope = useTerminalStore((state) => state.setSyncTargetScope);
  const sendComposeCommand = useTerminalStore((state) => state.sendComposeCommand);
  const commandHistory = useTerminalStore((state) => state.commandHistory);
  const setTargetPickerModalOpen = useTerminalStore((state) => state.setTargetPickerModalOpen);
  const tabs = useTerminalStore((state) => state.tabs);
  const activeTabId = useTerminalStore((state) => state.activeTabId);
  const customTargetSessionIds = useTerminalStore((state) => state.customTargetSessionIds);

  const { snippets } = useVaultStore();

  const [inputCommand, setInputCommand] = useState('');
  const [appendNewline, setAppendNewline] = useState(true);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [snippetPickerOpen, setSnippetPickerOpen] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  const allActiveSessions = React.useMemo(() => {
    if (!composeBarOpen) return [];
    return useTerminalStore.getState().getAllActiveSessions();
  }, [composeBarOpen, tabs]);

  const targetSessionCount = React.useMemo(() => {
    if (!composeBarOpen) return 0;
    if (syncTargetScope === 'all') return allActiveSessions.length;
    if (syncTargetScope === 'current-tab') return allActiveSessions.filter((s) => s.tabId === activeTabId).length;
    if (syncTargetScope === 'current-pane') return 1;
    if (syncTargetScope === 'custom') return allActiveSessions.filter((s) => customTargetSessionIds.includes(s.sessionId)).length;
    return allActiveSessions.length;
  }, [composeBarOpen, syncTargetScope, allActiveSessions, activeTabId, customTargetSessionIds]);

  useEffect(() => {
    if (composeBarOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [composeBarOpen]);

  if (!composeBarOpen) return null;

  const handleSend = () => {
    if (!inputCommand.trim()) return;
    sendComposeCommand(inputCommand, appendNewline);
    setInputCommand('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    if (e.key === 'Escape') {
      setComposeBarOpen(false);
      return;
    }

    // Command History Navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex + 1 < commandHistory.length ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIdx);
      setInputCommand(commandHistory[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIdx = historyIndex - 1;
        setHistoryIndex(prevIdx);
        setInputCommand(commandHistory[prevIdx] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  const getScopeLabel = () => {
    switch (syncTargetScope) {
      case 'all':
        return `全部會話 (${targetSessionCount})`;
      case 'current-tab':
        return `當前標籤分屏 (${targetSessionCount})`;
      case 'current-pane':
        return '當前會話 (1)';
      case 'custom':
        return `自訂目標 (${targetSessionCount})`;
      default:
        return '選擇目標';
    }
  };

  return (
    <div className="border-t border-border/80 bg-sidebar/95 backdrop-blur-md px-3 py-2 select-none flex-shrink-0 animate-fade-in shadow-modal">
      <div className="flex items-center gap-2">
        {/* Target Scope Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-card border border-border/70 hover:border-amber-500/50 text-xs font-semibold text-slate-200 transition-all active:scale-95 whitespace-nowrap"
            title="選擇指令同步發送目標範圍"
          >
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>{getScopeLabel()}</span>
            <ChevronDown className="w-3 h-3 text-muted" />
          </button>

          {/* Scope Dropdown Menu */}
          {scopeDropdownOpen && (
            <div 
              className="absolute left-0 bottom-full mb-1.5 w-60 bg-card border border-border rounded-2xl shadow-modal p-1.5 z-50 animate-fade-in space-y-0.5"
              onClick={() => setScopeDropdownOpen(false)}
            >
              <div className="text-[10px] text-mutedDark font-semibold uppercase px-2.5 py-1 tracking-wider">
                發送目標範圍 (Target Scope)
              </div>

              <button
                onClick={() => setSyncTargetScope('all')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                  syncTargetScope === 'all' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-300 hover:bg-cardHover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>全部已開啟會話</span>
                </div>
                <span className="text-[10px] font-mono text-mutedDark">共 {allActiveSessions.length} 個</span>
              </button>

              <button
                onClick={() => setSyncTargetScope('current-tab')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                  syncTargetScope === 'current-tab' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-300 hover:bg-cardHover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>當前標籤頁所有分屏</span>
                </div>
                {syncTargetScope === 'current-tab' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                onClick={() => setSyncTargetScope('current-pane')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                  syncTargetScope === 'current-pane' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-300 hover:bg-cardHover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Square className="w-3.5 h-3.5 text-termiusCyan" />
                  <span>僅當前焦點終端</span>
                </div>
                {syncTargetScope === 'current-pane' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <div className="border-t border-border/60 my-1" />

              <button
                onClick={() => {
                  setSyncTargetScope('custom');
                  setTargetPickerModalOpen(true);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                  syncTargetScope === 'custom' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-300 hover:bg-cardHover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-rose-400" />
                  <span>自訂勾選目標會話...</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-background/80 text-muted font-mono">
                  設定清單
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Command Input Field */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`在此輸入指令同步發送至 ${targetSessionCount} 個會話（Enter 發送，↑↓ 歷史紀錄，Esc 收折）...`}
            className="w-full pl-3 pr-24 py-1.5 rounded-xl bg-background border border-border/80 focus:border-amber-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono transition-colors shadow-inner"
          />

          {/* Quick Snippet Injector Trigger */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSnippetPickerOpen(!snippetPickerOpen)}
                className="p-1 rounded-lg hover:bg-card text-muted hover:text-amber-400 transition-colors"
                title="從快捷指令庫插入範本"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>

              {/* Snippet Picker Popover */}
              {snippetPickerOpen && (
                <div 
                  className="absolute right-0 bottom-full mb-2 w-72 bg-card border border-border rounded-2xl shadow-modal p-2 z-50 animate-fade-in space-y-1"
                  onClick={() => setSnippetPickerOpen(false)}
                >
                  <div className="text-[10px] text-mutedDark font-semibold uppercase px-2 py-1 tracking-wider">
                    快捷指令庫 (Snippets)
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar">
                    {snippets.map((snip) => (
                      <button
                        key={snip.id}
                        onClick={() => {
                          setInputCommand(snip.command);
                          setSnippetPickerOpen(false);
                          inputRef.current?.focus();
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-sidebar transition-colors group"
                      >
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 truncate">
                          {snip.title}
                        </div>
                        <div className="text-[10px] text-muted font-mono truncate mt-0.5">
                          {snip.command}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Append Newline Checkbox */}
        <label 
          className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted hover:text-slate-200 cursor-pointer select-none px-1"
          title="發送時自動附加回車換行（即時執行命令）"
        >
          <input
            type="checkbox"
            checked={appendNewline}
            onChange={(e) => setAppendNewline(e.target.checked)}
            className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
          />
          <span>執行換行</span>
        </label>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!inputCommand.trim()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap"
        >
          <Send className="w-3.5 h-3.5" />
          <span>發送</span>
        </button>

        {/* Close Button */}
        <button
          onClick={() => setComposeBarOpen(false)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-card transition-colors"
          title="收折撰寫欄 (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
