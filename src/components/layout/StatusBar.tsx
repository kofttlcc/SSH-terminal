import React, { useState } from 'react';
import { 
  Zap, 
  Activity, 
  ShieldCheck, 
  Layers, 
  Globe, 
  Terminal,
  FolderSync
} from 'lucide-react';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';
import { Snippet } from '../../types';

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId } = useTerminalStore();
  const { snippets, settings } = useVaultStore();
  const { setSnippetPrompt, setActiveView, activeView } = useAppStore();

  const [snippetDrawerOpen, setSnippetDrawerOpen] = useState(false);

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const activePane = currentTab?.panes.find((p) => p.paneId === currentTab.activePaneId) || currentTab?.panes[0];

  const handleQuickRunSnippet = (snip: Snippet) => {
    setSnippetDrawerOpen(false);
    setSnippetPrompt({
      snippet: snip,
      targetPaneId: activePane?.paneId
    });
  };

  return (
    <footer className="h-6 bg-sidebar border-t border-border flex items-center justify-between px-3 text-[11px] font-mono text-muted select-none z-10">
      {/* Left side: Status indicators */}
      <div className="flex items-center gap-4">
        {/* Connection Status & Ping */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${
            activePane?.status === 'connected' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
            activePane?.status === 'connecting' ? 'bg-amber-400 animate-pulse' :
            activePane?.status === 'error' ? 'bg-rose-500' : 'bg-slate-500'
          }`} />
          <span className="text-slate-300">
            {activePane?.title || '系統就緒'}
          </span>
          {activePane?.ping !== undefined && activePane.ping > 0 && (
            <span className="text-emerald-400 text-[10px] ml-1 flex items-center gap-0.5">
              <Activity className="w-2.5 h-2.5" />
              {activePane.ping}ms
            </span>
          )}
        </div>

        <div className="w-[1px] h-3 bg-border/60"></div>

        {/* Encoding & Shell */}
        <div className="flex items-center gap-1 text-[10px] text-mutedDark">
          <Globe className="w-2.5 h-2.5" />
          <span>編碼: UTF-8</span>
        </div>

        {/* Theme badge */}
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-mutedDark">
          <span>主題: {settings.theme}</span>
        </div>
      </div>

      {/* Right side: Quick Snippets Drawer & Session Count */}
      <div className="flex items-center gap-3">
        {/* Quick Snippet Trigger */}
        <div className="relative">
          <button
            onClick={() => setSnippetDrawerOpen(!snippetDrawerOpen)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] transition-colors"
            title="快速選擇並執行常用指令"
          >
            <Zap className="w-2.5 h-2.5" />
            <span>常用指令庫</span>
          </button>

          {snippetDrawerOpen && (
            <div className="absolute right-0 bottom-7 w-72 bg-card border border-border rounded-xl shadow-modal p-2 z-50 animate-fade-in space-y-1">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-border/60 text-[11px] text-slate-300 font-semibold">
                <span>選擇要執行的指令</span>
                <span className="text-[10px] text-mutedDark">{snippets.length} 個可用</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar">
                {snippets.map((snip) => (
                  <button
                    key={snip.id}
                    onClick={() => handleQuickRunSnippet(snip)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-sidebar hover:bg-sidebar/80 hover:border-amber-500/40 border border-transparent text-xs transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200 group-hover:text-amber-300 truncate">
                        {snip.title}
                      </span>
                      {snip.variables && snip.variables.length > 0 && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-background text-amber-400 font-mono">
                          {snip.variables.length} 個參數
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-mutedDark font-mono truncate mt-0.5">
                      {snip.command}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Total Active Sessions */}
        <div className="flex items-center gap-1 text-[10px] text-mutedDark">
          <Layers className="w-2.5 h-2.5" />
          <span>{tabs.length} 個會話標籤</span>
        </div>
      </div>
    </footer>
  );
};
