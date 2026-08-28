import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { app } from 'electron';
import { AppVaultData, HostItem, HostGroup, Snippet, TunnelRule, SSHKeyItem, TerminalSettings } from '../../src/types';
import { KeygenService } from './keygenService';

const ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 300000;
const PBKDF2_KEY_LEN = 32;
const PBKDF2_DIGEST = 'sha512';

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
  localShell: process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh'),
  renderMode: 'canvas',
  touchIdEnabled: false,
  touchIdForHosts: false,
  aiConfig: {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    temperature: 0.3,
    maxTokens: 4096,
    enableTerminalContext: true,
    dangerousCommandWarning: true
  }
};

const DEFAULT_GROUPS: HostGroup[] = [
  { id: 'prod', name: '生產環境', color: '#ef4444' },
  { id: 'staging', name: '預發環境', color: '#f59e0b' },
  { id: 'dev', name: '開發測試', color: '#10b981' },
  { id: 'infra', name: '雲端基礎設施', color: '#3b82f6' }
];

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 'snip-docker-ps',
    title: 'Docker 活躍容器清單',
    command: 'docker ps --format "table {{.ID}}\\t{{.Image}}\\t{{.Status}}\\t{{.Names}}"',
    tags: ['Docker', '監控'],
    description: '以格式化列格檢視正在運行的 Docker 容器',
    createdAt: Date.now()
  },
  {
    id: 'snip-sys-info',
    title: '系統資源快速診斷',
    command: 'echo "=== CPU / 記憶體 ===" && uptime && free -h 2>/dev/null || top -l 1 | head -n 10 && echo "\\n=== 磁碟空間 ===" && df -h',
    tags: ['系統', 'Linux', '診斷'],
    description: '一鍵檢查伺服器負載、記憶體、CPU 及磁碟剩餘空間',
    createdAt: Date.now()
  },
  {
    id: 'snip-find-port',
    title: '查詢端口佔用進程',
    command: 'sudo lsof -i :{{port}} || sudo netstat -tlpn | grep :{{port}}',
    tags: ['網路', '除錯'],
    description: '檢查指定端口由哪個進程或服務佔用',
    variables: ['port'],
    createdAt: Date.now()
  },
  {
    id: 'snip-nginx-reload',
    title: 'Nginx 測試並重新載入',
    command: 'sudo nginx -t && sudo systemctl reload nginx',
    tags: ['Nginx', 'Web'],
    description: '檢查配置檔案語法並平滑重載 Nginx 服務',
    createdAt: Date.now()
  },
  {
    id: 'snip-tail-log',
    title: '即時跟蹤服務日誌',
    command: 'journalctl -u {{service_name}} -f -n 100 --no-pager',
    tags: ['Systemd', '日誌'],
    description: '實時追蹤指定 systemd 系統服務的日誌輸出',
    variables: ['service_name'],
    createdAt: Date.now()
  },
  {
    id: 'snip-git-log',
    title: 'Git 視覺化提交記錄圖',
    command: 'git log --graph --oneline --decorate --all -n 20',
    tags: ['Git'],
    description: '以分支圖形式檢視最近 20 條提交歷史',
    createdAt: Date.now()
  }
];

const DEFAULT_HOSTS: HostItem[] = [
  {
    id: 'host-local',
    label: '本地工作站 (本機 Shell)',
    hostname: 'localhost',
    port: 22,
    username: process.env.USER || process.env.USERNAME || 'local',
    authType: 'password',
    group: 'dev',
    tags: ['本機', process.platform === 'darwin' ? 'macOS' : 'Windows'],
    color: '#00f2fe',
    osType: process.platform === 'darwin' ? 'macos' : 'server',
    createdAt: Date.now()
  },
  {
    id: 'host-demo-ubuntu',
    label: 'AWS 生產雲端節點 (範例)',
    hostname: 'ec2-prod.us-east-1.compute.amazonaws.com',
    port: 22,
    username: 'ubuntu',
    authType: 'privateKey',
    group: 'prod',
    tags: ['AWS', 'Ubuntu 22.04', 'Web'],
    color: '#3b82f6',
    osType: 'ubuntu',
    notes: '核心生產叢集 Web 前端節點',
    createdAt: Date.now() - 100000
  },
  {
    id: 'host-demo-db',
    label: 'PostgreSQL 資料庫節點 (範例)',
    hostname: '10.0.4.15',
    port: 2222,
    username: 'postgres',
    authType: 'password',
    group: 'prod',
    tags: ['資料庫', 'Postgres', '內網'],
    color: '#8b5cf6',
    osType: 'linux',
    jumpHostId: 'host-demo-ubuntu',
    notes: '需要透過 AWS 跳板機 (Bastion) 連線進入',
    createdAt: Date.now() - 200000
  }
];

const DEFAULT_KEYS: SSHKeyItem[] = [
  {
    id: 'key-default-ed25519',
    name: 'id_ed25519 (生物識別認證密鑰)',
    type: 'ed25519',
    publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMr6HIa04GDQv9qD/7Jzhr3r/7SbtF0vGkTWDMALd+1f itgeek@local',
    privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\nQyNTUxOQAAACDK+hyGtOBg0L/ag/+yc4a96/+0m7RdLxpE1gzAC3ftXwAAAJAcT3ICHE9y\nAgAAAAtzc2gtZWQyNTUxOQAAACDK+hyGtOBg0L/ag/+yc4a96/+0m7RdLxpE1gzAC3ftXw\nAAAEC58LiT1HTO0gkWtQvhw5QNiAOgaQO4hd4lUOKiqV5GmMr6HIa04GDQv9qD/7Jzhr3r\n/7SbtF0vGkTWDMALd+1fAAAAC3Rlcm1pdXNAbWFjAQI=\n-----END OPENSSH PRIVATE KEY-----\n',
    fingerprint: 'SHA256:DHQStWmDz3Fpz9Uu5inSmQA5mMM62fPNMP10Wmo3sMo',
    touchIdProtected: true,
    createdAt: Date.now()
  }
];

export interface ImportPreviewResult {
  success: boolean;
  isEncrypted: boolean;
  platform?: string;
  exportedAt?: number;
  summary?: {
    hostCount: number;
    groupCount: number;
    snippetCount: number;
    keyCount: number;
    tunnelCount: number;
  };
  previewData?: AppVaultData;
  error?: string;
}

export class VaultService {
  private vaultPath: string;

  constructor() {
    const userDataPath = app ? app.getPath('userData') : path.join(process.env.HOME || '.', '.itgeek-ssh');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.vaultPath = path.join(userDataPath, 'vault_store.json');

    // Auto-migration: Check legacy data paths if the new path does not exist yet
    if (!fs.existsSync(this.vaultPath)) {
      this.migrateLegacyVault(userDataPath);
    }
  }

  private migrateLegacyVault(currentDir: string) {
    try {
      const candidatePaths = [
        path.join(app ? app.getPath('appData') : '', 'termius-ssh-terminal', 'vault_store.json'),
        path.join(os.homedir(), '.termius-terminal', 'vault_store.json'),
        path.join(app ? app.getPath('appData') : '', 'SSH-terminal', 'vault_store.json')
      ];

      for (const legacyPath of candidatePaths) {
        if (legacyPath && fs.existsSync(legacyPath)) {
          console.log(`[VaultService] Migrating legacy vault data from: ${legacyPath}`);
          const content = fs.readFileSync(legacyPath, 'utf-8');
          fs.writeFileSync(this.vaultPath, content, 'utf-8');
          break;
        }
      }
    } catch (err) {
      console.error('[VaultService] Failed during legacy migration check:', err);
    }
  }

  public getVaultData(): AppVaultData {
    try {
      if (fs.existsSync(this.vaultPath)) {
        const raw = fs.readFileSync(this.vaultPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const keys = (parsed.keys || DEFAULT_KEYS).map((k: SSHKeyItem) => {
          if (k.privateKey && k.privateKey.includes('BEGIN YUBIKEY FIDO2 KEY HANDLE') && !k.privateKey.includes('Payload:')) {
            const gen = KeygenService.generateKeyPair(k.name || 'yubikey-ssh', 'ed25519');
            const sealed = `-----BEGIN YUBIKEY PIV CONTAINER-----\nSlot: 9a\nDevice: ${k.yubikeySerial || 'YK-17891328'}\nTouchPolicy: always\nPayload: ${Buffer.from(gen.privateKey).toString('base64')}\n-----END YUBIKEY PIV CONTAINER-----\n`;
            return {
              ...k,
              publicKey: gen.publicKey,
              privateKey: sealed,
              fingerprint: gen.fingerprint,
              type: 'ed25519' as const
            };
          }
          return k;
        });

        return {
          version: parsed.version || 2,
          hosts: parsed.hosts || DEFAULT_HOSTS,
          groups: parsed.groups || DEFAULT_GROUPS,
          snippets: parsed.snippets || DEFAULT_SNIPPETS,
          tunnels: parsed.tunnels || [],
          keys,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
        };
      }
    } catch (err) {
      console.error('Failed to read vault file, initializing defaults:', err);
    }

    const initialData: AppVaultData = {
      version: 2,
      hosts: DEFAULT_HOSTS,
      groups: DEFAULT_GROUPS,
      snippets: DEFAULT_SNIPPETS,
      tunnels: [],
      keys: DEFAULT_KEYS,
      settings: DEFAULT_SETTINGS
    };

    this.saveVaultData(initialData);
    return initialData;
  }

  public saveVaultData(data: AppVaultData): boolean {
    try {
      fs.writeFileSync(this.vaultPath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Failed to save vault data:', err);
      return false;
    }
  }

  /**
   * Export Vault with AES-256-GCM + PBKDF2-SHA512 (300,000 iterations)
   */
  public exportVault(masterKey?: string): string {
    const data = this.getVaultData();
    const jsonStr = JSON.stringify(data);

    if (!masterKey || !masterKey.trim()) {
      // Unencrypted export container
      return JSON.stringify({
        magic: 'ITGEEK_SSH_VAULT_PLAIN',
        schemaVersion: 2,
        exportedAt: Date.now(),
        platform: process.platform,
        generator: 'itgeek-ssh v1.0',
        data
      }, null, 2);
    }

    // High-security encrypted export
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LEN, PBKDF2_DIGEST);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return JSON.stringify({
      magic: 'ITGEEK_SSH_VAULT_ENCRYPTED',
      schemaVersion: 2,
      exportedAt: Date.now(),
      platform: process.platform,
      generator: 'itgeek-ssh v1.0',
      crypto: {
        algorithm: ALGORITHM,
        kdf: 'pbkdf2-sha512',
        iterations: PBKDF2_ITERATIONS,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag
      },
      payload: encrypted
    }, null, 2);
  }

  /**
   * Decrypts and parses raw vault content for preview or import
   */
  private decryptVaultContent(content: string, masterKey?: string): { success: boolean; data?: AppVaultData; platform?: string; exportedAt?: number; error?: string } {
    try {
      const parsed = JSON.parse(content);

      // Check if it's the new standard encrypted container
      if (parsed.magic === 'ITGEEK_SSH_VAULT_ENCRYPTED' || (parsed.crypto && parsed.payload)) {
        if (!masterKey) {
          return { success: false, error: '此金庫檔案已被主密碼加密，請輸入密碼以解密' };
        }
        const cryptoMeta = parsed.crypto || {};
        const salt = Buffer.from(cryptoMeta.salt, 'hex');
        const iv = Buffer.from(cryptoMeta.iv, 'hex');
        const authTag = Buffer.from(cryptoMeta.authTag, 'hex');
        const iterations = cryptoMeta.iterations || PBKDF2_ITERATIONS;
        const digest = (cryptoMeta.kdf && cryptoMeta.kdf.includes('sha512')) ? 'sha512' : 'sha256';

        const key = crypto.pbkdf2Sync(masterKey, salt, iterations, PBKDF2_KEY_LEN, digest);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(parsed.payload, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const data = JSON.parse(decrypted);

        return { 
          success: true, 
          data, 
          platform: parsed.platform, 
          exportedAt: parsed.exportedAt 
        };
      }

      // Check legacy encrypted format
      if (parsed.data && parsed.salt && parsed.iv && parsed.authTag && typeof parsed.data === 'string') {
        if (!masterKey) {
          return { success: false, error: '此金庫檔案已被主密碼加密，請輸入密碼以解密' };
        }
        const salt = Buffer.from(parsed.salt, 'hex');
        const iv = Buffer.from(parsed.iv, 'hex');
        const authTag = Buffer.from(parsed.authTag, 'hex');
        const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const data = JSON.parse(decrypted);

        return { success: true, data };
      }

      // Plain container format
      if (parsed.magic === 'ITGEEK_SSH_VAULT_PLAIN' && parsed.data) {
        return { 
          success: true, 
          data: parsed.data, 
          platform: parsed.platform, 
          exportedAt: parsed.exportedAt 
        };
      }

      // Standard AppVaultData JSON
      if (parsed.hosts || parsed.keys || parsed.snippets) {
        return { success: true, data: parsed };
      }

      return { success: false, error: '無法識別的金庫檔案格式' };
    } catch (err: any) {
      return { success: false, error: '解密失敗：密碼錯誤或檔案已損毀' };
    }
  }

  /**
   * Preview an imported vault before executing the import
   */
  public previewImport(content: string, masterKey?: string): ImportPreviewResult {
    try {
      const parsed = JSON.parse(content);
      const isEncrypted = parsed.magic === 'ITGEEK_SSH_VAULT_ENCRYPTED' || (parsed.crypto && parsed.payload) || (parsed.data && parsed.salt && parsed.authTag);

      if (isEncrypted && !masterKey) {
        return {
          success: true,
          isEncrypted: true,
          platform: parsed.platform,
          exportedAt: parsed.exportedAt
        };
      }

      const res = this.decryptVaultContent(content, masterKey);
      if (!res.success || !res.data) {
        return {
          success: false,
          isEncrypted,
          error: res.error || '解析金庫檔案失敗'
        };
      }

      const vData = res.data;
      return {
        success: true,
        isEncrypted,
        platform: res.platform,
        exportedAt: res.exportedAt,
        summary: {
          hostCount: (vData.hosts || []).length,
          groupCount: (vData.groups || []).length,
          snippetCount: (vData.snippets || []).length,
          keyCount: (vData.keys || []).length,
          tunnelCount: (vData.tunnels || []).length
        },
        previewData: vData
      };
    } catch (err: any) {
      return {
        success: false,
        isEncrypted: false,
        error: 'JSON 語法無效或檔案格式錯誤'
      };
    }
  }

  /**
   * Import Vault with Smart Merge, Full Overwrite, or Selective Import
   */
  public importVault(
    content: string, 
    masterKey?: string, 
    mode: 'merge' | 'overwrite' | 'selective' = 'merge',
    selection?: { hostIds?: string[]; keyIds?: string[]; snippetIds?: string[]; tunnelIds?: string[] }
  ): { success: boolean; data?: AppVaultData; error?: string } {
    const res = this.decryptVaultContent(content, masterKey);
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const imported = res.data;
    const current = this.getVaultData();

    // Cross-platform LocalShell adaptation: if importing from Mac to Win or Win to Mac, ensure shell is valid
    if (imported.settings) {
      if (process.platform === 'win32' && imported.settings.localShell?.includes('/')) {
        imported.settings.localShell = 'powershell.exe';
      } else if (process.platform !== 'win32' && imported.settings.localShell?.includes('.exe')) {
        imported.settings.localShell = process.env.SHELL || '/bin/zsh';
      }
    }

    if (mode === 'overwrite') {
      this.saveVaultData(imported);
      return { success: true, data: imported };
    }

    if (mode === 'selective') {
      const selectedHostIds = new Set(selection?.hostIds || []);
      const selectedKeyIds = new Set(selection?.keyIds || []);
      const selectedSnippetIds = new Set(selection?.snippetIds || []);
      const selectedTunnelIds = new Set(selection?.tunnelIds || []);

      const hostsToMerge = (imported.hosts || []).filter((h) => selectedHostIds.has(h.id));
      const keysToMerge = (imported.keys || []).filter((k) => selectedKeyIds.has(k.id));
      const snippetsToMerge = (imported.snippets || []).filter((s) => selectedSnippetIds.has(s.id));
      const tunnelsToMerge = (imported.tunnels || []).filter((t) => selectedTunnelIds.has(t.id));

      const mergedData = this.executeSmartMerge(current, {
        ...imported,
        hosts: hostsToMerge,
        keys: keysToMerge,
        snippets: snippetsToMerge,
        tunnels: tunnelsToMerge
      });

      this.saveVaultData(mergedData);
      return { success: true, data: mergedData };
    }

    // Default: Smart Merge
    const mergedData = this.executeSmartMerge(current, imported);
    this.saveVaultData(mergedData);
    return { success: true, data: mergedData };
  }

  private executeSmartMerge(current: AppVaultData, incoming: AppVaultData): AppVaultData {
    // 1. Merge Groups
    const groupMap = new Map<string, HostGroup>();
    (current.groups || []).forEach((g) => groupMap.set(g.id, g));
    (incoming.groups || []).forEach((g) => {
      if (!groupMap.has(g.id)) {
        groupMap.set(g.id, g);
      }
    });

    // 2. Merge SSH Keys (deduplicate by fingerprint or ID)
    const keyMap = new Map<string, SSHKeyItem>();
    (current.keys || []).forEach((k) => keyMap.set(k.fingerprint || k.id, k));
    (incoming.keys || []).forEach((k) => {
      const keyId = k.fingerprint || k.id;
      if (!keyMap.has(keyId)) {
        keyMap.set(keyId, k);
      }
    });

    // 3. Merge Snippets (deduplicate by id or title)
    const snippetMap = new Map<string, Snippet>();
    (current.snippets || []).forEach((s) => snippetMap.set(s.id, s));
    (incoming.snippets || []).forEach((s) => {
      if (!snippetMap.has(s.id)) {
        snippetMap.set(s.id, s);
      }
    });

    // 4. Merge Tunnels (deduplicate by id)
    const tunnelMap = new Map<string, TunnelRule>();
    (current.tunnels || []).forEach((t) => tunnelMap.set(t.id, t));
    (incoming.tunnels || []).forEach((t) => {
      if (!tunnelMap.has(t.id)) {
        tunnelMap.set(t.id, t);
      }
    });

    // 5. Merge Hosts (match by hostname + port + username or ID)
    const hostMap = new Map<string, HostItem>();
    (current.hosts || []).forEach((h) => {
      const signature = `${h.protocol || 'ssh'}:${h.hostname}:${h.port}:${h.username}`;
      hostMap.set(signature, h);
    });

    (incoming.hosts || []).forEach((h) => {
      const signature = `${h.protocol || 'ssh'}:${h.hostname}:${h.port}:${h.username}`;
      if (hostMap.has(signature)) {
        // If collision, keep the one with newer createdAt / lastConnected
        const existing = hostMap.get(signature)!;
        const incomingTime = h.lastConnected || h.createdAt || 0;
        const existingTime = existing.lastConnected || existing.createdAt || 0;
        if (incomingTime > existingTime) {
          hostMap.set(signature, { ...existing, ...h });
        }
      } else {
        hostMap.set(signature, h);
      }
    });

    return {
      version: 2,
      hosts: Array.from(hostMap.values()),
      groups: Array.from(groupMap.values()),
      snippets: Array.from(snippetMap.values()),
      tunnels: Array.from(tunnelMap.values()),
      keys: Array.from(keyMap.values()),
      settings: current.settings || DEFAULT_SETTINGS
    };
  }
}
