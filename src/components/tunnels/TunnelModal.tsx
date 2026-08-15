import React, { useState, useEffect } from 'react';
import { X, Network, Server, ArrowRight, ShieldCheck } from 'lucide-react';
import { TunnelRule, TunnelType, HostItem } from '../../types';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';

interface TunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTunnel?: TunnelRule | null;
}

export const TunnelModal: React.FC<TunnelModalProps> = ({ isOpen, onClose, initialTunnel }) => {
  const { hosts, addTunnel, updateTunnel } = useVaultStore();
  const { addToast } = useAppStore();

  const [name, setName] = useState('');
  const [hostId, setHostId] = useState('');
  const [type, setType] = useState<TunnelType>('local');
  const [localHost, setLocalHost] = useState('127.0.0.1');
  const [localPort, setLocalPort] = useState(8080);
  const [remoteHost, setRemoteHost] = useState('127.0.0.1');
  const [remotePort, setRemotePort] = useState(80);

  useEffect(() => {
    if (initialTunnel) {
      setName(initialTunnel.name);
      setHostId(initialTunnel.hostId);
      setType(initialTunnel.type);
      setLocalHost(initialTunnel.localHost || '127.0.0.1');
      setLocalPort(initialTunnel.localPort || 8080);
      setRemoteHost(initialTunnel.remoteHost || '127.0.0.1');
      setRemotePort(initialTunnel.remotePort || 80);
    } else {
      setName('');
      setHostId(hosts[0]?.id || '');
      setType('local');
      setLocalHost('127.0.0.1');
      setLocalPort(8080);
      setRemoteHost('127.0.0.1');
      setRemotePort(80);
    }
  }, [initialTunnel, isOpen, hosts]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hostId) {
      addToast('warning', '請輸入隧道名稱並選擇 SSH 跳板主機');
      return;
    }

    const payload = {
      name: name.trim(),
      hostId,
      type,
      localHost,
      localPort: Number(localPort),
      remoteHost,
      remotePort: Number(remotePort),
      enabled: false
    };

    if (initialTunnel) {
      await updateTunnel(initialTunnel.id, payload);
      addToast('success', `已更新隧道規則「${name}」`);
    } else {
      await addTunnel(payload);
      addToast('success', `已建立隧道規則「${name}」`);
    }

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-modal overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-background/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                {initialTunnel ? '編輯端口轉發規則' : '新增端口轉發規則'}
              </h2>
              <p className="text-[10px] text-mutedDark">配置 SSH 加密轉發路由與端口監聽</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              規則名稱 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 遠端 MySQL 資料庫 (3306)"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              目標 SSH 伺服器 (跳板主機) <span className="text-rose-500">*</span>
            </label>
            <select
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
            >
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label} ({h.username}@{h.hostname}:{h.port || 22})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">轉發類型 (Tunnel Type)</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('local')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                  type === 'local' ? 'bg-primary/20 border-primary text-primary-light' : 'bg-background border-border text-muted hover:text-white'
                }`}
              >
                本地轉發 (-L)
              </button>
              <button
                type="button"
                onClick={() => setType('remote')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                  type === 'remote' ? 'bg-primary/20 border-primary text-primary-light' : 'bg-background border-border text-muted hover:text-white'
                }`}
              >
                遠端反向 (-R)
              </button>
              <button
                type="button"
                onClick={() => setType('dynamic')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                  type === 'dynamic' ? 'bg-primary/20 border-primary text-primary-light' : 'bg-background border-border text-muted hover:text-white'
                }`}
              >
                動態 SOCKS5 (-D)
              </button>
            </div>
          </div>

          {/* Port configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                本地監聽端口 (Local Port)
              </label>
              <input
                type="number"
                required
                value={localPort}
                onChange={(e) => setLocalPort(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>

            {type !== 'dynamic' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  目標主機端口 (Remote Port)
                </label>
                <input
                  type="number"
                  required
                  value={remotePort}
                  onChange={(e) => setRemotePort(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 font-mono focus:outline-none"
                />
              </div>
            )}
          </div>

          {type !== 'dynamic' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                目標主機位址 (Remote Host Address)
              </label>
              <input
                type="text"
                required
                value={remoteHost}
                onChange={(e) => setRemoteHost(e.target.value)}
                placeholder="127.0.0.1 或 internal-db.cluster.local"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-sidebar hover:bg-card text-muted hover:text-white text-xs font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              {initialTunnel ? '儲存變更' : '建立隧道'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
