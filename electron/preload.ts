import { contextBridge, ipcRenderer } from 'electron';
import { HostItem, AppVaultData, TunnelRule, HostFingerprintPrompt, KnownHostItem, SerialPortInfo } from '../src/types';

export const electronAPI = {
  // Terminal (SSH & Local)
  terminal: {
    connectSSH: (sessionId: string, host: HostItem, cols: number, rows: number, jumpHost?: HostItem) =>
      ipcRenderer.invoke('ssh:connect', { sessionId, host, cols, rows, jumpHost }),
    createLocalPty: (sessionId: string, customShell?: string, cwd?: string) =>
      ipcRenderer.invoke('localpty:create', { sessionId, customShell, cwd }),
    sendData: (sessionId: string, data: string, isLocal?: boolean) =>
      ipcRenderer.send(isLocal ? 'localpty:data' : 'ssh:data', { sessionId, data }),
    resize: (sessionId: string, cols: number, rows: number, isLocal?: boolean) =>
      ipcRenderer.send(isLocal ? 'localpty:resize' : 'ssh:resize', { sessionId, cols, rows }),
    closeSession: (sessionId: string, isLocal?: boolean) =>
      ipcRenderer.invoke(isLocal ? 'localpty:close' : 'ssh:close', { sessionId }),
    sendHostKeyDecision: (sessionId: string, decision: 'trust_always' | 'trust_once' | 'reject') =>
      ipcRenderer.invoke('ssh:host-key-decision', { sessionId, decision }),
    onHostKeyVerifyPrompt: (callback: (data: HostFingerprintPrompt) => void) => {
      const listener = (_: any, value: any) => callback(value);
      ipcRenderer.on('ssh:host-key-verify-prompt', listener);
      return () => ipcRenderer.removeListener('ssh:host-key-verify-prompt', listener);
    },
    onData: (callback: (data: { sessionId: string; data: string }) => void) => {
      const listener = (_: any, value: any) => callback(value);
      ipcRenderer.on('terminal:data', listener);
      return () => ipcRenderer.removeListener('terminal:data', listener);
    },
    onClosed: (callback: (data: { sessionId: string; code?: number }) => void) => {
      const listener = (_: any, value: any) => callback(value);
      ipcRenderer.on('terminal:closed', listener);
      return () => ipcRenderer.removeListener('terminal:closed', listener);
    },
    onError: (callback: (data: { sessionId: string; error: string }) => void) => {
      const listener = (_: any, value: any) => callback(value);
      ipcRenderer.on('terminal:error', listener);
      return () => ipcRenderer.removeListener('terminal:error', listener);
    },
    onPing: (callback: (data: { sessionId: string; ping: number }) => void) => {
      const listener = (_: any, value: any) => callback(value);
      ipcRenderer.on('terminal:ping', listener);
      return () => ipcRenderer.removeListener('terminal:ping', listener);
    },
    onYubiKeyTouchPrompt: (callback: (data: { sessionId: string; keyName: string; serial: string }) => void) => {
      const listener = (_: any, value: any) => callback(value);
      ipcRenderer.on('ssh:yubikey-touch-prompt', listener);
      return () => ipcRenderer.removeListener('ssh:yubikey-touch-prompt', listener);
    },
    confirmYubiKeyTouch: (sessionId: string) =>
      ipcRenderer.invoke('ssh:confirm-yubikey-touch', { sessionId }),
    cancelYubiKeyTouch: (sessionId: string) =>
      ipcRenderer.invoke('ssh:cancel-yubikey-touch', { sessionId })
  },

  // Serial Port (Console)
  serial: {
    listPorts: (): Promise<SerialPortInfo[]> => ipcRenderer.invoke('serial:listPorts'),
    create: (sessionId: string, config: any) => ipcRenderer.invoke('serial:create', { sessionId, config }),
    write: (sessionId: string, data: string) => ipcRenderer.send('serial:data', { sessionId, data }),
    close: (sessionId: string) => ipcRenderer.invoke('serial:close', { sessionId })
  },

  // YubiKey Hardware Security Keys
  yubikey: {
    listDevices: () => ipcRenderer.invoke('yubikey:listDevices'),
    writeKey: (options: any) => ipcRenderer.invoke('yubikey:writeKey', options),
    generateKey: (options: any) => ipcRenderer.invoke('yubikey:generateKey', options)
  },

  // Known Hosts & Host Fingerprints
  knownHosts: {
    getKnownHosts: (): Promise<KnownHostItem[]> =>
      ipcRenderer.invoke('knownHosts:get'),
    removeKnownHost: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('knownHosts:remove', { id })
  },

  // Biometrics (macOS Touch ID)
  biometrics: {
    canTouchID: (): Promise<boolean> =>
      ipcRenderer.invoke('biometrics:canTouchID'),
    promptTouchID: (reason?: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('biometrics:promptTouchID', reason)
  },

  // SFTP
  sftp: {
    connect: (sessionId: string, host: HostItem) =>
      ipcRenderer.invoke('sftp:connect', { sessionId, host }),
    listRemote: (sessionId: string, remotePath: string) =>
      ipcRenderer.invoke('sftp:listRemote', { sessionId, remotePath }),
    listLocal: (localPath?: string) =>
      ipcRenderer.invoke('sftp:listLocal', { localPath }),
    upload: (sessionId: string, localPath: string, remotePath: string, transferId: string) =>
      ipcRenderer.invoke('sftp:upload', { sessionId, localPath, remotePath, transferId }),
    download: (sessionId: string, remotePath: string, localPath: string, transferId: string) =>
      ipcRenderer.invoke('sftp:download', { sessionId, remotePath, localPath, transferId }),
    readRemoteFile: (sessionId: string, remotePath: string) =>
      ipcRenderer.invoke('sftp:readRemoteFile', { sessionId, remotePath }),
    writeRemoteFile: (sessionId: string, remotePath: string, content: string) =>
      ipcRenderer.invoke('sftp:writeRemoteFile', { sessionId, remotePath, content }),
    delete: (sessionId: string, remotePath: string, isDirectory: boolean) =>
      ipcRenderer.invoke('sftp:delete', { sessionId, remotePath, isDirectory }),
    mkdir: (sessionId: string, remotePath: string) =>
      ipcRenderer.invoke('sftp:mkdir', { sessionId, remotePath }),
    chmod: (sessionId: string, remotePath: string, mode: string | number) =>
      ipcRenderer.invoke('sftp:chmod', { sessionId, remotePath, mode }),
    rename: (sessionId: string, srcPath: string, dstPath: string) =>
      ipcRenderer.invoke('sftp:rename', { sessionId, srcPath, dstPath }),
    disconnect: (sessionId: string) =>
      ipcRenderer.invoke('sftp:disconnect', { sessionId }),
    onTransferProgress: (callback: (data: { transferId: string; transferredSize: number; totalSize: number; progress: number }) => void) => {
      const listener = (_: any, value: any) => callback(value);
      ipcRenderer.on('sftp:transfer-progress', listener);
      return () => ipcRenderer.removeListener('sftp:transfer-progress', listener);
    }
  },

  // Vault
  vault: {
    getVault: (): Promise<AppVaultData> => ipcRenderer.invoke('vault:get'),
    saveVault: (data: AppVaultData): Promise<boolean> => ipcRenderer.invoke('vault:save', data),
    exportVault: (masterKey?: string): Promise<string> => ipcRenderer.invoke('vault:export', masterKey),
    previewImport: (content: string, masterKey?: string): Promise<any> =>
      ipcRenderer.invoke('vault:previewImport', { content, masterKey }),
    importVault: (
      content: string, 
      masterKey?: string, 
      mode: 'merge' | 'overwrite' | 'selective' = 'merge', 
      selection?: any
    ): Promise<{ success: boolean; data?: AppVaultData; error?: string }> =>
      ipcRenderer.invoke('vault:import', { content, masterKey, mode, selection })
  },

  // Tunnels
  tunnel: {
    startTunnel: (rule: TunnelRule, host: HostItem) =>
      ipcRenderer.invoke('tunnel:start', { rule, host }),
    stopTunnel: (ruleId: string) =>
      ipcRenderer.invoke('tunnel:stop', { ruleId })
  },

  // Keygen
  keygen: {
    generateKeyPair: (name: string, type?: 'ed25519' | 'rsa', passphrase?: string) =>
      ipcRenderer.invoke('keygen:generate', { name, type, passphrase })
  },

  // Window Controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },

  // Dialogs
  dialog: {
    selectFile: (options?: any) => ipcRenderer.invoke('dialog:selectFile', options),
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    saveFile: (defaultName?: string) => ipcRenderer.invoke('dialog:saveFile', defaultName)
  },

  // App & Platform Information
  app: {
    getPlatform: (): Promise<string> => ipcRenderer.invoke('app:getPlatform')
  },
  platform: process.platform
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
