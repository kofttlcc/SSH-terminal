import React, { useState } from 'react';
import { X, Zap, Terminal, Lock, Key, Fingerprint } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { useVaultStore } from '../../stores/useVaultStore';
import { HostItem } from '../../types';

export const QuickConnectModal: React.FC = () => {
  const { quickConnectOpen, setQuickConnectOpen, addToast } = useAppStore();
  const { openHostTerminal } = useTerminalStore();
  const { keys } = useVaultStore();

  const [inputStr, setInputStr] = useState('');
  const [password, setPassword] = useState('');
  const [authType, setAuthType] = useState<'password' | 'privateKey'>('password');
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [touchIdForKey, setTouchIdForKey] = useState(false);

  if (!quickConnectOpen) return null;

  const handleKeySelect = (keyId: string) => {
    setSelectedKeyId(keyId);
    const found = keys.find((k) => k.id === keyId);
    if (found) {
      setPrivateKey(found.privateKey);
      if (found.touchIdProtected) {
        setTouchIdForKey(true);
      }
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputStr.trim()) {
      addToast('warning', '請輸入連線目標（例如 root@192.168.1.1:22）');
      return;
    }

    // Parse user@host:port
    let user = 'root';
    let host = inputStr.trim();
    let port = 22;

    if (host.includes('@')) {
      const parts = host.split('@');
      user = parts[0];
      host = parts[1];
    }

    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0];
      port = parseInt(parts[1]) || 22;
    }

    const tempHost: HostItem = {
      id: 'quick-' + Date.now(),
      label: `${user}@${host}`,
      hostname: host,
      port,
      username: user,
      authType,
      password: authType === 'password' ? password : undefined,
      privateKey: authType === 'privateKey' ? privateKey : undefined,
      keyId: authType === 'privateKey' ? selectedKeyId : undefined,
      touchIdForKey: authType === 'privateKey' ? touchIdForKey : undefined,
      createdAt: Date.now()
    };

    setQuickConnectOpen(false);
    openHostTerminal(tempHost);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => setQuickConnectOpen(false)}
    >
      <div 
        className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-modal overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">快速直連 SSH</h2>
              <p className="text-[11px] text-mutedDark">無需預先配置，輸入位址即時建立會話</p>
            </div>
          </div>
          <button 
            onClick={() => setQuickConnectOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleConnect} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              目標連線位址字串 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={inputStr}
              onChange={(e) => setInputStr(e.target.value)}
              placeholder="例如: root@192.168.1.100:22 或 ubuntu@ec2.aws.com"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAuthType('password')}
              className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                authType === 'password' ? 'bg-primary/20 border-primary text-primary-light' : 'bg-background border-border text-muted hover:text-white'
              }`}
            >
              密碼認證
            </button>
            <button
              type="button"
              onClick={() => setAuthType('privateKey')}
              className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                authType === 'privateKey' ? 'bg-primary/20 border-primary text-primary-light' : 'bg-background border-border text-muted hover:text-white'
              }`}
            >
              SSH 私鑰
            </button>
          </div>

          {authType === 'password' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">登入密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入 SSH 登入密碼"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {keys.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">從密鑰庫中選取</label>
                  <select
                    value={selectedKeyId}
                    onChange={(e) => handleKeySelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">(自定義貼上私鑰)</option>
                    {keys.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.type.toUpperCase()}{k.touchIdProtected ? ' - Touch ID' : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">私鑰內容 (OpenSSH / PEM)</label>
                <textarea
                  rows={3}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-sidebar border border-border/60">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs text-slate-200">調用 Touch ID 指紋認證私鑰</span>
                </div>
                <input
                  type="checkbox"
                  checked={touchIdForKey}
                  onChange={(e) => setTouchIdForKey(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setQuickConnectOpen(false)}
              className="px-4 py-2 rounded-xl bg-sidebar hover:bg-card text-muted hover:text-white text-xs font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>立即直連</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
