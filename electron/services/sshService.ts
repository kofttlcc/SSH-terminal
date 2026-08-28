import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import { BrowserWindow } from 'electron';
import { HostItem } from '../../src/types';
import { KnownHostsService } from './knownHostsService';
import { KeygenService } from './keygenService';
import { VaultService } from './vaultService';
import { AgentService } from './agentService';
import { YubikeyService } from './yubikeyService';
import { BiometricsService } from './biometricsService';

export interface SSHSession {
  sessionId: string;
  client: Client;
  channel?: ClientChannel;
  host: HostItem;
  pingInterval?: NodeJS.Timeout;
}

function parseKeyType(key: Buffer): string {
  try {
    if (key.length >= 4) {
      const typeLen = key.readUInt32BE(0);
      if (typeLen > 0 && typeLen <= 64 && key.length >= 4 + typeLen) {
        return key.subarray(4, 4 + typeLen).toString('ascii');
      }
    }
  } catch {}
  return 'ssh-key';
}

export class SSHService {
  private sessions: Map<string, SSHSession> = new Map();
  private pendingVerifications: Map<string, (accept: boolean) => void> = new Map();
  private pendingHostInfo: Map<string, {
    hostname: string;
    port: number;
    keyType: string;
    fingerprint: string;
    visualArt?: string;
  }> = new Map();
  private touchResolvers: Map<string, (approved: boolean) => void> = new Map();

  constructor(
    public knownHostsService: KnownHostsService,
    public vaultService?: VaultService,
    public agentService?: AgentService,
    public yubikeyService?: YubikeyService,
    public biometricsService?: BiometricsService
  ) {}

  public confirmTouch(sessionId: string, approved: boolean) {
    const resolve = this.touchResolvers.get(sessionId);
    if (resolve) {
      resolve(approved);
      this.touchResolvers.delete(sessionId);
    }
  }

  private promptYubiKeyTouch(sessionId: string, win: BrowserWindow, keyName: string, serial: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.touchResolvers.set(sessionId, resolve);
      if (!win.isDestroyed()) {
        win.webContents.send('ssh:yubikey-touch-prompt', { sessionId, keyName, serial });
      }
      setTimeout(() => {
        if (this.touchResolvers.has(sessionId)) {
          this.touchResolvers.delete(sessionId);
          resolve(false);
        }
      }, 30000);
    });
  }

  public handleHostKeyDecision(sessionId: string, decision: 'trust_always' | 'trust_once' | 'reject') {
    const cb = this.pendingVerifications.get(sessionId);
    const info = this.pendingHostInfo.get(sessionId);

    this.pendingVerifications.delete(sessionId);
    this.pendingHostInfo.delete(sessionId);

    if (!cb) return;

    if (decision === 'trust_always') {
      if (info) {
        this.knownHostsService.addKnownHost(
          info.hostname,
          info.port,
          info.keyType,
          info.fingerprint,
          info.visualArt
        );
      }
      cb(true);
    } else if (decision === 'trust_once') {
      cb(true);
    } else {
      cb(false);
    }
  }

  public async connect(
    sessionId: string,
    host: HostItem,
    win: BrowserWindow,
    cols: number = 80,
    rows: number = 24,
    jumpHostConfig?: HostItem
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise(async (resolve) => {
      try {
        const client = new Client();

        const config: ConnectConfig = {
          host: host.hostname,
          port: host.port || 22,
          username: host.username,
          keepaliveInterval: host.keepaliveInterval || 15000,
          keepaliveCountMax: host.keepaliveCountMax || 3,
          readyTimeout: 20000,
          hostVerifier: (key: Buffer, verify: (accept: boolean) => void) => {
            const keyType = parseKeyType(key);
            const result = this.knownHostsService.verifyKey(host.hostname, host.port || 22, keyType, key);

            if (result.status === 'trusted') {
              verify(true);
              return;
            }

            // Unknown host key or mismatch -> Request user decision
            this.pendingVerifications.set(sessionId, verify);
            this.pendingHostInfo.set(sessionId, {
              hostname: host.hostname,
              port: host.port || 22,
              keyType,
              fingerprint: result.fingerprint,
              visualArt: result.visualArt
            });

            if (!win.isDestroyed()) {
              win.webContents.send('ssh:host-key-verify-prompt', {
                sessionId,
                hostname: host.hostname,
                port: host.port || 22,
                keyType,
                fingerprint: result.fingerprint,
                visualArt: result.visualArt,
                isMismatch: result.status === 'mismatch',
                expectedFingerprint: result.expectedFingerprint
              });
            }
          }
        };

        if (host.authType === 'password' && host.password) {
          config.password = host.password;
        } else if (host.authType === 'hybrid') {
          // Dual-Mode: Touch ID Fingerprint & YubiKey Adaptive
          const vData = this.vaultService ? this.vaultService.getVaultData() : { keys: [] };
          const allKeys = vData.keys || [];

          const touchIdKeyId = host.keyId || host.fallbackKeyId;
          const yubikeyKeyId = host.yubikeyKeyId;

          const foundTouchKey = allKeys.find((k) => k.id === touchIdKeyId) || allKeys.find((k) => k.touchIdProtected && !k.storageType?.includes('yubikey'));
          const foundYubikey = allKeys.find((k) => k.id === yubikeyKeyId) || allKeys.find((k) => k.storageType?.includes('yubikey') || k.privateKey?.includes('YUBIKEY'));

          const yubiDevs = this.yubikeyService?.listDevices() || [];
          const yubiAvailable = yubiDevs.length > 0 && !!foundYubikey;
          const preferTouch = host.hybridPreferred === 'touchid';

          let selectedActiveKey: any = null;
          let requireTouchAuth = false;

          if (yubiAvailable && !preferTouch) {
            if (!win.isDestroyed()) {
              win.webContents.send('terminal:data', {
                sessionId,
                data: `\r\n\x1b[36m[ITGeek 雙模認證]\x1b[0m 偵測到 YubiKey 硬體 (${yubiDevs[0].model || 'YubiKey'})，請觸摸 YubiKey 金屬電極進行授權...\r\n`
              });
            }
            const approved = await this.promptYubiKeyTouch(sessionId, win, foundYubikey.name, yubiDevs[0].serial);
            if (approved) {
              selectedActiveKey = foundYubikey;
            } else {
              if (!win.isDestroyed()) {
                win.webContents.send('terminal:data', {
                  sessionId,
                  data: `\r\n\x1b[33m[ITGeek 雙模認證]\x1b[0m YubiKey 未觸控或已取消，自動切換至 Touch ID 指紋識別...\r\n`
                });
              }
              selectedActiveKey = foundTouchKey;
              requireTouchAuth = true;
            }
          } else {
            // YubiKey not available or user preferred Touch ID -> MUST REQUIRE TOUCH ID FINGERPRINT
            if (!win.isDestroyed()) {
              win.webContents.send('terminal:data', {
                sessionId,
                data: `\r\n\x1b[35m[ITGeek 雙模認證]\x1b[0m ${yubiAvailable ? '優先啟用' : '未檢測到 YubiKey，已自動啟用'} Touch ID 指紋密鑰「${foundTouchKey?.name || '本地密鑰'}」，請按壓指紋授權...\r\n`
              });
            }
            selectedActiveKey = foundTouchKey || foundYubikey;
            requireTouchAuth = true;
          }

          if (!selectedActiveKey) {
            resolve({ success: false, error: '未找到雙模認證所需的有效 SSH 金鑰' });
            return;
          }

          // Enforce Touch ID authentication strictly if falling back to Touch ID key
          if (requireTouchAuth || selectedActiveKey.touchIdProtected) {
            if (this.biometricsService && this.biometricsService.canPromptTouchID()) {
              const bioRes = await this.biometricsService.promptTouchID(
                `正在調用 SSH 私鑰「${selectedActiveKey.name || host.label}」認證伺服器，請按壓指紋`
              );
              if (!bioRes || !bioRes.success) {
                if (!win.isDestroyed()) {
                  win.webContents.send('terminal:data', {
                    sessionId,
                    data: `\r\n\x1b[31m[ITGeek 雙模認證]\x1b[0m Touch ID 指紋識別未授權或已取消，連線已終止。\r\n`
                  });
                }
                resolve({ success: false, error: bioRes?.error || 'Touch ID 指紋識別未通過，連線已終止' });
                return;
              }
            }
          }

          let raw = YubikeyService.extractRawKey(selectedActiveKey.privateKey);
          const normalized = KeygenService.normalizePrivateKey(raw, selectedActiveKey.passphrase) || raw;
          config.privateKey = normalized;
          if (selectedActiveKey.passphrase) config.passphrase = selectedActiveKey.passphrase;
        } else if (host.authType === 'privateKey' || host.authType === 'yubikey') {
          let rawKey = host.privateKey;
          let passphrase = host.passphrase;
          const targetKeyId = host.yubikeyKeyId || host.keyId;

          if ((!rawKey || host.authType === 'yubikey') && targetKeyId && this.vaultService) {
            const vData = this.vaultService.getVaultData();
            const foundKey = vData.keys?.find((k) => k.id === targetKeyId);
            if (foundKey) {
              rawKey = foundKey.privateKey;
              if (!passphrase) passphrase = foundKey.passphrase;

              if (foundKey.storageType === 'yubikey_piv' || foundKey.storageType === 'yubikey_fido2' || host.authType === 'yubikey') {
                const devs = this.yubikeyService?.listDevices() || [];
                if (devs.length === 0) {
                  // YubiKey not present -> Check if host has configured fallbackKeyId
                  if (host.fallbackKeyId) {
                    const fallbackKey = vData.keys?.find((k) => k.id === host.fallbackKeyId);
                    if (fallbackKey) {
                      if (!win.isDestroyed()) {
                        win.webContents.send('terminal:data', {
                          sessionId,
                          data: `\r\n\x1b[33m[ITGeek SSH]\x1b[0m 未偵測到 YubiKey 硬體，自動切換至備用密鑰「\x1b[36m${fallbackKey.name}\x1b[0m」進行連線...\r\n`
                        });
                      }

                      // Require Touch ID for fallback key if protected
                      if (fallbackKey.touchIdProtected && this.biometricsService && this.biometricsService.canPromptTouchID()) {
                        const bioRes = await this.biometricsService.promptTouchID(
                          `正在調用備用 SSH 私鑰「${fallbackKey.name}」認證伺服器，請按壓指紋`
                        );
                        if (!bioRes || !bioRes.success) {
                          if (!win.isDestroyed()) {
                            win.webContents.send('terminal:data', {
                              sessionId,
                              data: `\r\n\x1b[31m[ITGeek SSH]\x1b[0m 指紋識別未通過或已取消，連線已終止。\r\n`
                            });
                          }
                          resolve({ success: false, error: 'Touch ID 指紋識別未通過，已取消連線' });
                          return;
                        }
                      }

                      rawKey = fallbackKey.privateKey;
                      passphrase = fallbackKey.passphrase;
                    } else {
                      resolve({ success: false, error: '未偵測到 YubiKey 硬體設備，請插入 YubiKey 後重試' });
                      return;
                    }
                  } else {
                    resolve({ success: false, error: '未偵測到 YubiKey 硬體設備，請將 YubiKey 插入電腦 USB 埠後再試 (或在主機設定中配置備用指紋密鑰)' });
                    return;
                  }
                } else {
                  const approved = await this.promptYubiKeyTouch(sessionId, win, foundKey.name, devs[0].serial);
                  if (!approved) {
                    resolve({ success: false, error: 'YubiKey 物理觸摸認證已取消或超時' });
                    return;
                  }
                }
              } else if (foundKey.touchIdProtected || host.touchIdForKey) {
                // Regular private key with Touch ID protection
                if (this.biometricsService && this.biometricsService.canPromptTouchID()) {
                  const bioRes = await this.biometricsService.promptTouchID(
                    `正在調用 SSH 私鑰「${foundKey.name || host.label}」認證伺服器，請按壓指紋`
                  );
                  if (!bioRes || !bioRes.success) {
                    if (!win.isDestroyed()) {
                      win.webContents.send('terminal:data', {
                        sessionId,
                        data: `\r\n\x1b[31m[ITGeek SSH]\x1b[0m 指紋識別未通過或已取消，連線已終止。\r\n`
                      });
                    }
                    resolve({ success: false, error: 'Touch ID 指紋識別未通過，已取消連線' });
                    return;
                  }
                }
              }
            }
          }

          if (rawKey) {
            rawKey = YubikeyService.extractRawKey(rawKey);
            const normalized = KeygenService.normalizePrivateKey(rawKey, passphrase);
            config.privateKey = normalized || rawKey;
            if (passphrase) {
              config.passphrase = passphrase;
            }
          }
        }

        // Enable SSH Agent Forwarding with Touch ID support if agentService is available
        if (this.agentService) {
          const sockPath = this.agentService.getSocketPath();
          if (sockPath) {
            config.agent = sockPath;
            if (host.agentForward !== false) {
              config.agentForward = true;
            }
          }
        }

        const handleReady = () => {
          client.shell({
            term: 'xterm-256color',
            cols,
            rows
          }, (err, stream) => {
            if (err) {
              client.end();
              resolve({ success: false, error: err.message });
              return;
            }

            const session: SSHSession = {
              sessionId,
              client,
              channel: stream,
              host
            };

            // Setup ping interval
            session.pingInterval = setInterval(() => {
              const start = Date.now();
              // SSH Ping via keepalive
              (client as any).ping?.(() => {
                const latency = Date.now() - start;
                if (!win.isDestroyed()) {
                  win.webContents.send('terminal:ping', { sessionId, ping: latency });
                }
              });
            }, 5000);

            this.sessions.set(sessionId, session);

            stream.on('data', (data: Buffer) => {
              if (!win.isDestroyed()) {
                win.webContents.send('terminal:data', { sessionId, data: data.toString('utf-8') });
              }
            });

            stream.on('close', () => {
              this.cleanupSession(sessionId);
              if (!win.isDestroyed()) {
                win.webContents.send('terminal:closed', { sessionId });
              }
            });

            resolve({ success: true });
          });
        };

        if (jumpHostConfig) {
          // Connect via Jump Host (ProxyJump)
          const jumpClient = new Client();
          const jumpCfg: ConnectConfig = {
            host: jumpHostConfig.hostname,
            port: jumpHostConfig.port || 22,
            username: jumpHostConfig.username,
            readyTimeout: 20000
          };

          if (jumpHostConfig.authType === 'password' && jumpHostConfig.password) {
            jumpCfg.password = jumpHostConfig.password;
          } else if (jumpHostConfig.authType === 'privateKey') {
            let rawKey = jumpHostConfig.privateKey;
            let passphrase = jumpHostConfig.passphrase;

            if (!rawKey && jumpHostConfig.keyId && this.vaultService) {
              const vData = this.vaultService.getVaultData();
              const foundKey = vData.keys?.find((k) => k.id === jumpHostConfig.keyId);
              if (foundKey) {
                rawKey = foundKey.privateKey;
                if (!passphrase) passphrase = foundKey.passphrase;
              }
            }

            if (rawKey) {
              const normalized = KeygenService.normalizePrivateKey(rawKey, passphrase);
              jumpCfg.privateKey = normalized || rawKey;
              if (passphrase) {
                jumpCfg.passphrase = passphrase;
              }
            }
          }

          jumpClient.on('ready', () => {
            jumpClient.forwardOut(
              '127.0.0.1',
              12345,
              host.hostname,
              host.port || 22,
              (err, stream) => {
                if (err) {
                  jumpClient.end();
                  resolve({ success: false, error: `Jump host forward failed: ${err.message}` });
                  return;
                }
                config.sock = stream;
                client.on('ready', handleReady);
                client.on('error', (e) => {
                  jumpClient.end();
                  resolve({ success: false, error: e.message });
                });
                client.connect(config);
              }
            );
          });

          jumpClient.on('error', (e) => {
            resolve({ success: false, error: `Jump host connection failed: ${e.message}` });
          });

          jumpClient.connect(jumpCfg);
        } else {
          // Direct connection
          client.on('ready', handleReady);
          client.on('error', (err) => {
            this.cleanupSession(sessionId);
            if (!win.isDestroyed()) {
              win.webContents.send('terminal:error', { sessionId, error: err.message });
            }
            resolve({ success: false, error: err.message });
          });
          client.connect(config);
        }
      } catch (err: any) {
        resolve({ success: false, error: err.message || 'Unknown SSH connection error' });
      }
    });
  }

  public write(sessionId: string, data: string) {
    const session = this.sessions.get(sessionId);
    if (session && session.channel) {
      session.channel.write(data);
    }
  }

  public resize(sessionId: string, cols: number, rows: number) {
    const session = this.sessions.get(sessionId);
    if (session && session.channel) {
      session.channel.setWindow(rows, cols, 0, 0);
    }
  }

  public close(sessionId: string) {
    this.cleanupSession(sessionId);
  }

  public closeAll() {
    for (const sessionId of Array.from(this.sessions.keys())) {
      this.cleanupSession(sessionId);
    }
  }

  private cleanupSession(sessionId: string) {
    this.pendingVerifications.delete(sessionId);
    this.pendingHostInfo.delete(sessionId);

    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.pingInterval) {
        clearInterval(session.pingInterval);
      }
      try {
        session.channel?.close();
      } catch {}
      try {
        session.client.end();
      } catch {}
      this.sessions.delete(sessionId);
    }
  }
}
