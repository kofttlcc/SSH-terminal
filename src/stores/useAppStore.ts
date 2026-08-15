import { create } from 'zustand';
import { Snippet, HostFingerprintPrompt } from '../types';

export type MainViewType = 'hosts' | 'terminal' | 'sftp' | 'snippets' | 'tunnels' | 'keys' | 'settings';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface AppState {
  activeView: MainViewType;
  setActiveView: (view: MainViewType) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  quickConnectOpen: boolean;
  setQuickConnectOpen: (open: boolean) => void;

  snippetPrompt: {
    snippet: Snippet;
    targetPaneId?: string;
    onExecute?: (renderedCommand: string) => void;
  } | null;
  setSnippetPrompt: (prompt: AppState['snippetPrompt']) => void;

  fileEditorModal: {
    sessionId: string;
    remotePath: string;
    filename: string;
    content: string;
  } | null;
  setFileEditorModal: (data: AppState['fileEditorModal']) => void;

  hostKeyPrompt: HostFingerprintPrompt | null;
  setHostKeyPrompt: (prompt: HostFingerprintPrompt | null) => void;

  toasts: ToastNotification[];
  addToast: (type: ToastNotification['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeView: 'hosts',
  setActiveView: (view) => set({ activeView: view }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  quickConnectOpen: false,
  setQuickConnectOpen: (open) => set({ quickConnectOpen: open }),

  snippetPrompt: null,
  setSnippetPrompt: (prompt) => set({ snippetPrompt: prompt }),

  fileEditorModal: null,
  setFileEditorModal: (data) => set({ fileEditorModal: data }),

  hostKeyPrompt: null,
  setHostKeyPrompt: (prompt) => set({ hostKeyPrompt: prompt }),

  toasts: [],
  addToast: (type, message) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const toast: ToastNotification = { id, type, message };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}));
