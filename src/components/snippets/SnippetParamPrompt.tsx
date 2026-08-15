import React, { useState, useEffect } from 'react';
import { X, Zap, Play, Terminal, Radio } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { renderSnippetCommand } from '../../utils/snippets';

export const SnippetParamPrompt: React.FC = () => {
  const { snippetPrompt, setSnippetPrompt, addToast } = useAppStore();
  const { tabs, activeTabId } = useTerminalStore();

  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [broadcastTarget, setBroadcastTarget] = useState(false);

  useEffect(() => {
    if (snippetPrompt?.snippet) {
      const initial: Record<string, string> = {};
      (snippetPrompt.snippet.variables || []).forEach((v) => {
        initial[v] = '';
      });
      setVarValues(initial);
      setBroadcastTarget(false);
    }
  }, [snippetPrompt]);

  if (!snippetPrompt) return null;

  const { snippet } = snippetPrompt;
  const variables = snippet.variables || [];
  const previewCommand = renderSnippetCommand(snippet.command, varValues);

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCmd = `${previewCommand}\n`;

    const currentTab = tabs.find((t) => t.id === activeTabId);
    if (!currentTab) {
      addToast('warning', '當前無活躍中的終端會話，請先開啟連線標籤');
      setSnippetPrompt(null);
      return;
    }

    if (broadcastTarget) {
      // Send to all panes
      currentTab.panes.forEach((p) => {
        if (p.sessionId && (window as any).electronAPI?.terminal) {
          (window as any).electronAPI.terminal.sendData(p.sessionId, finalCmd, p.isLocal);
        }
      });
      addToast('success', `已同步廣播指令「${snippet.title}」至 ${currentTab.panes.length} 個分屏終端`);
    } else {
      // Send to active pane
      const targetPane = currentTab.panes.find((p) => p.paneId === currentTab.activePaneId) || currentTab.panes[0];
      if (targetPane?.sessionId && (window as any).electronAPI?.terminal) {
        (window as any).electronAPI.terminal.sendData(targetPane.sessionId, finalCmd, targetPane.isLocal);
      }
      addToast('success', `已在當前終端執行指令「${snippet.title}」`);
    }

    setSnippetPrompt(null);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => setSnippetPrompt(null)}
    >
      <div 
        className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-modal overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-background/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">執行指令: {snippet.title}</h2>
              <p className="text-[10px] text-mutedDark">執行前請填寫動態參數變量值</p>
            </div>
          </div>
          <button 
            onClick={() => setSnippetPrompt(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleExecute} className="p-5 space-y-4">
          {variables.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300">必要參數列表:</div>
              {variables.map((v) => (
                <div key={v}>
                  <label className="block text-xs font-mono text-amber-300 mb-1">
                    {'{{ ' + v + ' }}'}
                  </label>
                  <input
                    type="text"
                    required
                    value={varValues[v] || ''}
                    onChange={(e) => setVarValues({ ...varValues, [v]: e.target.value })}
                    placeholder={`請輸入 ${v} 的值`}
                    className="w-full px-3 py-1.5 rounded-xl bg-background border border-border focus:border-amber-400 text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Command Preview */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">替換後的完整指令預覽</label>
            <div className="p-3 rounded-xl bg-background border border-border text-xs font-mono text-amber-300 break-all">
              {previewCommand}
            </div>
          </div>

          {/* Target Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-sidebar border border-border/60">
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${broadcastTarget ? 'text-amber-400 animate-pulse' : 'text-muted'}`} />
              <div>
                <div className="text-xs font-medium text-slate-200">同步廣播至所有分屏</div>
                <div className="text-[10px] text-mutedDark">同時向當前標籤頁中的所有分屏面板發送並執行此指令</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setSnippetPrompt(null)}
              className="px-4 py-2 rounded-xl bg-sidebar hover:bg-card text-muted hover:text-white text-xs font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>立即執行</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
