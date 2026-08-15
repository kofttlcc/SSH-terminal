import React from 'react';
import { 
  Server, 
  Terminal, 
  FolderSync, 
  Zap, 
  Network, 
  KeyRound, 
  Settings, 
  Plus, 
  Search,
  Radio
} from 'lucide-react';
import { useAppStore, MainViewType } from '../../stores/useAppStore';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { useVaultStore } from '../../stores/useVaultStore';

export const SidebarNav: React.FC = () => {
  const { activeView, setActiveView, setCommandPaletteOpen, setQuickConnectOpen } = useAppStore();
  const { tabs, openLocalTerminal } = useTerminalStore();
  const { hosts, snippets, tunnels, keys } = useVaultStore();

  const navItems = [
    { id: 'hosts', label: '主機管理', icon: Server, badge: hosts.length, countColor: 'bg-blue-500/20 text-blue-400' },
    { id: 'terminal', label: '終端會話', icon: Terminal, badge: tabs.length, countColor: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'sftp', label: 'SFTP 檔案', icon: FolderSync },
    { id: 'snippets', label: '快捷指令', icon: Zap, badge: snippets.length, countColor: 'bg-amber-500/20 text-amber-400' },
    { id: 'tunnels', label: '端口轉發', icon: Network, badge: tunnels.length },
    { id: 'keys', label: '密鑰金庫', icon: KeyRound, badge: keys.length },
    { id: 'settings', label: '偏好設定', icon: Settings }
  ];

  const isMac = (window as any).electronAPI?.platform === 'darwin' || (typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac'));

  return (
    <aside className="w-16 md:w-56 bg-sidebar border-r border-border flex flex-col justify-between flex-shrink-0 z-20 select-none">
      {/* Top Brand / Logo with platform-aware spacing (macOS traffic light safe spacing) */}
      <div className="flex flex-col">
        <div className={`${isMac ? 'pt-9' : 'pt-3.5'} pb-3.5 px-4 flex items-center justify-between border-b border-border/60 app-drag-region`}>
          <div className="flex items-center gap-3 app-no-drag">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-termiusCyan flex items-center justify-center shadow-glow-cyan text-slate-950 font-bold text-lg flex-shrink-0">
              <Terminal className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ITGeek SSH
              </span>
              <span className="text-[10px] text-mutedDark font-mono tracking-tight">
                itgeek-ssh v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Quick Connect & Search */}
        <div className="p-3 space-y-2 border-b border-border/40">
          <button
            onClick={() => setQuickConnectOpen(true)}
            className="w-full flex items-center justify-center md:justify-start gap-2.5 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/40 transition-all duration-150 group font-medium text-xs shadow-sm hover:shadow-glow"
            title="發起快速 SSH 連線"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
            <span className="hidden md:inline font-medium">快速直連</span>
          </button>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-card/60 hover:bg-card text-muted hover:text-slate-200 border border-border/40 text-xs transition-all"
            title={`全域指令面板 (${isMac ? 'Cmd+K' : 'Ctrl+K'})`}
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-xs">搜尋主機/指令...</span>
            </div>
            <kbd className="hidden md:inline text-[10px] bg-background/80 px-1.5 py-0.5 rounded border border-border/60 text-mutedDark font-mono">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as MainViewType)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-card/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span className="hidden md:inline">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`hidden md:inline-block px-1.5 py-0.2 rounded-full text-[10px] font-mono ${item.countColor || 'bg-card text-mutedDark'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Local Shell Quick Launcher */}
      <div className="p-3 border-t border-border/40 space-y-2">
        <button
          onClick={openLocalTerminal}
          className="w-full flex items-center justify-center md:justify-start gap-2.5 px-3 py-2 rounded-lg bg-card hover:bg-cardHover text-slate-300 hover:text-white border border-border text-xs transition-all"
          title={isMac ? '開啟本地 macOS 終端 (zsh)' : '開啟本地 Windows 終端 (PowerShell)'}
        >
          <Radio className="w-3.5 h-3.5 text-termiusCyan animate-pulse" />
          <span className="hidden md:inline font-mono text-[11px]">{isMac ? '本機 Shell (zsh)' : '本機 PowerShell'}</span>
        </button>

        <div className="hidden md:flex items-center justify-between text-[10px] text-mutedDark font-mono px-1">
          <span>金庫同步: 本機</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            加密保護
          </span>
        </div>
      </div>
    </aside>
  );
};
