import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  LayoutGrid, 
  Columns, 
  Rows, 
  Square, 
  Radio, 
  Terminal, 
  FolderSync, 
  Minimize2, 
  Maximize2, 
  Minus,
  Sparkles,
  Send,
  Target
} from 'lucide-react';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { useAppStore } from '../../stores/useAppStore';
import { SplitMode } from '../../types';

export const TopTabBar: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    setActiveTab, 
    closeTab, 
    createTab, 
    setSplitMode, 
    toggleBroadcast,
    composeBarOpen,
    toggleComposeBar,
    isGlobalKeystrokeSync,
    toggleGlobalKeystrokeSync
  } = useTerminalStore();

  const { activeView, setActiveView, setQuickConnectOpen } = useAppStore();
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        toggleComposeBar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleComposeBar]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleSplitSelect = (mode: SplitMode) => {
    if (activeTabId) {
      setSplitMode(activeTabId, mode);
    }
    setSplitDropdownOpen(false);
  };

  const handleWindowAction = (action: 'minimize' | 'maximize' | 'close') => {
    if ((window as any).electronAPI?.window) {
      (window as any).electronAPI.window[action]();
    }
  };

  return (
    <header className="h-11 bg-background/95 border-b border-border flex items-center justify-between px-3 select-none app-drag-region z-10">
      {/* Left Area: Tab list & + Button */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar app-no-drag max-w-[70vw]">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id && activeView === (tab.type === 'sftp' ? 'sftp' : 'terminal');
          const isBroadcast = tab.broadcast;

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 border ${
                isActive
                  ? 'bg-card text-white border-blue-500/50 shadow-sm shadow-blue-500/10'
                  : 'bg-sidebar/80 text-slate-400 border-transparent hover:bg-card/60 hover:text-slate-200'
              }`}
            >
              {/* Tab Icon */}
              {tab.type === 'sftp' ? (
                <FolderSync className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              ) : (
                <Terminal className="w-3.5 h-3.5 text-termiusCyan flex-shrink-0" />
              )}

              {/* Title & Panes badge */}
              <span className="truncate max-w-[140px] font-mono text-[11px]">
                {tab.title}
              </span>

              {tab.panes.length > 1 && (
                <span className="px-1 py-0.2 bg-background/80 rounded text-[9px] font-mono text-muted">
                  {tab.panes.length}P
                </span>
              )}

              {/* Broadcast Indicator */}
              {isBroadcast && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" title="廣播同步輸入中" />
              )}

              {/* Close Tab Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-opacity"
                title="關閉標籤頁"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Active Tab Underline Glow */}
              {isActive && (
                <div className="absolute bottom-[-1px] left-2 right-2 h-[2px] bg-gradient-to-r from-blue-500 to-termiusCyan rounded-full"></div>
              )}
            </div>
          );
        })}

        {/* Quick Add Tab Button */}
        <button
          onClick={() => setQuickConnectOpen(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-card border border-border/40 transition-colors"
          title="新增終端連線標籤"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Area: Split Layout Controls & Window Buttons */}
      <div className="flex items-center gap-2 app-no-drag">
        {/* Split & Sync & Compose Controls (Only active when in terminal view) */}
        {activeTab && activeView === 'terminal' && (
          <div className="flex items-center gap-1.5 mr-2 bg-sidebar px-1.5 py-1 rounded-lg border border-border/60">
            {/* Compose Bar Toggle */}
            <button
              onClick={toggleComposeBar}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                composeBarOpen
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-muted hover:text-slate-200 hover:bg-card'
              }`}
              title="開啟/收折 Xshell 撰寫欄 (Cmd+Shift+C)"
            >
              <Send className={`w-3 h-3 ${composeBarOpen ? 'text-amber-400' : ''}`} />
              <span className="hidden xl:inline">撰寫欄</span>
            </button>

            {/* Global Keystroke Sync Toggle */}
            <button
              onClick={() => toggleGlobalKeystrokeSync()}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                isGlobalKeystrokeSync
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm animate-pulse'
                  : 'text-muted hover:text-slate-200 hover:bg-card'
              }`}
              title="開啟/關閉全域實時鍵盤同步（在任意終端輸入即時鏡像發送至目標會話）"
            >
              <Radio className={`w-3 h-3 ${isGlobalKeystrokeSync ? 'text-rose-400' : ''}`} />
              <span className="hidden xl:inline">鍵盤同步</span>
            </button>

            <div className="w-[1px] h-3.5 bg-border"></div>

            {/* Split Mode Selector */}
            <div className="relative">
              <button
                onClick={() => setSplitDropdownOpen(!splitDropdownOpen)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-muted hover:text-slate-200 hover:bg-card transition-all"
                title="切換終端分屏佈局"
              >
                {activeTab.splitMode === 'single' && <Square className="w-3.5 h-3.5" />}
                {activeTab.splitMode === 'split-horizontal' && <Columns className="w-3.5 h-3.5 text-blue-400" />}
                {activeTab.splitMode === 'split-vertical' && <Rows className="w-3.5 h-3.5 text-blue-400" />}
                {activeTab.splitMode === 'grid-2x2' && <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />}
                <span className="hidden xl:inline">
                  {activeTab.splitMode === 'single' ? '單面板' :
                   activeTab.splitMode === 'split-horizontal' ? '水平分屏 (1x2)' :
                   activeTab.splitMode === 'split-vertical' ? '垂直分屏 (2x1)' : '四分屏 (2x2)'}
                </span>
              </button>

              {splitDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-card border border-border rounded-xl shadow-modal p-1.5 z-50 animate-fade-in space-y-0.5">
                  <div className="text-[10px] text-mutedDark font-semibold uppercase px-2 py-1 tracking-wider">
                    分屏佈局設定
                  </div>
                  <button
                    onClick={() => handleSplitSelect('single')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      activeTab.splitMode === 'single' ? 'bg-primary/20 text-primary-light font-medium' : 'text-slate-300 hover:bg-cardHover'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>單一面板 (Single)</span>
                  </button>

                  <button
                    onClick={() => handleSplitSelect('split-horizontal')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      activeTab.splitMode === 'split-horizontal' ? 'bg-primary/20 text-primary-light font-medium' : 'text-slate-300 hover:bg-cardHover'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>左右水平分屏 (1x2)</span>
                  </button>

                  <button
                    onClick={() => handleSplitSelect('split-vertical')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      activeTab.splitMode === 'split-vertical' ? 'bg-primary/20 text-primary-light font-medium' : 'text-slate-300 hover:bg-cardHover'
                    }`}
                  >
                    <Rows className="w-3.5 h-3.5" />
                    <span>上下垂直分屏 (2x1)</span>
                  </button>

                  <button
                    onClick={() => handleSplitSelect('grid-2x2')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      activeTab.splitMode === 'grid-2x2' ? 'bg-primary/20 text-primary-light font-medium' : 'text-slate-300 hover:bg-cardHover'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>四宮格分屏 (2x2)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Windows / Linux Frame Controls */}
        {((window as any).electronAPI?.platform !== 'darwin') && (
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <button
              onClick={() => handleWindowAction('minimize')}
              className="p-1.5 text-muted hover:text-white hover:bg-card rounded-lg transition-colors"
              title="最小化"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleWindowAction('maximize')}
              className="p-1.5 text-muted hover:text-white hover:bg-card rounded-lg transition-colors"
              title="最大化 / 還原"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleWindowAction('close')}
              className="p-1.5 text-muted hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
              title="關閉視窗"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
