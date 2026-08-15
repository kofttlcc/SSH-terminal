import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Server, 
  Terminal, 
  Zap, 
  FolderSync, 
  Network, 
  KeyRound, 
  Settings, 
  Plus, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useVaultStore } from '../../stores/useVaultStore';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { HostItem, Snippet } from '../../types';

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveView, setQuickConnectOpen, setSnippetPrompt } = useAppStore();
  const { hosts, snippets } = useVaultStore();
  const { openHostTerminal, openLocalTerminal, openSftpTab } = useTerminalStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  // Filter items
  const filteredHosts = hosts.filter(
    (h) =>
      h.label.toLowerCase().includes(query.toLowerCase()) ||
      h.hostname.toLowerCase().includes(query.toLowerCase()) ||
      h.username.toLowerCase().includes(query.toLowerCase()) ||
      h.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.command.toLowerCase().includes(query.toLowerCase()) ||
      s.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const actions = [
    { id: 'quick-connect', title: '快速發起 SSH 連線', icon: Plus, action: () => { setCommandPaletteOpen(false); setQuickConnectOpen(true); } },
    { id: 'local-shell', title: '開啟本機 Shell 終端 (zsh/bash)', icon: Terminal, action: () => { setCommandPaletteOpen(false); openLocalTerminal(); } },
    { id: 'view-sftp', title: '開啟 SFTP 雙欄檔案管理器', icon: FolderSync, action: () => { setCommandPaletteOpen(false); setActiveView('sftp'); } },
    { id: 'view-tunnels', title: '管理 SSH 端口轉發隧道', icon: Network, action: () => { setCommandPaletteOpen(false); setActiveView('tunnels'); } },
    { id: 'view-keys', title: '管理 SSH 密鑰與身份憑證', icon: KeyRound, action: () => { setCommandPaletteOpen(false); setActiveView('keys'); } },
    { id: 'view-settings', title: '開啟偏好設定與主題', icon: Settings, action: () => { setCommandPaletteOpen(false); setActiveView('settings'); } },
  ];

  const filteredActions = actions.filter((a) => a.title.toLowerCase().includes(query.toLowerCase()));

  const handleSelectHost = (host: HostItem) => {
    setCommandPaletteOpen(false);
    openHostTerminal(host);
  };

  const handleSelectSnippet = (snippet: Snippet) => {
    setCommandPaletteOpen(false);
    setSnippetPrompt({ snippet });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div 
        className="w-full max-w-xl bg-card border border-border/80 rounded-2xl shadow-modal overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 bg-background/50">
          <Search className="w-5 h-5 text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="輸入指令、主機名稱、IP 或快捷指令..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-mutedDark focus:outline-none font-sans"
          />
          <kbd className="px-2 py-0.5 rounded bg-background border border-border/60 text-[10px] text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4 no-scrollbar">
          {/* Hosts Section */}
          {filteredHosts.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-mutedDark uppercase tracking-wider">
                主機列表 ({filteredHosts.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredHosts.map((host) => (
                  <div
                    key={host.id}
                    onClick={() => handleSelectHost(host)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cardHover cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-white flex items-center gap-2">
                          <span>{host.label}</span>
                          {host.tags?.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.2 rounded bg-background/80 text-muted font-normal">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="text-[11px] text-mutedDark font-mono">
                          {host.username}@{host.hostname}:{host.port || 22}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCommandPaletteOpen(false);
                          openSftpTab(host);
                        }}
                        className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-[10px] flex items-center gap-1"
                        title="開啟 SFTP"
                      >
                        <FolderSync className="w-3 h-3" />
                        <span>SFTP</span>
                      </button>
                      <button
                        onClick={() => handleSelectHost(host)}
                        className="px-2 py-1 rounded bg-primary hover:bg-primary-hover text-white text-[10px] flex items-center gap-1 font-medium"
                      >
                        <span>SSH 連線</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Snippets Section */}
          {filteredSnippets.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-mutedDark uppercase tracking-wider">
                快捷指令庫 ({filteredSnippets.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredSnippets.map((snip) => (
                  <div
                    key={snip.id}
                    onClick={() => handleSelectSnippet(snip)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cardHover cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300">
                          {snip.title}
                        </div>
                        <div className="text-[11px] text-mutedDark font-mono truncate max-w-sm">
                          {snip.command}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      執行
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions Section */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-mutedDark uppercase tracking-wider">
                快捷功能導航
              </div>
              <div className="space-y-1 mt-1">
                {filteredActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={item.action}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cardHover cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                          {item.title}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredHosts.length === 0 && filteredSnippets.length === 0 && filteredActions.length === 0 && (
            <div className="text-center py-8 text-mutedDark text-xs">
              查無相符的主機、指令或操作項目。
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-sidebar border-t border-border/40 flex items-center justify-between text-[11px] text-mutedDark">
          <span>使用 ↑ ↓ 方向鍵導航，按 Enter 確認開啟</span>
          <span className="font-mono">ITGeek 全域指令啟動器</span>
        </div>
      </div>
    </div>
  );
};
