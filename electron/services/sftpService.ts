import SftpClient from 'ssh2-sftp-client';
import { Client as SSHClient, ConnectConfig } from 'ssh2';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BrowserWindow } from 'electron';
import { HostItem, SftpFileItem } from '../../src/types';
import { KeygenService } from './keygenService';
import { VaultService } from './vaultService';
import { YubikeyService } from './yubikeyService';

export interface SftpSession {
  sessionId: string;
  client: SftpClient;
  jumpClient?: SSHClient;
  host: HostItem;
}

export class SftpService {
  private sessions: Map<string, SftpSession> = new Map();

  constructor(public vaultService?: VaultService) {}

  public async connect(
    sessionId: string,
    host: HostItem
  ): Promise<{ success: boolean; error?: string; currentDir?: string }> {
    try {
      const sftp = new SftpClient();
      const config: any = {
        host: host.hostname,
        port: host.port || 22,
        username: host.username,
        readyTimeout: 25000,
        keepaliveInterval: 15000,
        keepaliveCountMax: 3
      };

      if (host.authType === 'password' && host.password) {
        config.password = host.password;
      } else {
        // Private Key, YubiKey, or Key file authentication
        let rawKey = host.privateKey;
        let passphrase = host.passphrase;

        const targetKeyId = host.authType === 'yubikey' ? (host.yubikeyKeyId || host.keyId) : host.keyId;

        if (!rawKey && targetKeyId && this.vaultService) {
          const vData = this.vaultService.getVaultData();
          const foundKey = vData.keys?.find((k) => k.id === targetKeyId);
          if (foundKey) {
            rawKey = foundKey.privateKey;
            if (!passphrase) passphrase = foundKey.passphrase;
          }
        }

        // If still no rawKey but user configured password fallback
        if (!rawKey && host.password) {
          config.password = host.password;
        } else if (rawKey) {
          rawKey = YubikeyService.extractRawKey(rawKey);
          const normalized = KeygenService.normalizePrivateKey(rawKey, passphrase);
          config.privateKey = normalized || rawKey;
          if (passphrase) {
            config.passphrase = passphrase;
          }
        }
      }

      let jumpClient: SSHClient | undefined;

      // Handle Jump Host / Bastion Proxy if configured
      if (host.jumpHostId && this.vaultService) {
        const vData = this.vaultService.getVaultData();
        const jumpHost = vData.hosts?.find((h) => h.id === host.jumpHostId);
        if (jumpHost) {
          const jumpCfg: ConnectConfig = {
            host: jumpHost.hostname,
            port: jumpHost.port || 22,
            username: jumpHost.username,
            readyTimeout: 20000
          };

          if (jumpHost.authType === 'password' && jumpHost.password) {
            jumpCfg.password = jumpHost.password;
          } else {
            let jKey = jumpHost.privateKey;
            let jPass = jumpHost.passphrase;
            const jKeyId = jumpHost.authType === 'yubikey' ? (jumpHost.yubikeyKeyId || jumpHost.keyId) : jumpHost.keyId;
            if (!jKey && jKeyId) {
              const fKey = vData.keys?.find((k) => k.id === jKeyId);
              if (fKey) {
                jKey = fKey.privateKey;
                if (!jPass) jPass = fKey.passphrase;
              }
            }
            if (jKey) {
              jKey = YubikeyService.extractRawKey(jKey);
              const normalized = KeygenService.normalizePrivateKey(jKey, jPass);
              jumpCfg.privateKey = normalized || jKey;
              if (jPass) jumpCfg.passphrase = jPass;
            }
          }

          jumpClient = await new Promise<SSHClient>((res, rej) => {
            const jc = new SSHClient();
            jc.on('ready', () => res(jc));
            jc.on('error', (err) => rej(err));
            jc.connect(jumpCfg);
          });

          const stream = await new Promise<any>((res, rej) => {
            jumpClient!.forwardOut('127.0.0.1', 12345, host.hostname, host.port || 22, (err, s) => {
              if (err) rej(err);
              else res(s);
            });
          });

          config.sock = stream;
        }
      }

      await sftp.connect(config);
      this.sessions.set(sessionId, { sessionId, client: sftp, jumpClient, host });

      const realPath = await sftp.realPath('.');
      return { success: true, currentDir: realPath || '/root' };
    } catch (err: any) {
      console.error('SFTP connection failed:', err);
      return { success: false, error: err.message || 'SFTP connection failed' };
    }
  }

  public async listRemote(sessionId: string, remotePath: string): Promise<{ success: boolean; currentPath?: string; files?: SftpFileItem[]; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'SFTP session not found' };
    }
    try {
      const target = remotePath || '/';
      const list = await session.client.list(target);
      const files: SftpFileItem[] = [];

      if (target !== '/') {
        files.push({
          name: '..',
          type: 'd',
          size: 0,
          modifyTime: Date.now(),
          accessTime: Date.now(),
          rights: { user: 'rwx', group: 'r-x', other: 'r-x' },
          owner: 0,
          group: 0
        });
      }

      for (const item of list) {
        if (item.name === '.' || item.name === '..') continue;
        files.push({
          name: item.name,
          type: item.type as any,
          size: item.size,
          modifyTime: item.modifyTime,
          accessTime: item.accessTime,
          rights: item.rights,
          owner: item.owner,
          group: item.group,
          isLink: item.type === 'l'
        });
      }

      files.sort((a, b) => {
        if (a.name === '..') return -1;
        if (b.name === '..') return 1;
        if (a.type === 'd' && b.type !== 'd') return -1;
        if (a.type !== 'd' && b.type === 'd') return 1;
        return a.name.localeCompare(b.name);
      });

      return { success: true, currentPath: target, files };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async listLocal(localPath?: string): Promise<{ success: boolean; currentPath?: string; files?: SftpFileItem[]; error?: string }> {
    try {
      let resolved = !localPath || localPath === '' || localPath === '~'
        ? os.homedir()
        : (localPath.startsWith('~') ? path.join(os.homedir(), localPath.slice(1)) : path.resolve(localPath));

      if (!fs.existsSync(resolved)) {
        resolved = os.homedir();
      }

      const parsedRoot = path.parse(resolved).root;
      const isRoot = resolved === parsedRoot || resolved === '/' || (process.platform === 'win32' && /^[a-zA-Z]:\\?$/.test(resolved));

      const entries = fs.readdirSync(resolved, { withFileTypes: true });
      const files: SftpFileItem[] = [];

      if (!isRoot) {
        files.push({
          name: '..',
          type: 'd',
          size: 0,
          modifyTime: Date.now(),
          accessTime: Date.now(),
          rights: { user: 'rwx', group: 'r-x', other: 'r-x' },
          owner: 0,
          group: 0
        });
      }

      for (const entry of entries) {
        const fullPath = path.join(resolved, entry.name);
        try {
          const stat = fs.statSync(fullPath);
          files.push({
            name: entry.name,
            type: entry.isDirectory() ? 'd' : entry.isSymbolicLink() ? 'l' : '-',
            size: stat.size,
            modifyTime: Math.floor(stat.mtimeMs),
            accessTime: Math.floor(stat.atimeMs),
            rights: { user: 'rwx', group: 'r-x', other: 'r-x' },
            owner: stat.uid || 0,
            group: stat.gid || 0,
            isLink: entry.isSymbolicLink()
          });
        } catch {
          files.push({
            name: entry.name,
            type: entry.isDirectory() ? 'd' : '-',
            size: 0,
            modifyTime: Date.now(),
            accessTime: Date.now(),
            rights: { user: 'rwx', group: 'r-x', other: 'r-x' },
            owner: 0,
            group: 0
          });
        }
      }

      files.sort((a, b) => {
        if (a.name === '..') return -1;
        if (b.name === '..') return 1;
        if (a.type === 'd' && b.type !== 'd') return -1;
        if (a.type !== 'd' && b.type === 'd') return 1;
        return a.name.localeCompare(b.name);
      });

      return { success: true, currentPath: resolved, files };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async upload(
    sessionId: string,
    localPath: string,
    remotePath: string,
    transferId: string,
    win: BrowserWindow
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'SFTP session not found' };

    try {
      const resolvedLocal = localPath.startsWith('~')
        ? path.join(os.homedir(), localPath.slice(1))
        : path.resolve(localPath);

      const totalSize = fs.statSync(resolvedLocal).size;
      let lastPercent = 0;

      await session.client.fastPut(resolvedLocal, remotePath, {
        step: (totalTransferred) => {
          const progress = totalSize > 0 ? (totalTransferred / totalSize) * 100 : 100;
          if (progress - lastPercent >= 5 || progress >= 100) {
            lastPercent = progress;
            if (!win.isDestroyed()) {
              win.webContents.send('sftp:transfer-progress', {
                transferId,
                progress: Math.min(100, Math.round(progress)),
                transferred: totalTransferred
              });
            }
          }
        }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async download(
    sessionId: string,
    remotePath: string,
    localPath: string,
    transferId: string,
    win: BrowserWindow
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'SFTP session not found' };

    try {
      const resolvedLocal = localPath.startsWith('~')
        ? path.join(os.homedir(), localPath.slice(1))
        : path.resolve(localPath);

      const stat = await session.client.stat(remotePath);
      const totalSize = stat.size;
      let lastPercent = 0;

      await session.client.fastGet(remotePath, resolvedLocal, {
        step: (totalTransferred) => {
          const progress = totalSize > 0 ? (totalTransferred / totalSize) * 100 : 100;
          if (progress - lastPercent >= 5 || progress >= 100) {
            lastPercent = progress;
            if (!win.isDestroyed()) {
              win.webContents.send('sftp:transfer-progress', {
                transferId,
                progress: Math.min(100, Math.round(progress)),
                transferred: totalTransferred
              });
            }
          }
        }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async delete(sessionId: string, remotePath: string, isDirectory: boolean): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'SFTP session not found' };

    try {
      if (isDirectory) {
        await session.client.rmdir(remotePath, true);
      } else {
        await session.client.delete(remotePath);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async mkdir(sessionId: string, remotePath: string): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'SFTP session not found' };

    try {
      await session.client.mkdir(remotePath, true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async readRemoteFile(sessionId: string, remotePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'SFTP session not found' };

    try {
      const buffer = await session.client.get(remotePath);
      return { success: true, content: buffer.toString('utf-8') };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async writeRemoteFile(sessionId: string, remotePath: string, content: string): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'SFTP session not found' };

    try {
      await session.client.put(Buffer.from(content, 'utf-8'), remotePath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async chmod(sessionId: string, remotePath: string, mode: number | string): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'SFTP session not found' };

    try {
      await session.client.chmod(remotePath, mode);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async rename(sessionId: string, srcPath: string, dstPath: string): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'SFTP session not found' };

    try {
      await session.client.rename(srcPath, dstPath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async disconnect(sessionId: string): Promise<{ success: boolean }> {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        await session.client.end();
      } catch {}
      try {
        session.jumpClient?.end();
      } catch {}
      this.sessions.delete(sessionId);
    }
    return { success: true };
  }

  public async disconnectAll(): Promise<void> {
    for (const [sessionId, session] of this.sessions) {
      try {
        await session.client.end();
      } catch {}
      try {
        session.jumpClient?.end();
      } catch {}
    }
    this.sessions.clear();
  }
}
