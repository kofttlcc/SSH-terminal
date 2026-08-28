import { create } from 'zustand';
import { HostItem, SftpFileItem, SftpTransferItem } from '../types';
import { useAppStore } from './useAppStore';

interface SftpStoreState {
  connected: boolean;
  connecting: boolean;
  currentHost: HostItem | null;
  sessionId: string | null;

  // Remote pane
  remotePath: string;
  remoteFiles: SftpFileItem[];
  remoteLoading: boolean;
  selectedRemoteFiles: string[];

  // Local pane
  localPath: string;
  localFiles: SftpFileItem[];
  localLoading: boolean;
  selectedLocalFiles: string[];

  // Transfers
  transfers: SftpTransferItem[];
  showTransferQueue: boolean;

  // Actions
  connect: (host: HostItem) => Promise<void>;
  disconnect: () => Promise<void>;
  loadRemoteDir: (targetPath?: string) => Promise<void>;
  loadLocalDir: (targetPath?: string) => Promise<void>;
  uploadFile: (localFilename: string) => Promise<void>;
  uploadArbitraryFile: (fullSourcePath: string) => Promise<void>;
  downloadFile: (remoteFilename: string) => Promise<void>;
  deleteRemoteFile: (filename: string, isDirectory: boolean) => Promise<void>;
  createRemoteFolder: (folderName: string) => Promise<void>;
  deleteLocalFile: (filename: string, isDirectory: boolean) => Promise<void>;
  createLocalFolder: (folderName: string) => Promise<void>;
  revealLocalInFolder: (filename: string) => Promise<void>;
  openRemoteFileInEditor: (filename: string) => Promise<void>;
  saveRemoteFileContent: (remotePath: string, content: string) => Promise<boolean>;
  toggleTransferQueue: () => void;
  updateTransferProgress: (transferId: string, transferred: number, total: number, progress: number) => void;
}

export const useSftpStore = create<SftpStoreState>((set, get) => ({
  connected: false,
  connecting: false,
  currentHost: null,
  sessionId: null,

  remotePath: '/',
  remoteFiles: [],
  remoteLoading: false,
  selectedRemoteFiles: [],

  localPath: '',
  localFiles: [],
  localLoading: false,
  selectedLocalFiles: [],

  transfers: [],
  showTransferQueue: false,

  connect: async (host: HostItem) => {
    set({ connecting: true, currentHost: host });
    const sessionId = 'sftp-' + Date.now();

    try {
      if ((window as any).electronAPI?.sftp) {
        const res = await (window as any).electronAPI.sftp.connect(sessionId, host);
        if (res.success) {
          set({
            connected: true,
            connecting: false,
            sessionId,
            remotePath: res.currentDir || '/root'
          });
          useAppStore.getState().addToast('success', `已連線至 SFTP: ${host.label}`);
          await get().loadRemoteDir(res.currentDir || '/root');
          await get().loadLocalDir();
        } else {
          set({ connecting: false, connected: false });
          useAppStore.getState().addToast('error', `SFTP 連線失敗: ${res.error}`);
        }
      } else {
        // Mock connection for dev / browser mode
        set({
          connected: true,
          connecting: false,
          sessionId,
          remotePath: '/home/' + host.username,
          remoteFiles: [
            { name: '..', type: 'd', size: 0, modifyTime: Date.now(), accessTime: Date.now(), rights: { user: 'rwx', group: 'r-x', other: 'r-x' }, owner: 0, group: 0 },
            { name: 'nginx.conf', type: '-', size: 2450, modifyTime: Date.now() - 3600000, accessTime: Date.now(), rights: { user: 'rw-', group: 'r--', other: 'r--' }, owner: 0, group: 0 },
            { name: 'docker-compose.yml', type: '-', size: 1280, modifyTime: Date.now() - 7200000, accessTime: Date.now(), rights: { user: 'rw-', group: 'rw-', other: 'r--' }, owner: 0, group: 0 },
            { name: 'app_logs', type: 'd', size: 4096, modifyTime: Date.now() - 100000, accessTime: Date.now(), rights: { user: 'rwx', group: 'r-x', other: 'r-x' }, owner: 0, group: 0 },
            { name: '.env.production', type: '-', size: 890, modifyTime: Date.now() - 500000, accessTime: Date.now(), rights: { user: 'r--', group: '---', other: '---' }, owner: 0, group: 0 },
            { name: 'deploy.sh', type: '-', size: 3120, modifyTime: Date.now() - 200000, accessTime: Date.now(), rights: { user: 'rwx', group: 'r-x', other: 'r-x' }, owner: 0, group: 0 }
          ]
        });
        await get().loadLocalDir();
      }
    } catch (err: any) {
      set({ connecting: false, connected: false });
      useAppStore.getState().addToast('error', err.message || 'SFTP 連線異常');
    }
  },

  disconnect: async () => {
    const { sessionId } = get();
    if (sessionId && (window as any).electronAPI?.sftp) {
      await (window as any).electronAPI.sftp.disconnect(sessionId);
    }
    set({
      connected: false,
      connecting: false,
      sessionId: null,
      currentHost: null,
      remoteFiles: []
    });
  },

  loadRemoteDir: async (targetPath) => {
    const { sessionId, remotePath } = get();
    const p = targetPath || remotePath;
    set({ remoteLoading: true });

    try {
      if (sessionId && (window as any).electronAPI?.sftp) {
        const res = await (window as any).electronAPI.sftp.listRemote(sessionId, p);
        if (res.success) {
          set({
            remotePath: p,
            remoteFiles: res.files || [],
            remoteLoading: false
          });
        } else {
          useAppStore.getState().addToast('error', `讀取遠端目錄失敗: ${res.error}`);
          set({ remoteLoading: false });
        }
      } else {
        set({ remotePath: p, remoteLoading: false });
      }
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message);
      set({ remoteLoading: false });
    }
  },

  loadLocalDir: async (targetPath) => {
    set({ localLoading: true });
    try {
      if ((window as any).electronAPI?.sftp) {
        const res = await (window as any).electronAPI.sftp.listLocal(targetPath);
        if (res.success) {
          set({
            localPath: res.currentPath,
            localFiles: res.files || [],
            localLoading: false
          });
        } else {
          set({ localLoading: false });
        }
      } else {
        set({
          localPath: '/Users/demo/Projects',
          localLoading: false,
          localFiles: [
            { name: '..', type: 'd', size: 0, modifyTime: Date.now(), accessTime: Date.now(), rights: { user: 'rwx', group: 'r-x', other: 'r-x' }, owner: 0, group: 0 },
            { name: 'backup_2026.tar.gz', type: '-', size: 45200100, modifyTime: Date.now() - 5000000, accessTime: Date.now(), rights: { user: 'rw-', group: 'r--', other: 'r--' }, owner: 0, group: 0 },
            { name: 'config.json', type: '-', size: 4120, modifyTime: Date.now() - 100000, accessTime: Date.now(), rights: { user: 'rw-', group: 'r--', other: 'r--' }, owner: 0, group: 0 },
            { name: 'ssl_certificate.crt', type: '-', size: 2190, modifyTime: Date.now() - 300000, accessTime: Date.now(), rights: { user: 'rw-', group: 'r--', other: 'r--' }, owner: 0, group: 0 }
          ]
        });
      }
    } catch {
      set({ localLoading: false });
    }
  },

  uploadFile: async (localFilename) => {
    const { sessionId, localPath, remotePath } = get();
    if (!sessionId) {
      useAppStore.getState().addToast('warning', '請先點擊上方「連線 SFTP」按鈕連線至伺服器再進行上傳');
      return;
    }

    const source = `${localPath}/${localFilename}`;
    const target = `${remotePath}/${localFilename}`.replace('//', '/');
    const transferId = 'tr-' + Date.now();

    const newTransfer: SftpTransferItem = {
      id: transferId,
      filename: localFilename,
      sourcePath: source,
      targetPath: target,
      direction: 'upload',
      totalSize: 0,
      transferredSize: 0,
      status: 'transferring',
      speed: '計算中...',
      progress: 0,
      startedAt: Date.now()
    };

    set((state) => ({
      transfers: [newTransfer, ...state.transfers],
      showTransferQueue: true
    }));

    if ((window as any).electronAPI?.sftp) {
      const res = await (window as any).electronAPI.sftp.upload(sessionId, source, target, transferId);
      if (res.success) {
        set((state) => ({
          transfers: state.transfers.map((t) => (t.id === transferId ? { ...t, status: 'completed', progress: 100, completedAt: Date.now() } : t))
        }));
        useAppStore.getState().addToast('success', `已成功上傳: ${localFilename}`);
        await get().loadRemoteDir();
      } else {
        set((state) => ({
          transfers: state.transfers.map((t) => (t.id === transferId ? { ...t, status: 'failed', errorMessage: res.error } : t))
        }));
        useAppStore.getState().addToast('error', `上傳失敗: ${res.error}`);
      }
    }
  },

  uploadArbitraryFile: async (fullSourcePath: string) => {
    const { sessionId, remotePath } = get();
    if (!sessionId) {
      useAppStore.getState().addToast('warning', '請先點擊上方「連線 SFTP」按鈕連線至伺服器再進行上傳');
      return;
    }

    const filename = fullSourcePath.replace(/\\/g, '/').split('/').pop() || 'uploaded-file';
    const target = `${remotePath}/${filename}`.replace('//', '/');
    const transferId = 'tr-' + Date.now();

    const newTransfer: SftpTransferItem = {
      id: transferId,
      filename,
      sourcePath: fullSourcePath,
      targetPath: target,
      direction: 'upload',
      totalSize: 0,
      transferredSize: 0,
      status: 'transferring',
      speed: '計算中...',
      progress: 0,
      startedAt: Date.now()
    };

    set((state) => ({
      transfers: [newTransfer, ...state.transfers],
      showTransferQueue: true
    }));

    if ((window as any).electronAPI?.sftp) {
      const res = await (window as any).electronAPI.sftp.upload(sessionId, fullSourcePath, target, transferId);
      if (res.success) {
        set((state) => ({
          transfers: state.transfers.map((t) => (t.id === transferId ? { ...t, status: 'completed', progress: 100, completedAt: Date.now() } : t))
        }));
        useAppStore.getState().addToast('success', `已成功上傳: ${filename}`);
        await get().loadRemoteDir();
      } else {
        set((state) => ({
          transfers: state.transfers.map((t) => (t.id === transferId ? { ...t, status: 'failed', errorMessage: res.error } : t))
        }));
        useAppStore.getState().addToast('error', `上傳失敗: ${res.error}`);
      }
    }
  },

  downloadFile: async (remoteFilename) => {
    const { sessionId, localPath, remotePath } = get();
    if (!sessionId) {
      useAppStore.getState().addToast('warning', '請先點擊上方「連線 SFTP」按鈕連線至伺服器再進行下載');
      return;
    }

    const source = `${remotePath}/${remoteFilename}`.replace('//', '/');
    const target = `${localPath}/${remoteFilename}`;
    const transferId = 'tr-' + Date.now();

    const newTransfer: SftpTransferItem = {
      id: transferId,
      filename: remoteFilename,
      sourcePath: source,
      targetPath: target,
      direction: 'download',
      totalSize: 0,
      transferredSize: 0,
      status: 'transferring',
      speed: '計算中...',
      progress: 0,
      startedAt: Date.now()
    };

    set((state) => ({
      transfers: [newTransfer, ...state.transfers],
      showTransferQueue: true
    }));

    if ((window as any).electronAPI?.sftp) {
      const res = await (window as any).electronAPI.sftp.download(sessionId, source, target, transferId);
      if (res.success) {
        set((state) => ({
          transfers: state.transfers.map((t) => (t.id === transferId ? { ...t, status: 'completed', progress: 100, completedAt: Date.now() } : t))
        }));
        useAppStore.getState().addToast('success', `已成功下載: ${remoteFilename}`);
        await get().loadLocalDir();
      } else {
        set((state) => ({
          transfers: state.transfers.map((t) => (t.id === transferId ? { ...t, status: 'failed', errorMessage: res.error } : t))
        }));
        useAppStore.getState().addToast('error', `下載失敗: ${res.error}`);
      }
    }
  },

  deleteRemoteFile: async (filename, isDirectory) => {
    const { sessionId, remotePath } = get();
    if (!sessionId) return;
    const target = `${remotePath}/${filename}`.replace('//', '/');

    if ((window as any).electronAPI?.sftp) {
      const res = await (window as any).electronAPI.sftp.delete(sessionId, target, isDirectory);
      if (res.success) {
        useAppStore.getState().addToast('success', `已刪除遠端項目: ${filename}`);
        await get().loadRemoteDir();
      } else {
        useAppStore.getState().addToast('error', `刪除失敗: ${res.error}`);
      }
    }
  },

  createRemoteFolder: async (folderName) => {
    const { sessionId, remotePath } = get();
    if (!sessionId) return;
    const target = `${remotePath}/${folderName}`.replace('//', '/');

    if ((window as any).electronAPI?.sftp) {
      const res = await (window as any).electronAPI.sftp.mkdir(sessionId, target);
      if (res.success) {
        useAppStore.getState().addToast('success', `已建立遠端資料夾: ${folderName}`);
        await get().loadRemoteDir();
      } else {
        useAppStore.getState().addToast('error', `建立資料夾失敗: ${res.error}`);
      }
    }
  },

  deleteLocalFile: async (filename, isDirectory) => {
    const { localPath } = get();
    if (!localPath) return;
    const target = `${localPath}/${filename}`;

    if ((window as any).electronAPI?.sftp?.deleteLocal) {
      const res = await (window as any).electronAPI.sftp.deleteLocal(target, isDirectory);
      if (res.success) {
        useAppStore.getState().addToast('success', `已刪除本地項目: ${filename}`);
        await get().loadLocalDir();
      } else {
        useAppStore.getState().addToast('error', `刪除本地檔案失敗: ${res.error}`);
      }
    } else {
      useAppStore.getState().addToast('info', `已刪除: ${filename} (預覽模式)`);
    }
  },

  createLocalFolder: async (folderName) => {
    const { localPath } = get();
    if (!localPath) return;
    const target = `${localPath}/${folderName}`;

    if ((window as any).electronAPI?.sftp?.createLocalFolder) {
      const res = await (window as any).electronAPI.sftp.createLocalFolder(target);
      if (res.success) {
        useAppStore.getState().addToast('success', `已建立本機資料夾: ${folderName}`);
        await get().loadLocalDir();
      } else {
        useAppStore.getState().addToast('error', `建立本機資料夾失敗: ${res.error}`);
      }
    } else {
      useAppStore.getState().addToast('info', `已建立: ${folderName} (預覽模式)`);
    }
  },

  revealLocalInFolder: async (filename) => {
    const { localPath } = get();
    if (!localPath) return;
    const target = `${localPath}/${filename}`;

    if ((window as any).electronAPI?.sftp?.revealInFolder) {
      await (window as any).electronAPI.sftp.revealInFolder(target);
    }
  },

  openRemoteFileInEditor: async (filename) => {
    const { sessionId, remotePath } = get();
    if (!sessionId) return;
    const target = `${remotePath}/${filename}`.replace('//', '/');

    if ((window as any).electronAPI?.sftp) {
      const res = await (window as any).electronAPI.sftp.readRemoteFile(sessionId, target);
      if (res.success && res.content !== undefined) {
        useAppStore.getState().setFileEditorModal({
          sessionId,
          remotePath: target,
          filename,
          content: res.content
        });
      } else {
        useAppStore.getState().addToast('error', `開啟檔案失敗: ${res.error}`);
      }
    } else {
      useAppStore.getState().setFileEditorModal({
        sessionId: 'demo-session',
        remotePath: target,
        filename,
        content: '# 遠端配置檔案範例\n# ITGeek SSH 終端在線編輯\nserver_name localhost;\nlisten 80;\n\nlocation / {\n    proxy_pass http://127.0.0.1:3000;\n}\n'
      });
    }
  },

  saveRemoteFileContent: async (remotePath, content) => {
    const { sessionId } = get();
    if (!sessionId) return false;

    if ((window as any).electronAPI?.sftp) {
      const res = await (window as any).electronAPI.sftp.writeRemoteFile(sessionId, remotePath, content);
      if (res.success) {
        useAppStore.getState().addToast('success', `已儲存 ${remotePath.split('/').pop()}`);
        return true;
      } else {
        useAppStore.getState().addToast('error', `儲存失敗: ${res.error}`);
        return false;
      }
    }
    useAppStore.getState().addToast('success', '已儲存檔案（預覽模式）');
    return true;
  },

  toggleTransferQueue: () => {
    set((state) => ({ showTransferQueue: !state.showTransferQueue }));
  },

  updateTransferProgress: (transferId, transferred, total, progress) => {
    set((state) => ({
      transfers: state.transfers.map((t) => (t.id === transferId ? { ...t, transferredSize: transferred, totalSize: total, progress } : t))
    }));
  }
}));
