import React, { useState } from 'react';
import { 
  Network, 
  Plus, 
  Search, 
  Power, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  AlertCircle,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';
import { TunnelModal } from './TunnelModal';
import { TunnelRule } from '../../types';

export const TunnelListView: React.FC = () => {
  const { tunnels, hosts, toggleTunnel, deleteTunnel } = useVaultStore();
  const { addToast } = useAppStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTunnel, setEditingTunnel] = useState<TunnelRule | null>(null);

  const filteredTunnels = tunnels.filter((t) => {
    return (
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.localPort.toString().includes(search) ||
      t.remotePort.toString().includes(search)
    );
  });

  const handleToggle = async (id: string) => {
    await toggleTunnel(id);
  };

  const handleEdit = (tunnel: TunnelRule) => {
    setEditingTunnel(tunnel);
    setModalOpen(true);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Network className="w-5 h-5 text-blue-400" />
            <span>端口轉發隧道</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-sidebar border border-border/60 text-mutedDark">
              共 {tunnels.length} 條規則
            </span>
          </h1>
          <p className="text-xs text-mutedDark mt-0.5">
            建立本地 (-L)、遠端 (-R) 及動態 SOCKS5 (-D) 加密安全轉發隧道
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋隧道名稱或端口..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-border/70 focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setEditingTunnel(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增隧道</span>
          </button>
        </div>
      </div>

      {/* Tunnels List */}
      <div className="flex-1 overflow-y-auto pt-4 no-scrollbar">
        {filteredTunnels.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center text-mutedDark mb-3">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">暫無配置端口轉發隧道</h3>
            <p className="text-xs text-mutedDark max-w-xs mt-1">
              建立 SSH 隧道以安全訪問內網資料庫、內部 Web 儀表板或代理網路流量
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {filteredTunnels.map((tunnel) => {
              const host = hosts.find((h) => h.id === tunnel.hostId);
              const isActive = tunnel.status === 'active';
              const isError = tunnel.status === 'error';

              return (
                <div
                  key={tunnel.id}
                  className={`bg-card border rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-sm ${
                    isActive
                      ? 'border-emerald-500/50 shadow-emerald-500/10'
                      : isError
                      ? 'border-rose-500/50'
                      : 'border-border hover:border-blue-500/30'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isError
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-sidebar text-muted'
                          }`}
                        >
                          <Network className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-slate-100">{tunnel.name}</h3>
                          <div className="text-[11px] text-muted font-mono">
                            跳板主機: {host ? host.label : '未知主機'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(tunnel)}
                          className="p-1 hover:bg-sidebar text-slate-400 hover:text-white rounded"
                          title="編輯"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTunnel(tunnel.id)}
                          className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded"
                          title="刪除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Routing Visual Diagram */}
                    <div className="mt-3.5 p-3 rounded-xl bg-background border border-border/60 flex items-center justify-between font-mono text-xs text-slate-300">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-mutedDark uppercase">本地監聽端口</span>
                        <span className="font-semibold text-termiusCyan">:{tunnel.localPort}</span>
                      </div>

                      <div className="flex items-center gap-1 text-muted">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-sidebar border border-border/40 font-mono uppercase">
                          {tunnel.type === 'local' ? '本地 -L' : tunnel.type === 'remote' ? '遠端 -R' : '動態 SOCKS5'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                      </div>

                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-mutedDark uppercase">目標轉發位址</span>
                        <span className="font-semibold text-blue-400">
                          {tunnel.type === 'dynamic' ? 'SOCKS5 代理' : `${tunnel.remoteHost}:${tunnel.remotePort}`}
                        </span>
                      </div>
                    </div>

                    {isError && tunnel.errorMessage && (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-400 mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{tunnel.errorMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Toggle On/Off */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' :
                        isError ? 'bg-rose-500' : 'bg-slate-600'
                      }`} />
                      <span className={isActive ? 'text-emerald-400 font-medium' : 'text-mutedDark'}>
                        {isActive ? '隧道運行中' : isError ? '連線失敗' : '已停用'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggle(tunnel.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                          : 'bg-sidebar hover:bg-card border border-border text-slate-300'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isActive ? '停止' : '啟動隧道'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TunnelModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTunnel={editingTunnel}
      />
    </div>
  );
};
