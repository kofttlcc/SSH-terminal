import React from 'react';
import { 
  Server, 
  Terminal, 
  FolderSync, 
  Edit3, 
  Trash2, 
  Fingerprint,
  Cable,
  Usb
} from 'lucide-react';
import { HostItem, HostGroup } from '../../types';
import { useTerminalStore } from '../../stores/useTerminalStore';

interface HostCardProps {
  host: HostItem;
  groups: HostGroup[];
  onEdit: (host: HostItem) => void;
  onDelete: (id: string) => void;
}

export const HostCard: React.FC<HostCardProps> = ({ host, groups, onEdit, onDelete }) => {
  const { openHostTerminal, openSftpTab } = useTerminalStore();
  const group = groups.find((g) => g.id === host.group);
  const isSerial = host.protocol === 'serial';

  const getOsBadge = () => {
    if (isSerial) {
      return { label: 'Serial Console', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    }
    const os = host.osType || 'linux';
    switch (os) {
      case 'ubuntu':
        return { label: 'Ubuntu', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
      case 'debian':
        return { label: 'Debian', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
      case 'centos':
        return { label: 'CentOS', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'macos':
        return { label: 'macOS', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      case 'docker':
        return { label: 'Docker', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'windows':
        return { label: 'Windows', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' };
      default:
        return { label: 'Linux', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    }
  };

  const osInfo = getOsBadge();

  return (
    <div className={`bg-card hover:bg-cardHover border rounded-2xl p-4 transition-all duration-200 group flex flex-col justify-between shadow-sm hover:shadow-glow ${
      isSerial ? 'hover:border-amber-500/50' : 'hover:border-blue-500/40'
    }`}>
      {/* Top Card Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          {/* Left: Host Icon & Titles */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div 
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${
                isSerial ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
              }`}
              style={{ color: host.color || (isSerial ? '#f59e0b' : '#3b82f6') }}
            >
              {isSerial ? <Cable className="w-5 h-5" /> : <Server className="w-5 h-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-slate-100 group-hover:text-white flex items-center gap-2 truncate">
                <span className="truncate">{host.label}</span>
                {group && (
                  <span 
                    className="text-[10px] px-2 py-0.2 rounded-full font-medium flex-shrink-0"
                    style={{ backgroundColor: `${group.color || '#3b82f6'}20`, color: group.color || '#3b82f6' }}
                  >
                    {group.name}
                  </span>
                )}
              </h3>
              <div className="text-xs text-muted font-mono mt-0.5 truncate">
                {isSerial 
                  ? `串口 · ${host.baudRate || 9600} 8N1 · ${host.serialPort || host.hostname}`
                  : `${host.username}@{host.hostname}:${host.port || 22}`
                }
              </div>
            </div>
          </div>

          {/* Right: Explicit, easy-to-click Edit & Delete buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(host);
              }}
              className="p-1.5 rounded-xl bg-sidebar/80 hover:bg-card border border-border/70 hover:border-blue-500/50 text-slate-400 hover:text-blue-400 transition-all duration-150 active:scale-95"
              title="編輯主機設定"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(host.id);
              }}
              className="p-1.5 rounded-xl bg-sidebar/80 hover:bg-rose-500/20 border border-border/70 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition-all duration-150 active:scale-95"
              title="刪除主機"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags & Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono border ${osInfo.color}`}>
            {osInfo.label}
          </span>

          {isSerial ? (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-sidebar border border-border/60 text-amber-300 font-mono">
              {host.baudRate || 9600} bps (8N1)
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-sidebar border border-border/60 text-muted font-mono">
              {host.authType === 'password' ? '密碼認證' : host.authType === 'yubikey' ? 'YubiKey 認證' : host.authType === 'privateKey' ? '私鑰認證' : 'Agent 認證'}
            </span>
          )}

          {host.jumpHostId && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
              經跳板機
            </span>
          )}

          {host.touchIdForKey && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono flex items-center gap-1">
              <Fingerprint className="w-3 h-3 text-purple-300" />
              指紋私鑰認證
            </span>
          )}

          {host.requireTouchId && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono flex items-center gap-1">
              <Fingerprint className="w-3 h-3 text-purple-300" />
              Touch ID 鎖定
            </span>
          )}

          {host.tags?.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-sidebar text-mutedDark font-medium">
              #{tag}
            </span>
          ))}
        </div>

        {host.notes && (
          <p className="text-xs text-mutedDark mt-2 line-clamp-1 italic">
            "{host.notes}"
          </p>
        )}
      </div>

      {/* Card Action Buttons: Connect SSH / Serial Console */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
        {isSerial ? (
          <button
            onClick={() => openHostTerminal(host)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95"
          >
            <Cable className="w-3.5 h-3.5" />
            <span>連線 Console (串口)</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => openHostTerminal(host)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>連線 SSH</span>
            </button>

            <button
              onClick={() => openSftpTab(host)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sidebar hover:bg-card border border-border hover:border-blue-500/30 text-slate-300 hover:text-white text-xs font-medium transition-all duration-150"
              title="開啟 SFTP 雙欄檔案傳輸"
            >
              <FolderSync className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">SFTP 檔案</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

