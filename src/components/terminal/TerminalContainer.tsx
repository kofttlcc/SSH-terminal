import React, { useEffect } from 'react';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { useAIStore } from '../../stores/useAIStore';
import { TerminalPane } from './TerminalPane';
import { ComposeBar } from './ComposeBar';
import { SyncTargetModal } from './SyncTargetModal';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';
import { AIInlineAssistModal } from '../ai/AIInlineAssistModal';
import { DangerousCommandModal } from '../ai/DangerousCommandModal';
import { TerminalTab } from '../../types';
import { Radio, Zap, X, ShieldAlert, Target } from 'lucide-react';

interface TerminalContainerProps {
  tab: TerminalTab;
}

export const TerminalContainer: React.FC<TerminalContainerProps> = ({ tab }) => {
  const { 
    setActivePane, 
    isGlobalKeystrokeSync, 
    toggleGlobalKeystrokeSync, 
    getTargetSessions,
    setTargetPickerModalOpen,
    syncTargetScope
  } = useTerminalStore();

  const { toggleDrawer, setInlineAssistOpen } = useAIStore();

  const activePane = tab.panes.find((p) => p.paneId === tab.activePaneId) || tab.panes[0];
  const host = activePane?.host;
  const isLocal = activePane?.isLocal;

  // Global Keyboard Shortcuts for AI Agent in Terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Cmd+L or Ctrl+L: Toggle AI Assistant Drawer
      if (isCmdOrCtrl && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        e.stopPropagation();
        toggleDrawer();
        return;
      }

      // Cmd+K or Ctrl+K (when shift is held or inline prompt): Quick AI Assist
      if (isCmdOrCtrl && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        setInlineAssistOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [toggleDrawer, setInlineAssistOpen]);

  const targetCount = React.useMemo(() => {
    if (!isGlobalKeystrokeSync) return 0;
    return getTargetSessions().length;
  }, [isGlobalKeystrokeSync, tab.panes, syncTargetScope]);

  const renderPanes = () => {
    switch (tab.splitMode) {
      case 'split-horizontal':
        return (
          <div className="h-full w-full grid grid-cols-2 gap-1.5 p-1 bg-background">
            {tab.panes.slice(0, 2).map((pane) => (
              <TerminalPane
                key={pane.paneId}
                pane={pane}
                tabId={tab.id}
                isActive={tab.activePaneId === pane.paneId}
                onFocus={() => setActivePane(tab.id, pane.paneId)}
                isBroadcast={tab.broadcast}
              />
            ))}
          </div>
        );

      case 'split-vertical':
        return (
          <div className="h-full w-full grid grid-rows-2 gap-1.5 p-1 bg-background">
            {tab.panes.slice(0, 2).map((pane) => (
              <TerminalPane
                key={pane.paneId}
                pane={pane}
                tabId={tab.id}
                isActive={tab.activePaneId === pane.paneId}
                onFocus={() => setActivePane(tab.id, pane.paneId)}
                isBroadcast={tab.broadcast}
              />
            ))}
          </div>
        );

      case 'grid-2x2':
        return (
          <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-1.5 p-1 bg-background">
            {tab.panes.slice(0, 4).map((pane) => (
              <TerminalPane
                key={pane.paneId}
                pane={pane}
                tabId={tab.id}
                isActive={tab.activePaneId === pane.paneId}
                onFocus={() => setActivePane(tab.id, pane.paneId)}
                isBroadcast={tab.broadcast}
              />
            ))}
          </div>
        );

      case 'single':
      default:
        return (
          <div className="h-full w-full p-1 bg-background">
            {tab.panes[0] && (
              <TerminalPane
                key={tab.panes[0].paneId}
                pane={tab.panes[0]}
                tabId={tab.id}
                isActive={true}
                onFocus={() => setActivePane(tab.id, tab.panes[0].paneId)}
                isBroadcast={false}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden bg-background">
      {/* Global Realtime Keystroke Sync Warning Banner */}
      {isGlobalKeystrokeSync && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-1.5 flex items-center justify-between text-xs z-10 flex-shrink-0 animate-fade-in">
          <div className="flex items-center gap-2 text-amber-300">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
            <span className="font-semibold">
              ⚡ 實時鍵盤同步廣播中：在任意終端輸入的鍵盤操作將即時鏡像發送至 {targetCount} 個會話
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 font-mono text-amber-200">
              {syncTargetScope === 'all' ? '全部會話' : syncTargetScope === 'current-tab' ? '當前標籤頁' : syncTargetScope === 'current-pane' ? '當前終端' : '自訂目標'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTargetPickerModalOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-card/80 hover:bg-card border border-amber-500/30 text-[11px] text-amber-200 transition-colors"
            >
              <Target className="w-3 h-3" />
              <span>變更目標</span>
            </button>

            <button
              onClick={() => toggleGlobalKeystrokeSync(false)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold transition-all active:scale-95 shadow-sm"
            >
              <X className="w-3 h-3" />
              <span>停止同步 (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Panes View Area + AI Assistant Drawer */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-1 relative min-h-0 overflow-hidden">
          {renderPanes()}
        </div>

        {/* Embedded AI Assistant Drawer */}
        <AIAssistantDrawer
          host={host}
          isLocal={isLocal}
          activeSessionId={activePane?.sessionId}
        />
      </div>

      {/* Xshell Compose Bar (撰寫欄) */}
      <ComposeBar />

      {/* Inline Assist Popup & Dangerous Command Guard Modals */}
      <AIInlineAssistModal
        host={host}
        isLocal={isLocal}
        activeSessionId={activePane?.sessionId}
      />
      <DangerousCommandModal />
    </div>
  );
};
