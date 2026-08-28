export type AuthType = 'password' | 'privateKey' | 'agent' | 'yubikey' | 'hybrid';

export interface YubiKeyDevice {
  id: string;
  serial: string;
  model: string;
  version: string;
  connected: boolean;
  hasPiv: boolean;
  hasFido2: boolean;
}

export type OsType = 
  | 'linux' 
  | 'ubuntu' 
  | 'debian' 
  | 'centos' 
  | 'macos' 
  | 'windows' 
  | 'freebsd' 
  | 'docker' 
  | 'server';

export type HostProtocol = 'ssh' | 'serial';

export interface SerialPortInfo {
  path: string;
  name: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
}

export interface HostItem {
  id: string;
  label: string;
  protocol?: HostProtocol;
  hostname: string;
  port: number;
  username: string;
  authType: AuthType;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  keyId?: string;
  fallbackKeyId?: string;
  yubikeyKeyId?: string;
  yubikeyPin?: string;
  hybridPreferred?: 'yubikey' | 'touchid';
  // Serial Port specific configurations
  serialPort?: string;
  baudRate?: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space';
  flowControl?: 'none' | 'rtscts' | 'xonxoff';
  group?: string;
  tags?: string[];
  color?: string;
  icon?: string;
  osType?: OsType;
  jumpHostId?: string;
  startupCommand?: string;
  keepaliveInterval?: number;
  keepaliveCountMax?: number;
  requireTouchId?: boolean;
  touchIdForKey?: boolean;
  agentForward?: boolean;
  createdAt: number;
  lastConnected?: number;
  notes?: string;
}

export interface KnownHostItem {
  id: string;
  hostname: string;
  port: number;
  keyType: string;
  fingerprint: string;
  visualArt?: string;
  addedAt: number;
  lastSeenAt?: number;
  trusted: boolean;
}

export interface HostFingerprintPrompt {
  sessionId: string;
  hostname: string;
  port: number;
  keyType: string;
  fingerprint: string;
  visualArt: string;
  isMismatch: boolean;
  expectedFingerprint?: string;
}

export interface HostGroup {
  id: string;
  name: string;
  color?: string;
}

export type SplitMode = 'single' | 'split-horizontal' | 'split-vertical' | 'grid-2x2';

export type SyncTargetScope = 'all' | 'current-tab' | 'current-pane' | 'custom';

export interface TargetSessionInfo {
  sessionId: string;
  paneId: string;
  tabId: string;
  tabTitle: string;
  paneTitle: string;
  hostId?: string;
  hostLabel?: string;
  isLocal?: boolean;
  isSerial?: boolean;
  ping?: number;
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface TerminalPaneState {
  paneId: string;
  title: string;
  sessionId?: string;
  hostId?: string;
  host?: HostItem;
  hostLabel?: string;
  hostColor?: string;
  isLocal?: boolean;
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
  ping?: number;
}

export interface TerminalTab {
  id: string;
  title: string;
  type: 'terminal' | 'sftp' | 'hosts' | 'snippets' | 'tunnels' | 'keys' | 'settings';
  hostId?: string;
  splitMode: SplitMode;
  panes: TerminalPaneState[];
  activePaneId: string;
  broadcast: boolean;
}

export interface Snippet {
  id: string;
  title: string;
  command: string;
  tags: string[];
  description?: string;
  variables?: string[];
  createdAt: number;
}

export type TunnelType = 'local' | 'remote' | 'dynamic';

export interface TunnelRule {
  id: string;
  name: string;
  hostId: string;
  type: TunnelType;
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  enabled: boolean;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
  createdAt: number;
}

export interface SSHKeyItem {
  id: string;
  name: string;
  type: 'ed25519' | 'rsa' | 'ecdsa' | 'ed25519-sk' | 'ecdsa-sk';
  publicKey: string;
  privateKey: string;
  passphrase?: string;
  fingerprint: string;
  touchIdProtected?: boolean;
  storageType?: 'software' | 'yubikey_piv' | 'yubikey_fido2';
  yubikeySerial?: string;
  yubikeySlot?: '9a' | '9c' | '9e' | string;
  touchPolicy?: 'always' | 'cached' | 'never';
  createdAt: number;
}

export interface SftpFileItem {
  name: string;
  type: 'd' | '-' | 'l';
  size: number;
  modifyTime: number;
  accessTime: number;
  rights: {
    user: string;
    group: string;
    other: string;
  };
  owner: number;
  group: number;
  isLink?: boolean;
}

export interface SftpTransferItem {
  id: string;
  filename: string;
  sourcePath: string;
  targetPath: string;
  direction: 'upload' | 'download';
  totalSize: number;
  transferredSize: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  speed: string;
  progress: number; // 0 - 100
  errorMessage?: string;
  startedAt: number;
  completedAt?: number;
}

export type TerminalThemeId = 'itgeek' | 'termius' | 'dracula' | 'one-dark' | 'nord' | 'monokai' | 'solarized-dark' | 'github-dark';

export interface TerminalSettings {
  theme: TerminalThemeId;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
  copyOnSelect: boolean;
  bellSound: boolean;
  localShell: string;
  renderMode: 'webgl' | 'canvas' | 'dom';
  touchIdEnabled: boolean;
  touchIdForHosts: boolean;
  aiConfig?: AIModelConfig;
}

export type AIProvider = 
  | 'deepseek' 
  | 'openai' 
  | 'anthropic' 
  | 'gemini' 
  | 'google'
  | 'qwen' 
  | 'moonshot' 
  | 'zhipu' 
  | 'siliconflow' 
  | 'groq' 
  | 'ollama' 
  | 'custom';

export interface AIModelConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  enableTerminalContext?: boolean;
  dangerousCommandWarning?: boolean;
  customSystemPrompt?: string;
}

export type CommandRiskLevel = 'safe' | 'caution' | 'danger';

export interface ExtractedCommand {
  command: string;
  explanation?: string;
  riskLevel: CommandRiskLevel;
  riskReason?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningContent?: string;
  commands?: ExtractedCommand[];
  contextSnapshot?: {
    hostLabel?: string;
    osType?: string;
    hostname?: string;
    terminalSnippet?: string;
  };
  timestamp: number;
}

export interface AIChatSession {
  id: string;
  title: string;
  hostId?: string;
  sessionId?: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AppVaultData {
  version: number;
  hosts: HostItem[];
  groups: HostGroup[];
  snippets: Snippet[];
  tunnels: TunnelRule[];
  keys: SSHKeyItem[];
  knownHosts?: KnownHostItem[];
  settings: TerminalSettings;
  aiSessions?: AIChatSession[];
}
