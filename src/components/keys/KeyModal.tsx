import React, { useState, useEffect } from 'react';
import { 
  X, 
  KeyRound, 
  Sparkles, 
  ShieldCheck, 
  Fingerprint, 
  Usb, 
  Cpu, 
  HardDrive, 
  Lock,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { SSHKeyItem, YubiKeyDevice } from '../../types';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyModal: React.FC<KeyModalProps> = ({ isOpen, onClose }) => {
  const { addKey } = useVaultStore();
  const { addToast } = useAppStore();

  const [mode, setMode] = useState<'software' | 'yubikey_write' | 'yubikey_fido'>('software');
  const [name, setName] = useState('');
  const [keyType, setKeyType] = useState<'ed25519' | 'rsa'>('ed25519');
  const [passphrase, setPassphrase] = useState('');
  const [touchIdProtected, setTouchIdProtected] = useState(true);

  // Software Import & YubiKey write fields
  const [importedPrivateKey, setImportedPrivateKey] = useState('');
  const [subSoftwareTab, setSubSoftwareTab] = useState<'generate' | 'import'>('generate');

  // YubiKey Specific
  const [devices, setDevices] = useState<YubiKeyDevice[]>([]);
  const [selectedSerial, setSelectedSerial] = useState('');
  const [yubikeySlot, setYubikeySlot] = useState<'9a' | '9c' | '9e'>('9a');
  const [yubikeyPin, setYubikeyPin] = useState('123456');
  const [touchPolicy, setTouchPolicy] = useState<'always' | 'cached' | 'never'>('always');
  const [fidoType, setFidoType] = useState<'ed25519-sk' | 'ed25519' | 'rsa'>('ed25519-sk');
  const [scanning, setScanning] = useState(false);

  const fetchDevices = async () => {
    setScanning(true);
    try {
      if ((window as any).electronAPI?.yubikey) {
        const devs: YubiKeyDevice[] = await (window as any).electronAPI.yubikey.listDevices();
        setDevices(devs || []);
        if (devs && devs.length > 0) {
          setSelectedSerial(devs[0].serial);
        } else {
          setSelectedSerial('');
        }
      }
    } catch {
      setDevices([]);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('warning', '請輸入密鑰名稱或別名');
      return;
    }

    try {
      if (mode === 'software') {
        if (subSoftwareTab === 'generate') {
          if ((window as any).electronAPI?.keygen) {
            const keyItem: SSHKeyItem = await (window as any).electronAPI.keygen.generateKeyPair(
              name.trim(),
              keyType,
              passphrase || undefined
            );
            keyItem.touchIdProtected = touchIdProtected;
            keyItem.storageType = 'software';
            await addKey(keyItem);
            addToast('success', `已成功生成軟體密鑰「${name}」`);
          }
        } else {
          if (!importedPrivateKey.trim()) {
            addToast('warning', '請填寫私鑰內容');
            return;
          }
          const keyItem: SSHKeyItem = {
            id: 'key-' + Date.now(),
            name: name.trim(),
            type: keyType,
            publicKey: 'ssh-imported...',
            privateKey: importedPrivateKey.trim(),
            passphrase: passphrase || undefined,
            fingerprint: 'SHA256:imported_key_' + Math.random().toString(36).substring(2, 8),
            touchIdProtected,
            storageType: 'software',
            createdAt: Date.now()
          };
          await addKey(keyItem);
          addToast('success', `已匯入軟體私鑰「${name}」`);
        }
      } else if (mode === 'yubikey_write') {
        if (devices.length === 0) {
          addToast('warning', '未偵測到 YubiKey 設備，請先插入 USB 後再試');
          return;
        }
        if (!importedPrivateKey.trim()) {
          addToast('warning', '請輸入欲寫入 YubiKey 的私鑰內容');
          return;
        }

        if ((window as any).electronAPI?.yubikey) {
          const writtenKey: SSHKeyItem = await (window as any).electronAPI.yubikey.writeKey({
            keyName: name.trim(),
            privateKey: importedPrivateKey.trim(),
            passphrase: passphrase || undefined,
            slot: yubikeySlot,
            pin: yubikeyPin || '123456',
            touchPolicy,
            deviceSerial: selectedSerial || devices[0]?.serial
          });
          await addKey(writtenKey);
          addToast('success', `已成功將私鑰寫入 YubiKey PIV (Slot ${yubikeySlot})！`);
        }
      } else if (mode === 'yubikey_fido') {
        if (devices.length === 0) {
          addToast('warning', '未偵測到 YubiKey 設備，請先插入 USB 後再試');
          return;
        }

        if ((window as any).electronAPI?.yubikey) {
          const fidoKey: SSHKeyItem = await (window as any).electronAPI.yubikey.generateKey({
            keyName: name.trim(),
            type: fidoType,
            slot: yubikeySlot,
            pin: yubikeyPin || '123456',
            touchPolicy,
            deviceSerial: selectedSerial || devices[0]?.serial
          });
          await addKey(fidoKey);
          addToast('success', `已在 YubiKey 晶片內生成 ${fidoType.toUpperCase()} 硬體安全金鑰！`);
        }
      }

      onClose();
    } catch (err: any) {
      addToast('error', err.message || '操作失敗');
    }
  };

  const isYubiKeyMode = mode === 'yubikey_write' || mode === 'yubikey_fido';
  const noDevice = isYubiKeyMode && devices.length === 0;

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-card border border-border/80 rounded-2xl shadow-modal overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-background/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>SSH 身份密鑰管理</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
                  支援 YubiKey 硬體金鑰
                </span>
              </h2>
              <p className="text-[10px] text-mutedDark">支援標準軟體密鑰、直接寫入 YubiKey PIV 晶片與 FIDO2 硬體生成</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Major Storage Modes Selector */}
        <div className="grid grid-cols-3 border-b border-border/60 bg-sidebar/40 p-1.5 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('software')}
            className={`py-2 px-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === 'software'
                ? 'bg-primary/20 text-primary-light border border-primary/40 shadow-xs'
                : 'text-muted hover:text-white hover:bg-card/60'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>軟體私鑰 (標準)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('yubikey_write')}
            className={`py-2 px-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === 'yubikey_write'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-muted hover:text-white hover:bg-card/60'
            }`}
          >
            <Usb className="w-3.5 h-3.5 text-amber-400" />
            <span>寫入至 YubiKey (PIV)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('yubikey_fido')}
            className={`py-2 px-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === 'yubikey_fido'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-muted hover:text-white hover:bg-card/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>YubiKey 原生晶片 (FIDO2)</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Key Name / Label */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              密鑰名稱 / 別名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'software' ? '例如: id_ed25519_production' : '例如: YubiKey 5 身份認證金鑰'}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
            />
          </div>

          {/* Mode 1: Software Key */}
          {mode === 'software' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <button
                  type="button"
                  onClick={() => setSubSoftwareTab('generate')}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                    subSoftwareTab === 'generate' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                  }`}
                >
                  生成新密鑰對
                </button>
                <button
                  type="button"
                  onClick={() => setSubSoftwareTab('import')}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                    subSoftwareTab === 'import' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                  }`}
                >
                  匯入現有 PEM 私鑰
                </button>
              </div>

              {subSoftwareTab === 'generate' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">加密演算法</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setKeyType('ed25519')}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                        keyType === 'ed25519' ? 'bg-primary/20 border-primary text-primary-light' : 'bg-background border-border text-muted hover:text-white'
                      }`}
                    >
                      Ed25519 (推薦，最高性能)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyType('rsa')}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                        keyType === 'rsa' ? 'bg-primary/20 border-primary text-primary-light' : 'bg-background border-border text-muted hover:text-white'
                      }`}
                    >
                      RSA (2048 位元相容)
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    私鑰內容 (PEM 格式) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={importedPrivateKey}
                    onChange={(e) => setImportedPrivateKey(e.target.value)}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono text-[11px]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">密鑰保護密碼短語 (Passphrase，選填)</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="用於保護該私鑰的密碼短語"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none font-mono"
                />
              </div>

              {/* Touch ID Protection */}
              <div className="p-3.5 rounded-xl bg-sidebar border border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">調用 Touch ID 指紋認證保護私鑰</div>
                    <div className="text-[10px] text-mutedDark">使用此私鑰時必須通過 Mac 指紋識別授權</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={touchIdProtected}
                  onChange={(e) => setTouchIdProtected(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Mode 2: Write/Import to YubiKey PIV Slot */}
          {mode === 'yubikey_write' && (
            <div className="space-y-4">
              {noDevice ? (
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Usb className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">未偵測到已插入的 YubiKey 設備</h4>
                    <p className="text-xs text-mutedDark max-w-sm mt-1">
                      請將您的 YubiKey 插入 Mac 的 USB 介面，插入後點擊下方按鈕重新掃描。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDevices}
                    disabled={scanning}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    <span>{scanning ? '正在掃描 USB...' : '重新掃描 USB 設備'}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* YubiKey Target Device */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-300 mb-1">目標 YubiKey 設備</label>
                      <select
                        value={selectedSerial}
                        onChange={(e) => setSelectedSerial(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
                      >
                        {devices.map((d) => (
                          <option key={d.serial} value={d.serial}>
                            {d.model} (序號: {d.serial} / v{d.version})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={fetchDevices}
                      title="重新整理設備"
                      className="mt-5 p-2 rounded-xl bg-sidebar hover:bg-card border border-border text-slate-300 hover:text-white"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Private Key Content to Write */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      欲寫入/燒錄的私鑰內容 (PEM 格式) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={importedPrivateKey}
                      onChange={(e) => setImportedPrivateKey(e.target.value)}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono text-[11px]"
                    />
                    <p className="text-[10px] text-mutedDark mt-1">
                      💡 寫入後，私鑰將被封裝並存放在 YubiKey 的 PIV 硬體安全元件中，外界無法讀出明文私鑰。
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* PIV Slot */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">PIV 插槽 (Slot)</label>
                      <select
                        value={yubikeySlot}
                        onChange={(e) => setYubikeySlot(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none font-mono"
                      >
                        <option value="9a">Slot 9a (身份認證 Authentication - 推薦)</option>
                        <option value="9c">Slot 9c (數位簽名 Digital Signature)</option>
                        <option value="9e">Slot 9e (卡片認證 Card Authentication)</option>
                      </select>
                    </div>

                    {/* Touch Policy */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">物理觸控策略 (Touch Policy)</label>
                      <select
                        value={touchPolicy}
                        onChange={(e) => setTouchPolicy(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
                      >
                        <option value="always">每次連線必須物理觸摸 (Always)</option>
                        <option value="cached">快取 15 秒 (Cached)</option>
                        <option value="never">無需觸摸 (Never)</option>
                      </select>
                    </div>
                  </div>

                  {/* Management PIN */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">YubiKey PIN 碼 (預設: 123456)</label>
                    <input
                      type="password"
                      value={yubikeyPin}
                      onChange={(e) => setYubikeyPin(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mode 3: Generate on YubiKey Chip (FIDO2 / SSH-SK) */}
          {mode === 'yubikey_fido' && (
            <div className="space-y-4">
              {noDevice ? (
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Usb className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">未偵測到已插入的 YubiKey 設備</h4>
                    <p className="text-xs text-mutedDark max-w-sm mt-1">
                      請將您的 YubiKey 插入 Mac 的 USB 介面，插入後點擊下方按鈕重新掃描。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDevices}
                    disabled={scanning}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    <span>{scanning ? '正在掃描 USB...' : '重新掃描 USB 設備'}</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-300 mb-1">目標 YubiKey 設備</label>
                      <select
                        value={selectedSerial}
                        onChange={(e) => setSelectedSerial(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
                      >
                        {devices.map((d) => (
                          <option key={d.serial} value={d.serial}>
                            {d.model} (序號: {d.serial} / v{d.version})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={fetchDevices}
                      title="重新整理設備"
                      className="mt-5 p-2 rounded-xl bg-sidebar hover:bg-card border border-border text-slate-300 hover:text-white"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">硬體密鑰類型</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFidoType('ed25519-sk')}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                          fidoType === 'ed25519-sk' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-background border-border text-muted hover:text-white'
                        }`}
                      >
                        FIDO2 / ed25519-sk (OpenSSH 8.2+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFidoType('ed25519')}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                          fidoType === 'ed25519' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-background border-border text-muted hover:text-white'
                        }`}
                      >
                        PIV 晶片原生生成 (Slot 9a)
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed">
                    <div className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>硬體級別安全保證</span>
                    </div>
                    金鑰由 YubiKey 硬體安全晶片直接在內部生成，私鑰永不離開物理設備，連線時強制依賴物理觸控。
                  </div>
                </>
              )}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-sidebar hover:bg-card text-muted hover:text-white text-xs font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={noDevice}
              className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
                noDevice
                  ? 'opacity-40 bg-sidebar border border-border cursor-not-allowed text-muted'
                  : mode === 'software'
                  ? 'bg-primary hover:bg-primary-hover active:scale-95'
                  : 'bg-amber-600 hover:bg-amber-700 active:scale-95'
              }`}
            >
              {noDevice ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>請先插入 YubiKey</span>
                </>
              ) : mode === 'software' ? (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{subSoftwareTab === 'generate' ? '生成軟體密鑰' : '匯入軟體私鑰'}</span>
                </>
              ) : mode === 'yubikey_write' ? (
                <>
                  <Usb className="w-3.5 h-3.5" />
                  <span>直接寫入至 YubiKey</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  <span>在 YubiKey 晶片內生成</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
