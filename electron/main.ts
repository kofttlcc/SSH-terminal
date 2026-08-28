import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SSHService } from './services/sshService';
import { SftpService } from './services/sftpService';
import { LocalPtyService } from './services/localPtyService';
import { TunnelService } from './services/tunnelService';
import { VaultService } from './services/vaultService';
import { KeygenService } from './services/keygenService';
import { KnownHostsService } from './services/knownHostsService';
import { BiometricsService } from './services/biometricsService';
import { AgentService } from './services/agentService';
import { YubikeyService } from './services/yubikeyService';
import { SerialService } from './services/serialService';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Disable security warnings in dev
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let mainWindow: BrowserWindow | null = null;

const vaultService = new VaultService();
const knownHostsService = new KnownHostsService();
const biometricsService = new BiometricsService();
const yubikeyService = new YubikeyService();
const serialService = new SerialService();
const agentService = new AgentService(vaultService, biometricsService);
const sshService = new SSHService(knownHostsService, vaultService, agentService, yubikeyService, biometricsService);
const sftpService = new SftpService(vaultService, yubikeyService, biometricsService);
const localPtyService = new LocalPtyService();
const tunnelService = new TunnelService();

function createMenu() {
  const isMac = process.platform === 'darwin';
  const template: any[] = [
    ...(isMac
      ? [
          {
            label: 'ITGeek SSH',
            submenu: [
              { label: '關於 ITGeek SSH', role: 'about' },
              { type: 'separator' },
              { label: '服務', role: 'services' },
              { type: 'separator' },
              { label: '隱藏 ITGeek SSH', role: 'hide' },
              { label: '隱藏其他', role: 'hideOthers' },
              { label: '顯示全部', role: 'unhide' },
              { type: 'separator' },
              { label: '結束 ITGeek SSH', role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: '編輯',
      submenu: [
        { label: '復原', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪下', role: 'cut' },
        { label: '複製', role: 'copy' },
        { label: '貼上', role: 'paste' },
        { label: '全選', role: 'selectAll' }
      ]
    },
    {
      label: '檢視',
      submenu: [
        { label: '重新載入', role: 'reload' },
        { label: '強制重新載入', role: 'forceReload' },
        { label: '切換開發者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '重設縮放', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '縮小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切換全螢幕', role: 'togglefullscreen' }
      ]
    },
    {
      label: '視窗',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '縮放', role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { label: '前置全部視窗', role: 'front' }, { type: 'separator' }, { label: '視窗', role: 'window' }]
          : [{ label: '關閉視窗', role: 'close' }])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const isMac = process.platform === 'darwin';

  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#090a0f',
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    frame: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  createMenu();

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    sshService.closeAll();
    sftpService.disconnectAll();
    localPtyService.closeAll();
    tunnelService.stopAll();
    serialService.closeAll();
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  sshService.closeAll();
  sftpService.disconnectAll();
  localPtyService.closeAll();
  tunnelService.stopAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==================== SSH IPC Handlers ====================
ipcMain.handle('ssh:connect', async (_, { sessionId, host, cols, rows, jumpHost }) => {
  if (!mainWindow) return { success: false, error: 'Window not ready' };
  return await sshService.connect(sessionId, host, mainWindow, cols, rows, jumpHost);
});

ipcMain.on('ssh:data', (_, { sessionId, data }) => {
  sshService.write(sessionId, data);
});

ipcMain.on('ssh:resize', (_, { sessionId, cols, rows }) => {
  sshService.resize(sessionId, cols, rows);
});

ipcMain.handle('ssh:close', (_, { sessionId }) => {
  sshService.close(sessionId);
  return { success: true };
});

ipcMain.handle('ssh:host-key-decision', async (_, { sessionId, decision }) => {
  sshService.handleHostKeyDecision(sessionId, decision);
  return { success: true };
});

ipcMain.handle('ssh:confirm-yubikey-touch', async (_, { sessionId }) => {
  sshService.confirmTouch(sessionId, true);
  return { success: true };
});

ipcMain.handle('ssh:cancel-yubikey-touch', async (_, { sessionId }) => {
  sshService.confirmTouch(sessionId, false);
  return { success: true };
});

// ==================== Known Hosts IPC Handlers ====================
ipcMain.handle('knownHosts:get', async () => {
  return knownHostsService.getKnownHosts();
});

ipcMain.handle('knownHosts:remove', async (_, { id }) => {
  return knownHostsService.removeKnownHost(id);
});

// ==================== Biometrics (Touch ID) IPC Handlers ====================
ipcMain.handle('biometrics:canTouchID', async () => {
  return biometricsService.canPromptTouchID();
});

ipcMain.handle('biometrics:promptTouchID', async (_, reason) => {
  return await biometricsService.promptTouchID(reason);
});

// ==================== Local PTY IPC Handlers ====================
ipcMain.handle('localpty:create', async (_, { sessionId, customShell, cwd }) => {
  if (!mainWindow) return { success: false, error: 'Window not ready' };
  return localPtyService.createSession(sessionId, mainWindow, customShell, cwd);
});

ipcMain.on('localpty:data', (_, { sessionId, data }) => {
  localPtyService.write(sessionId, data);
});

ipcMain.on('localpty:resize', (_, { sessionId, cols, rows }) => {
  localPtyService.resize(sessionId, cols, rows);
});

ipcMain.handle('localpty:close', (_, { sessionId }) => {
  localPtyService.close(sessionId);
  return { success: true };
});

// ==================== Serial (串口) IPC Handlers ====================
ipcMain.handle('serial:listPorts', async () => {
  return await serialService.listPorts();
});

ipcMain.handle('serial:create', async (_, { sessionId, config }) => {
  if (!mainWindow) return { success: false, error: 'Window not ready' };
  return await serialService.createSession(sessionId, mainWindow, config);
});

ipcMain.on('serial:data', (_, { sessionId, data }) => {
  serialService.write(sessionId, data);
});

ipcMain.handle('serial:close', (_, { sessionId }) => {
  serialService.closeSession(sessionId);
  return { success: true };
});

// ==================== SFTP IPC Handlers ====================
ipcMain.handle('sftp:connect', async (_, { sessionId, host }) => {
  return await sftpService.connect(sessionId, host);
});

ipcMain.handle('sftp:listRemote', async (_, { sessionId, remotePath }) => {
  return await sftpService.listRemote(sessionId, remotePath);
});

ipcMain.handle('sftp:listLocal', async (_, { localPath }) => {
  return await sftpService.listLocal(localPath);
});

ipcMain.handle('sftp:upload', async (_, { sessionId, localPath, remotePath, transferId }) => {
  if (!mainWindow) return { success: false, error: 'Window not ready' };
  return await sftpService.upload(sessionId, localPath, remotePath, transferId, mainWindow);
});

ipcMain.handle('sftp:download', async (_, { sessionId, remotePath, localPath, transferId }) => {
  if (!mainWindow) return { success: false, error: 'Window not ready' };
  return await sftpService.download(sessionId, remotePath, localPath, transferId, mainWindow);
});

ipcMain.handle('sftp:readRemoteFile', async (_, { sessionId, remotePath }) => {
  return await sftpService.readRemoteFile(sessionId, remotePath);
});

ipcMain.handle('sftp:writeRemoteFile', async (_, { sessionId, remotePath, content }) => {
  return await sftpService.writeRemoteFile(sessionId, remotePath, content);
});

ipcMain.handle('sftp:delete', async (_, { sessionId, remotePath, isDirectory }) => {
  return await sftpService.delete(sessionId, remotePath, isDirectory);
});

ipcMain.handle('sftp:mkdir', async (_, { sessionId, remotePath }) => {
  return await sftpService.mkdir(sessionId, remotePath);
});

ipcMain.handle('sftp:chmod', async (_, { sessionId, remotePath, mode }) => {
  return await sftpService.chmod(sessionId, remotePath, mode);
});

ipcMain.handle('sftp:rename', async (_, { sessionId, srcPath, dstPath }) => {
  return await sftpService.rename(sessionId, srcPath, dstPath);
});

ipcMain.handle('sftp:disconnect', async (_, { sessionId }) => {
  await sftpService.disconnect(sessionId);
  return { success: true };
});

ipcMain.handle('sftp:deleteLocal', async (_, { localPath, isDirectory }) => {
  try {
    if (fs.existsSync(localPath)) {
      if (isDirectory) {
        fs.rmSync(localPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(localPath);
      }
      return { success: true };
    }
    return { success: false, error: '檔案或資料夾不存在' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sftp:createLocalFolder', async (_, { localPath }) => {
  try {
    fs.mkdirSync(localPath, { recursive: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sftp:revealInFolder', async (_, { localPath }) => {
  try {
    if (fs.existsSync(localPath)) {
      shell.showItemInFolder(localPath);
      return { success: true };
    }
    return { success: false, error: '檔案或目錄不存在' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// ==================== Vault IPC Handlers ====================
ipcMain.handle('vault:get', async () => {
  return vaultService.getVaultData();
});

ipcMain.handle('vault:save', async (_, data) => {
  return vaultService.saveVaultData(data);
});

ipcMain.handle('vault:export', async (_, masterKey) => {
  return vaultService.exportVault(masterKey);
});

ipcMain.handle('vault:previewImport', async (_, { content, masterKey }) => {
  return vaultService.previewImport(content, masterKey);
});

ipcMain.handle('vault:import', async (_, { content, masterKey, mode, selection }) => {
  return vaultService.importVault(content, masterKey, mode, selection);
});

// ==================== Tunnel IPC Handlers ====================
ipcMain.handle('tunnel:start', async (_, { rule, host }) => {
  return await tunnelService.startTunnel(rule, host);
});

ipcMain.handle('tunnel:stop', async (_, { ruleId }) => {
  tunnelService.stopTunnel(ruleId);
  return { success: true };
});

// ==================== Keygen IPC Handlers ====================
ipcMain.handle('keygen:generate', async (_, { name, type, passphrase }) => {
  return KeygenService.generateKeyPair(name, type, passphrase);
});

// ==================== Window IPC Handlers ====================
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() || false;
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

// ==================== Dialog IPC Handlers ====================
ipcMain.handle('dialog:selectFile', async (_, options) => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    ...options
  });
  return res.filePaths[0] || null;
});

ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  return res.filePaths[0] || null;
});

ipcMain.handle('dialog:saveFile', async (_, defaultName) => {
  if (!mainWindow) return null;
  const res = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'vault_backup.json'
  });
  return res.filePath || null;
});

// ==================== YubiKey IPC Handlers ====================
ipcMain.handle('yubikey:listDevices', async () => {
  return yubikeyService.listDevices();
});

ipcMain.handle('yubikey:writeKey', async (_, options) => {
  return yubikeyService.writeKeyToYubikey(options);
});

ipcMain.handle('yubikey:generateKey', async (_, options) => {
  return yubikeyService.generateKeyOnYubikey(options);
});
