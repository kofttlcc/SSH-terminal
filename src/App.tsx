import React, { useEffect } from 'react';
import { SidebarNav } from './components/layout/SidebarNav';
import { TopTabBar } from './components/layout/TopTabBar';
import { StatusBar } from './components/layout/StatusBar';
import { CommandPalette } from './components/layout/CommandPalette';
import { QuickConnectModal } from './components/hosts/QuickConnectModal';
import { HostFingerprintModal } from './components/terminal/HostFingerprintModal';
import { SyncTargetModal } from './components/terminal/SyncTargetModal';
import { TerminalContainer } from './components/terminal/TerminalContainer';
import { HostListView } from './components/hosts/HostListView';
import { SftpView } from './components/sftp/SftpView';
import { SnippetListView } from './components/snippets/SnippetListView';
import { TunnelListView } from './components/tunnels/TunnelListView';
import { KeyListView } from './components/keys/KeyListView';
import { SettingsView } from './components/settings/SettingsView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useVaultStore } from './stores/useVaultStore';
import { useTerminalStore } from './stores/useTerminalStore';
import { useAppStore } from './stores/useAppStore';
import { Terminal, Plus, Server, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const { loadVault, loaded } = useVaultStore();
  const { tabs, activeTabId, openLocalTerminal } = useTerminalStore();
  const { activeView, setActiveView, setQuickConnectOpen, toasts, removeToast, setHostKeyPrompt } = useAppStore();

  useEffect(() => {
    loadVault();

    // Listen for host fingerprint verification requests from SSH core
    if ((window as any).electronAPI?.terminal?.onHostKeyVerifyPrompt) {
      const unsub = (window as any).electronAPI.terminal.onHostKeyVerifyPrompt((prompt: any) => {
        setHostKeyPrompt(prompt);
      });
      return () => unsub?.();
    }
  }, [loadVault, setHostKeyPrompt]);

  const terminalTabs = tabs.filter((t) => t.type === 'terminal');
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden font-sans text-slate-100 antialiased">
      {/* Left Navigation Rail */}
      <SidebarNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Tab Bar */}
        <TopTabBar />

        {/* Dynamic Views Container */}
        <main className="flex-1 relative overflow-hidden bg-background">
          <ErrorBoundary fallbackTitle="終端與主機畫面載入異常">
            {/* Persistent Terminal Container (Keep-Alive: prevents session loss upon navigation) */}
            <div className={`h-full w-full ${activeView === 'terminal' ? 'block' : 'hidden'}`}>
              {terminalTabs.length > 0 ? (
                terminalTabs.map((tab) => (
                  <div 
                    key={tab.id}
                    className={`h-full w-full ${tab.id === activeTabId ? 'block' : 'hidden'}`}
                  >
                    <TerminalContainer tab={tab} />
                  </div>
                ))
              ) : (
                /* Empty Terminal State */
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 select-none">
                  <div className="w-16 h-16 rounded-3xl bg-card border border-border/80 flex items-center justify-center text-blue-400 mb-4 shadow-glow">
                    <Terminal className="w-8 h-8 text-termiusCyan" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-100">當前無活躍中的終端會話</h2>
                  <p className="text-xs text-mutedDark max-w-sm mt-1.5 leading-relaxed">
                    請從主機清單連線遠端伺服器，或發起快速直連與本機 Shell 會話開始工作。
                  </p>

                  <div className="flex items-center gap-3 mt-6">
                    <button
                      onClick={() => setActiveView('hosts')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-cardHover border border-border text-xs font-semibold text-slate-200 transition-all shadow-sm"
                    >
                      <Server className="w-3.5 h-3.5 text-blue-400" />
                      <span>檢視主機清單</span>
                    </button>

                    <button
                      onClick={openLocalTerminal}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>啟動本機 Shell</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {activeView === 'hosts' && <HostListView />}
            {activeView === 'sftp' && <SftpView />}
            {activeView === 'snippets' && <SnippetListView />}
            {activeView === 'tunnels' && <TunnelListView />}
            {activeView === 'keys' && <KeyListView />}
            {activeView === 'settings' && <SettingsView />}
          </ErrorBoundary>
        </main>

        {/* Bottom Status Bar */}
        <StatusBar />
      </div>

      {/* Global Command Palette & Modals */}
      <CommandPalette />
      <QuickConnectModal />
      <HostFingerprintModal />
      <SyncTargetModal />

      {/* Toast Notification Container */}
      <div className="fixed bottom-10 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-modal animate-fade-in text-xs font-medium cursor-pointer ${
              toast.type === 'success' ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300' :
              toast.type === 'error' ? 'bg-slate-900/95 border-rose-500/40 text-rose-300' :
              toast.type === 'warning' ? 'bg-slate-900/95 border-amber-500/40 text-amber-300' :
              'bg-slate-900/95 border-blue-500/40 text-blue-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
