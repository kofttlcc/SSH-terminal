import { create } from 'zustand';
import { AppVaultData, HostItem, HostGroup, Snippet, TunnelRule, SSHKeyItem, KnownHostItem, TerminalSettings } from '../types';

interface VaultState {
  loaded: boolean;
  hosts: HostItem[];
  groups: HostGroup[];
  snippets: Snippet[];
  tunnels: TunnelRule[];
  keys: SSHKeyItem[];
  knownHosts: KnownHostItem[];
  settings: TerminalSettings;
  canTouchId: boolean;

  loadVault: () => Promise<void>;
  saveVault: () => Promise<void>;

  // Biometrics & Touch ID
  checkTouchId: () => Promise<boolean>;
  promptTouchId: (reason?: string) => Promise<boolean>;

  // Known Hosts methods
  loadKnownHosts: () => Promise<void>;
  removeKnownHost: (id: string) => Promise<void>;

  // Host methods
  addHost: (host: Omit<HostItem, 'id' | 'createdAt'>) => Promise<HostItem>;
  updateHost: (id: string, host: Partial<HostItem>) => Promise<void>;
  deleteHost: (id: string) => Promise<void>;

  // Group methods
  addGroup: (group: Omit<HostGroup, 'id'>) => Promise<HostGroup>;
  deleteGroup: (id: string) => Promise<void>;

  // Snippet methods
  addSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt'>) => Promise<Snippet>;
  updateSnippet: (id: string, snippet: Partial<Snippet>) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;

  // Tunnel methods
  addTunnel: (tunnel: Omit<TunnelRule, 'id' | 'createdAt' | 'status'>) => Promise<TunnelRule>;
  updateTunnel: (id: string, tunnel: Partial<TunnelRule>) => Promise<void>;
  deleteTunnel: (id: string) => Promise<void>;
  toggleTunnel: (id: string) => Promise<void>;

  // Key methods
  addKey: (key: SSHKeyItem) => Promise<void>;
  deleteKey: (id: string) => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<TerminalSettings>) => Promise<void>;
}

const DEFAULT_SETTINGS: TerminalSettings = {
  theme: 'itgeek',
  fontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace',
  fontSize: 14,
  lineHeight: 1.25,
  letterSpacing: 0,
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 5000,
  copyOnSelect: true,
  bellSound: false,
  localShell: '/bin/zsh',
  renderMode: 'dom',
  touchIdEnabled: false,
  touchIdForHosts: false
};

export const useVaultStore = create<VaultState>((set, get) => ({
  loaded: false,
  hosts: [],
  groups: [],
  snippets: [],
  tunnels: [],
  keys: [],
  knownHosts: [],
  settings: DEFAULT_SETTINGS,
  canTouchId: false,

  checkTouchId: async () => {
    try {
      if ((window as any).electronAPI?.biometrics) {
        const can = await (window as any).electronAPI.biometrics.canTouchID();
        set({ canTouchId: can });
        return can;
      }
    } catch {}
    set({ canTouchId: false });
    return false;
  },

  promptTouchId: async (reason) => {
    try {
      if ((window as any).electronAPI?.biometrics) {
        const res = await (window as any).electronAPI.biometrics.promptTouchID(reason);
        return res.success;
      }
    } catch {}
    return true; // Fallback in browser demo
  },

  loadKnownHosts: async () => {
    try {
      if ((window as any).electronAPI?.knownHosts) {
        const list = await (window as any).electronAPI.knownHosts.getKnownHosts();
        set({ knownHosts: list || [] });
      }
    } catch (err) {
      console.error('Failed to load known hosts:', err);
    }
  },

  removeKnownHost: async (id) => {
    try {
      if ((window as any).electronAPI?.knownHosts) {
        await (window as any).electronAPI.knownHosts.removeKnownHost(id);
        set((state) => ({
          knownHosts: state.knownHosts.filter((k) => k.id !== id)
        }));
      }
    } catch (err) {
      console.error('Failed to remove known host:', err);
    }
  },

  loadVault: async () => {
    try {
      if ((window as any).electronAPI?.vault) {
        const data: AppVaultData = await (window as any).electronAPI.vault.getVault();
        set({
          loaded: true,
          hosts: data.hosts || [],
          groups: data.groups || [],
          snippets: data.snippets || [],
          tunnels: data.tunnels || [],
          keys: data.keys || [],
          settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) }
        });
      } else {
        // Fallback for browser testing
        set({ loaded: true });
      }
      await get().checkTouchId();
      await get().loadKnownHosts();
    } catch (err) {
      console.error('Failed to load vault in renderer:', err);
      set({ loaded: true });
    }
  },

  saveVault: async () => {
    const { hosts, groups, snippets, tunnels, keys, settings } = get();
    const data: AppVaultData = {
      version: 1,
      hosts,
      groups,
      snippets,
      tunnels,
      keys,
      settings
    };

    if ((window as any).electronAPI?.vault) {
      await (window as any).electronAPI.vault.saveVault(data);
    }
  },

  addHost: async (hostData) => {
    const newHost: HostItem = {
      ...hostData,
      id: 'host-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now()
    };
    set((state) => ({ hosts: [...state.hosts, newHost] }));
    await get().saveVault();
    return newHost;
  },

  updateHost: async (id, updates) => {
    set((state) => ({
      hosts: state.hosts.map((h) => (h.id === id ? { ...h, ...updates } : h))
    }));
    await get().saveVault();
  },

  deleteHost: async (id) => {
    set((state) => ({
      hosts: state.hosts.filter((h) => h.id !== id)
    }));
    await get().saveVault();
  },

  addGroup: async (groupData) => {
    const newGroup: HostGroup = {
      ...groupData,
      id: 'group-' + Date.now()
    };
    set((state) => ({ groups: [...state.groups, newGroup] }));
    await get().saveVault();
    return newGroup;
  },

  deleteGroup: async (id) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      hosts: state.hosts.map((h) => (h.group === id ? { ...h, group: undefined } : h))
    }));
    await get().saveVault();
  },

  addSnippet: async (snippetData) => {
    const newSnippet: Snippet = {
      ...snippetData,
      id: 'snip-' + Date.now(),
      createdAt: Date.now()
    };
    set((state) => ({ snippets: [...state.snippets, newSnippet] }));
    await get().saveVault();
    return newSnippet;
  },

  updateSnippet: async (id, updates) => {
    set((state) => ({
      snippets: state.snippets.map((s) => (s.id === id ? { ...s, ...updates } : s))
    }));
    await get().saveVault();
  },

  deleteSnippet: async (id) => {
    set((state) => ({
      snippets: state.snippets.filter((s) => s.id !== id)
    }));
    await get().saveVault();
  },

  addTunnel: async (tunnelData) => {
    const newTunnel: TunnelRule = {
      ...tunnelData,
      id: 'tun-' + Date.now(),
      status: 'inactive',
      createdAt: Date.now()
    };
    set((state) => ({ tunnels: [...state.tunnels, newTunnel] }));
    await get().saveVault();
    return newTunnel;
  },

  updateTunnel: async (id, updates) => {
    set((state) => ({
      tunnels: state.tunnels.map((t) => (t.id === id ? { ...t, ...updates } : t))
    }));
    await get().saveVault();
  },

  deleteTunnel: async (id) => {
    set((state) => ({
      tunnels: state.tunnels.filter((t) => t.id !== id)
    }));
    await get().saveVault();
  },

  toggleTunnel: async (id) => {
    const tunnel = get().tunnels.find((t) => t.id === id);
    if (!tunnel) return;
    const host = get().hosts.find((h) => h.id === tunnel.hostId);
    if (!host) return;

    if (tunnel.status === 'active') {
      if ((window as any).electronAPI?.tunnel) {
        await (window as any).electronAPI.tunnel.stopTunnel(tunnel.id);
      }
      get().updateTunnel(id, { status: 'inactive', enabled: false, errorMessage: undefined });
    } else {
      if ((window as any).electronAPI?.tunnel) {
        const res = await (window as any).electronAPI.tunnel.startTunnel(tunnel, host);
        if (res.success) {
          get().updateTunnel(id, { status: 'active', enabled: true, errorMessage: undefined });
        } else {
          get().updateTunnel(id, { status: 'error', enabled: false, errorMessage: res.error });
        }
      } else {
        get().updateTunnel(id, { status: 'active', enabled: true });
      }
    }
  },

  addKey: async (key) => {
    set((state) => ({ keys: [...state.keys, key] }));
    await get().saveVault();
  },

  deleteKey: async (id) => {
    set((state) => ({
      keys: state.keys.filter((k) => k.id !== id)
    }));
    await get().saveVault();
  },

  updateSettings: async (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }));
    await get().saveVault();
  }
}));
