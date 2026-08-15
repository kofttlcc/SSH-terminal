import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Plus, 
  Search, 
  Copy, 
  Trash2, 
  ShieldCheck, 
  Check, 
  Lock, 
  FileKey,
  Fingerprint,
  Key,
  Usb,
  Cpu,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';
import { KeyModal } from './KeyModal';
import { SSHKeyItem, YubiKeyDevice } from '../../types';

export const KeyListView: React.FC = () => {
  const { keys, deleteKey, promptTouchId } = useVaultStore();
  const { addToast } = useAppStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedPublicId, setCopiedPublicId] = useState<string | null>(null);
  const [copiedPrivateId, setCopiedPrivateId] = useState<string | null>(null);
  const [yubikeys, setYubikeys] = useState<YubiKeyDevice[]>([]);
  const [scanning, setScanning] = useState(false);

  const fetchYubikeys = async () => {
    setScanning(true);
    try {
      if ((window as any).electronAPI?.yubikey) {
        const devs = await (window as any).electronAPI.yubikey.listDevices();
        setYubikeys(devs || []);
      }
    } catch {
      setYubikeys([]);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchYubikeys();
  }, []);

  const filteredKeys = keys.filter((k) =>
    k.name.toLowerCase().includes(search.toLowerCase()) ||
    k.type.toLowerCase().includes(search.toLowerCase()) ||
    k.fingerprint.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyPublic = (key: SSHKeyItem) => {
    navigator.clipboard.writeText(key.publicKey);
    setCopiedPublicId(key.id);
    addToast('success', '已複製 SSH 公鑰至剪貼簿');
    setTimeout(() => setCopiedPublicId(null), 2000);
  };

  const handleCopyPrivate = async (key: SSHKeyItem) => {
    if (key.storageType === 'yubikey_piv' || key.storageType === 'yubikey_fido2') {
      addToast('info', `「${key.name}」為 YubiKey 硬體密鑰，私鑰已被硬體晶片隔離保護，不可導出`);
      return;
    }

    if (key.touchIdProtected) {
      const ok = await promptTouchId(`正在存取受 Touch ID 保護的 SSH 私鑰「${key.name}」，請按壓指紋`);
      if (!ok) {
        addToast('warning', 'Touch ID 指紋識別未通過，已拒絕讀取私鑰');
        return;
      }
    }

    navigator.clipboard.writeText(key.privateKey);
    setCopiedPrivateId(key.id);
    addToast('success', `已通過認證並複製私鑰「${key.name}」至剪貼簿`);
    setTimeout(() => setCopiedPrivateId(null), 2000);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-blue-400" />
            <span>SSH 密鑰庫</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-sidebar border border-border/60 text-mutedDark">
              共 {keys.length} 把密鑰
            </span>
          </h1>
          <p className="text-xs text-mutedDark mt-0.5">
            集中管理 Ed25519、RSA 與 YubiKey (PIV/FIDO2) 硬體安全金鑰，支援 Touch ID 與物理觸控授權
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋密鑰名稱、指紋或 YubiKey..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-border/70 focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
            />
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增/寫入密鑰</span>
          </button>
        </div>
      </div>

      {/* YubiKey Hardware Device Status Banner */}
      <div className={`mt-3 p-3 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-all ${
        yubikeys.length > 0
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-card/70 border-border/60'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            yubikeys.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-sidebar text-muted'
          }`}>
            <Usb className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span>{yubikeys.length > 0 ? yubikeys[0].model : 'YubiKey 硬體安全金鑰'}</span>
              <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono border ${
                yubikeys.length > 0 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-sidebar text-mutedDark border-border/60'
              }`}>
                {yubikeys.length > 0 ? '● 已連線 (就緒)' : '○ 未偵測到設備'}
              </span>
            </div>
            <div className="text-[11px] text-mutedDark font-mono mt-0.5">
              {yubikeys.length > 0 
                ? `序號: ${yubikeys[0].serial} · 韌體: v${yubikeys[0].version} · 支援 PIV Slot 9a/9c 燒錄與 FIDO2`
                : '將 YubiKey 插入電腦 USB 埠即可自動識別，支援 PIV 晶片私鑰燒錄與 FIDO2/SSH-SK'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchYubikeys}
            title="重新掃描 USB 設備"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sidebar hover:bg-card border border-border text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">掃描設備</span>
          </button>

          {yubikeys.length > 0 && (
            <button
              onClick={() => setModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>寫入/生成</span>
            </button>
          )}
        </div>
      </div>

      {/* Keys List */}
      <div className="flex-1 overflow-y-auto pt-4 no-scrollbar">
        {filteredKeys.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center text-mutedDark mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">暫無 SSH 密鑰</h3>
            <p className="text-xs text-mutedDark max-w-xs mt-1">
              生成軟體密鑰對或直接將私鑰寫入 YubiKey 晶片，實現頂級硬體防護
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {filteredKeys.map((key) => {
              const isYubiKey = key.storageType === 'yubikey_piv' || key.storageType === 'yubikey_fido2';

              return (
                <div
                  key={key.id}
                  className={`bg-card hover:bg-cardHover border rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-sm ${
                    isYubiKey ? 'border-amber-500/40 hover:border-amber-500/70 hover:shadow-amber-500/5' : 'border-border hover:border-blue-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isYubiKey ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/15 text-blue-400'
                        }`}>
                          {isYubiKey ? <Usb className="w-4 h-4" /> : <FileKey className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm text-slate-100 truncate">{key.name}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sidebar border border-border/60 text-muted font-mono uppercase">
                              {key.type}
                            </span>

                            {key.storageType === 'yubikey_piv' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-0.5">
                                <Usb className="w-2.5 h-2.5 text-amber-300" />
                                YubiKey PIV (Slot {key.yubikeySlot || '9a'})
                              </span>
                            )}

                            {key.storageType === 'yubikey_fido2' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-0.5">
                                <Cpu className="w-2.5 h-2.5 text-amber-300" />
                                YubiKey FIDO2 晶片
                              </span>
                            )}

                            {key.touchIdProtected && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono flex items-center gap-0.5">
                                <Fingerprint className="w-2.5 h-2.5 text-purple-300" />
                                Touch ID 認證
                              </span>
                            )}

                            {key.passphrase && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                短語加密
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteKey(key.id)}
                        className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors flex-shrink-0"
                        title="刪除密鑰記錄"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Fingerprint */}
                    <div className="mt-3 p-2.5 rounded-xl bg-background border border-border/60">
                      <div className="text-[10px] text-mutedDark font-medium mb-0.5">SHA256 指紋 (Fingerprint)</div>
                      <div className="text-[11px] font-mono text-slate-300 truncate">
                        {key.fingerprint}
                      </div>
                    </div>
                  </div>

                  {/* Key Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleCopyPublic(key)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-sidebar hover:bg-card border border-border text-slate-200 hover:text-white text-xs font-medium transition-all"
                    >
                      {copiedPublicId === key.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">已複製！</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>複製公鑰</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopyPrivate(key)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        isYubiKey
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                          : 'bg-sidebar hover:bg-card border-border text-slate-200 hover:text-white'
                      }`}
                      title={isYubiKey ? 'YubiKey 硬體私鑰受晶片隔離保護' : key.touchIdProtected ? '需通過 Touch ID 指紋認證以讀取私鑰' : '複製私鑰'}
                    >
                      {copiedPrivateId === key.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">已複製私鑰</span>
                        </>
                      ) : isYubiKey ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>硬體安全鎖定</span>
                        </>
                      ) : (
                        <>
                          {key.touchIdProtected ? <Fingerprint className="w-3.5 h-3.5 text-purple-400" /> : <Key className="w-3.5 h-3.5" />}
                          <span>複製私鑰</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <KeyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
