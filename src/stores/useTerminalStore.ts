import { create } from 'zustand';
import { TerminalTab, TerminalPaneState, SplitMode, HostItem, SyncTargetScope, TargetSessionInfo } from '../types';
import { useAppStore } from './useAppStore';
import { useVaultStore } from './useVaultStore';

interface TerminalStoreState {
  tabs: TerminalTab[];
  activeTabId: string | null;

  // Xshell Compose & Multi-Terminal Sync State
  composeBarOpen: boolean;
  syncTargetScope: SyncTargetScope;
  customTargetSessionIds: string[];
  isGlobalKeystrokeSync: boolean;
  commandHistory: string[];
  targetPickerModalOpen: boolean;

  // Compose & Sync Actions
  setComposeBarOpen: (open: boolean) => void;
  toggleComposeBar: () => void;
  setSyncTargetScope: (scope: SyncTargetScope) => void;
  setCustomTargetSessionIds: (ids: string[]) => void;
  toggleGlobalKeystrokeSync: (enabled?: boolean) => void;
  setTargetPickerModalOpen: (open: boolean) => void;
  getAllActiveSessions: () => TargetSessionInfo[];
  getTargetSessions: () => TargetSessionInfo[];
  sendComposeCommand: (command: string, appendNewline?: boolean) => void;
  sendKeystrokeToTargets: (originSessionId: string, data: string) => void;

  // Tab management
  createTab: (title: string, type?: TerminalTab['type'], host?: HostItem, isLocal?: boolean) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setSplitMode: (tabId: string, mode: SplitMode) => void;
  toggleBroadcast: (tabId: string) => void;

  // Pane management
  addPane: (tabId: string, host?: HostItem, isLocal?: boolean) => string;
  closePane: (tabId: string, paneId: string) => void;
  setActivePane: (tabId: string, paneId: string) => void;
  updatePaneState: (paneId: string, updates: Partial<TerminalPaneState>) => void;

  // High-level triggers
  openHostTerminal: (host: HostItem) => void;
  openLocalTerminal: () => void;
  openSftpTab: (host: HostItem) => void;
}

export const useTerminalStore = create<TerminalStoreState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  // Multi-terminal Sync & Compose State
  composeBarOpen: false,
  syncTargetScope: 'current-tab',
  customTargetSessionIds: [],
  isGlobalKeystrokeSync: false,
  commandHistory: [],
  targetPickerModalOpen: false,

  setComposeBarOpen: (open) => set({ composeBarOpen: open }),
  toggleComposeBar: () => set((state) => ({ composeBarOpen: !state.composeBarOpen })),

  setSyncTargetScope: (scope) => {
    set({ syncTargetScope: scope });
    if (scope === 'custom') {
      const all = get().getAllActiveSessions();
      const currentCustom = get().customTargetSessionIds;
      if (currentCustom.length === 0) {
        set({ customTargetSessionIds: all.map((s) => s.sessionId) });
      }
    }
  },

  setCustomTargetSessionIds: (ids) => set({ customTargetSessionIds: ids }),
  toggleGlobalKeystrokeSync: (enabled) =>
    set((state) => ({
      isGlobalKeystrokeSync: enabled !== undefined ? enabled : !state.isGlobalKeystrokeSync
    })),

  setTargetPickerModalOpen: (open) => set({ targetPickerModalOpen: open }),

  getAllActiveSessions: () => {
    const { tabs } = get();
    const sessions: TargetSessionInfo[] = [];

    tabs.forEach((tab) => {
      if (tab.type !== 'terminal') return;
      tab.panes.forEach((pane) => {
        if (pane.sessionId) {
          sessions.push({
            sessionId: pane.sessionId,
            paneId: pane.paneId,
            tabId: tab.id,
            tabTitle: tab.title,
            paneTitle: pane.title,
            hostId: pane.hostId,
            hostLabel: pane.hostLabel || pane.host?.label,
            isLocal: pane.isLocal,
            isSerial: pane.host?.protocol === 'serial',
            ping: pane.ping,
            status: pane.status
          });
        }
      });
    });

    return sessions;
  },

  getTargetSessions: () => {
    const { tabs, activeTabId, syncTargetScope, customTargetSessionIds } = get();
    const all = get().getAllActiveSessions();

    if (syncTargetScope === 'all') {
      return all;
    }

    if (syncTargetScope === 'current-tab') {
      return all.filter((s) => s.tabId === activeTabId);
    }

    if (syncTargetScope === 'current-pane') {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return [];
      return all.filter((s) => s.tabId === activeTabId && s.paneId === activeTab.activePaneId);
    }

    if (syncTargetScope === 'custom') {
      return all.filter((s) => customTargetSessionIds.includes(s.sessionId));
    }

    return all;
  },

  sendComposeCommand: (command, appendNewline = true) => {
    if (!command) return;
    const targets = get().getTargetSessions();
    if (targets.length === 0) {
      useAppStore.getState().addToast('warning', '當前無可同步的終端會話');
      return;
    }

    const payload = appendNewline ? (command.endsWith('\n') || command.endsWith('\r') ? command : command + '\r') : command;

    targets.forEach((t) => {
      if (t.isSerial && (window as any).electronAPI?.serial) {
        (window as any).electronAPI.serial.write(t.sessionId, payload);
      } else if ((window as any).electronAPI?.terminal) {
        (window as any).electronAPI.terminal.sendData(t.sessionId, payload, t.isLocal);
      }
    });

    // Update history
    set((state) => {
      const filtered = state.commandHistory.filter((c) => c !== command);
      return {
        commandHistory: [command, ...filtered].slice(0, 50)
      };
    });

    useAppStore.getState().addToast('info', `已將指令同步發送至 ${targets.length} 個終端會話`);
  },

  sendKeystrokeToTargets: (originSessionId, data) => {
    const targets = get().getTargetSessions();
    targets.forEach((t) => {
      if (t.sessionId === originSessionId) {
        // Send to origin session
        if (t.isSerial && (window as any).electronAPI?.serial) {
          (window as any).electronAPI.serial.write(t.sessionId, data);
        } else if ((window as any).electronAPI?.terminal) {
          (window as any).electronAPI.terminal.sendData(t.sessionId, data, t.isLocal);
        }
      } else {
        // Broadcast to other targets in real-time!
        if (t.isSerial && (window as any).electronAPI?.serial) {
          (window as any).electronAPI.serial.write(t.sessionId, data);
        } else if ((window as any).electronAPI?.terminal) {
          (window as any).electronAPI.terminal.sendData(t.sessionId, data, t.isLocal);
        }
      }
    });
  },

  createTab: (title, type = 'terminal', host, isLocal = false) => {
    const tabId = 'tab-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const paneId = 'pane-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);

    const initialPane: TerminalPaneState = {
      paneId,
      title: host ? host.label : (isLocal ? '本機 Shell' : title),
      hostId: host?.id,
      host,
      hostLabel: host?.label,
      hostColor: host?.color,
      isLocal,
      status: 'idle'
    };

    const newTab: TerminalTab = {
      id: tabId,
      title,
      type,
      hostId: host?.id,
      splitMode: 'single',
      panes: [initialPane],
      activePaneId: paneId,
      broadcast: false
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: tabId
    }));

    useAppStore.getState().setActiveView('terminal');
    return tabId;
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const tabToClose = tabs.find((t) => t.id === tabId);

    // Close sessions for all panes in this tab
    if (tabToClose) {
      tabToClose.panes.forEach((pane) => {
        if (pane.sessionId) {
          if (pane.host?.protocol === 'serial' && (window as any).electronAPI?.serial) {
            (window as any).electronAPI.serial.close(pane.sessionId);
          } else if ((window as any).electronAPI?.terminal) {
            (window as any).electronAPI.terminal.closeSession(pane.sessionId, pane.isLocal);
          }
        }
      });
    }

    const filtered = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;

    if (activeTabId === tabId) {
      nextActiveId = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
    }

    set({
      tabs: filtered,
      activeTabId: nextActiveId
    });

    if (filtered.length === 0) {
      useAppStore.getState().setActiveView('hosts');
    }
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
    const tab = get().tabs.find((t) => t.id === tabId);
    if (tab) {
      useAppStore.getState().setActiveView(tab.type === 'sftp' ? 'sftp' : 'terminal');
    }
  },

  setSplitMode: (tabId, mode) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;

        let panes = [...tab.panes];
        const targetCount = mode === 'single' ? 1 : mode === 'grid-2x2' ? 4 : 2;

        if (panes.length > targetCount) {
          panes = panes.slice(0, targetCount);
        } else if (panes.length < targetCount) {
          while (panes.length < targetCount) {
            const newPaneId = 'pane-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
            panes.push({
              paneId: newPaneId,
              title: tab.panes[0]?.title || 'Terminal',
              hostId: tab.panes[0]?.hostId,
              host: tab.panes[0]?.host,
              hostLabel: tab.panes[0]?.hostLabel,
              hostColor: tab.panes[0]?.hostColor,
              isLocal: tab.panes[0]?.isLocal,
              status: 'idle'
            });
          }
        }

        return {
          ...tab,
          splitMode: mode,
          panes
        };
      })
    }));
  },

  toggleBroadcast: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, broadcast: !tab.broadcast } : tab))
    }));
  },

  addPane: (tabId, host, isLocal = false) => {
    const paneId = 'pane-' + Date.now();
    const newPane: TerminalPaneState = {
      paneId,
      title: host ? host.label : (isLocal ? 'Local Shell' : 'Terminal'),
      hostId: host?.id,
      host,
      hostLabel: host?.label,
      hostColor: host?.color,
      isLocal,
      status: 'idle'
    };

    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        const newPanes = [...tab.panes, newPane];
        const newSplitMode = newPanes.length === 2 ? 'split-horizontal' : tab.splitMode;
        return {
          ...tab,
          panes: newPanes,
          splitMode: newSplitMode,
          activePaneId: paneId
        };
      })
    }));

    return paneId;
  },

  closePane: (tabId, paneId) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const paneToClose = tab.panes.find((p) => p.paneId === paneId);
    if (paneToClose?.sessionId) {
      if (paneToClose.host?.protocol === 'serial' && (window as any).electronAPI?.serial) {
        (window as any).electronAPI.serial.close(paneToClose.sessionId);
      } else if ((window as any).electronAPI?.terminal) {
        (window as any).electronAPI.terminal.closeSession(paneToClose.sessionId, paneToClose.isLocal);
      }
    }

    if (tab.panes.length <= 1) {
      get().closeTab(tabId);
      return;
    }

    const remainingPanes = tab.panes.filter((p) => p.paneId !== paneId);
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          panes: remainingPanes,
          activePaneId: remainingPanes[0].paneId,
          splitMode: remainingPanes.length === 1 ? 'single' : t.splitMode
        };
      })
    }));
  },

  setActivePane: (tabId, paneId) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, activePaneId: paneId } : t))
    }));
  },

  updatePaneState: (paneId, updates) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => ({
        ...tab,
        panes: tab.panes.map((pane) => (pane.paneId === paneId ? { ...pane, ...updates } : pane))
      }))
    }));
  },

  openHostTerminal: async (host) => {
    const { settings, promptTouchId, canTouchId, keys } = useVaultStore.getState();
    
    // In hybrid mode or yubikey mode, SSH service manages the adaptive touch/fingerprint sequence dynamically
    if (host.authType !== 'hybrid' && host.authType !== 'yubikey') {
      const selectedKey = host.keyId ? keys.find((k) => k.id === host.keyId) : null;
      const isKeyTouchId = host.touchIdForKey || selectedKey?.touchIdProtected;

      if (isKeyTouchId) {
        const ok = await promptTouchId(`正在調用 SSH 私鑰「${selectedKey?.name || host.label}」認證伺服器，請按壓指紋`);
        if (!ok) {
          useAppStore.getState().addToast('warning', '私鑰 Touch ID 指紋認證未通過，已取消連線');
          return;
        }
      } else if ((host.requireTouchId || settings.touchIdForHosts) && canTouchId) {
        const ok = await promptTouchId(`連線至「${host.label}」需要進行 Touch ID 指紋識別授權`);
        if (!ok) {
          useAppStore.getState().addToast('warning', 'Touch ID 指紋識別未通過，已取消連線');
          return;
        }
      }
    } else if ((host.requireTouchId || settings.touchIdForHosts) && canTouchId && host.authType !== 'hybrid') {
      const ok = await promptTouchId(`連線至「${host.label}」需要進行 Touch ID 指紋識別授權`);
      if (!ok) {
        useAppStore.getState().addToast('warning', 'Touch ID 指紋識別未通過，已取消連線');
        return;
      }
    }

    get().createTab(host.label, 'terminal', host, false);
    useAppStore.getState().setActiveView('terminal');
  },

  openLocalTerminal: () => {
    get().createTab('本機 Shell', 'terminal', undefined, true);
    useAppStore.getState().setActiveView('terminal');
  },

  openSftpTab: async (host) => {
    const { settings, promptTouchId, canTouchId, keys } = useVaultStore.getState();

    if (host.authType !== 'hybrid' && host.authType !== 'yubikey') {
      const selectedKey = host.keyId ? keys.find((k) => k.id === host.keyId) : null;
      const isKeyTouchId = host.touchIdForKey || selectedKey?.touchIdProtected;

      if (isKeyTouchId) {
        const ok = await promptTouchId(`正在調用 SSH 私鑰「${selectedKey?.name || host.label}」存取 SFTP，請按壓指紋`);
        if (!ok) {
          useAppStore.getState().addToast('warning', '私鑰 Touch ID 指紋認證未通過，已取消連線');
          return;
        }
      } else if ((host.requireTouchId || settings.touchIdForHosts) && canTouchId) {
        const ok = await promptTouchId(`開啟「${host.label}」SFTP 需要進行 Touch ID 指紋識別授權`);
        if (!ok) {
          useAppStore.getState().addToast('warning', 'Touch ID 指紋識別未通過，已取消連線');
          return;
        }
      }
    }

    get().createTab(`SFTP: ${host.label}`, 'sftp', host, false);
    useAppStore.getState().setActiveView('terminal');
  }
}));
