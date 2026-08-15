import React, { useState } from 'react';
import { 
  Server, 
  Plus, 
  Search, 
  FolderPlus, 
  LayoutGrid, 
  List as ListIcon, 
  Filter, 
  Trash2, 
  Terminal, 
  FolderSync,
  Tag,
  Edit3,
  X,
  Cable
} from 'lucide-react';
import { useVaultStore } from '../../stores/useVaultStore';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { useAppStore } from '../../stores/useAppStore';
import { HostCard } from './HostCard';
import { HostModal } from './HostModal';
import { HostItem } from '../../types';

export const HostListView: React.FC = () => {
  const { hosts, groups, deleteHost, addGroup, deleteGroup } = useVaultStore();
  const { openHostTerminal, openSftpTab } = useTerminalStore();
  const { addToast } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<HostItem | null>(null);

  const [newGroupPrompt, setNewGroupPrompt] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Filtering
  const filteredHosts = hosts.filter((h) => {
    const matchesGroup = selectedGroup === 'all' || h.group === selectedGroup;
    const matchesSearch =
      h.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGroup && matchesSearch;
  });

  const handleEdit = (host: HostItem) => {
    setEditingHost(host);
    setModalOpen(true);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#00f2fe'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    await addGroup({ name: newGroupName.trim(), color: randomColor });
    addToast('success', `已建立主機分組「${newGroupName}」`);
    setNewGroupName('');
    setNewGroupPrompt(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden p-6 select-none">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Server className="w-5 h-5 text-blue-400" />
            <span>主機資產管理</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-sidebar border border-border/60 text-mutedDark">
              共 {hosts.length} 台
            </span>
          </h1>
          <p className="text-xs text-mutedDark mt-0.5">
            集中管理您的遠端伺服器、雲端實例與跳板機 Bastion 節點
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋主機名稱、標籤、IP..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-border/70 focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-card border border-border/70 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-sidebar text-white shadow-sm' : 'text-muted hover:text-white'
              }`}
              title="卡片網格檢視"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-sidebar text-white shadow-sm' : 'text-muted hover:text-white'
              }`}
              title="清單列表檢視"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Host Button */}
          <button
            onClick={() => {
              setEditingHost(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增主機</span>
          </button>
        </div>
      </div>

      {/* Groups Filter Tabs */}
      <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar flex-shrink-0">
        <button
          onClick={() => setSelectedGroup('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            selectedGroup === 'all'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
              : 'bg-card text-muted hover:text-slate-200 border border-border/40'
          }`}
        >
          全部主機 ({hosts.length})
        </button>

        {groups.map((g) => {
          const count = hosts.filter((h) => h.group === g.id).length;
          return (
            <div key={g.id} className="relative group/grp flex items-center">
              <button
                onClick={() => setSelectedGroup(g.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedGroup === g.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 pr-2'
                    : 'bg-card text-muted hover:text-slate-200 border border-border/40 hover:border-border'
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: g.color || '#3b82f6' }} 
                />
                <span>{g.name}</span>
                <span className="text-[10px] text-mutedDark font-mono">({count})</span>
                
                <span
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`確定要刪除分組「${g.name}」嗎？（分組內的主機不會被刪除）`)) {
                      await deleteGroup(g.id);
                      if (selectedGroup === g.id) {
                        setSelectedGroup('all');
                      }
                      addToast('info', `已刪除分組「${g.name}」`);
                    }
                  }}
                  className="opacity-0 group-hover/grp:opacity-100 p-0.5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded transition-all ml-0.5"
                  title="刪除此分組"
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            </div>
          );
        })}

        {/* Add Group inline trigger */}
        {newGroupPrompt ? (
          <form onSubmit={handleCreateGroup} className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="分組名稱"
              className="px-2 py-1 rounded-lg bg-card border border-primary text-xs text-slate-100 focus:outline-none w-28"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-primary text-white rounded-lg text-xs font-medium"
            >
              建立
            </button>
            <button
              type="button"
              onClick={() => setNewGroupPrompt(false)}
              className="px-2 py-1 bg-sidebar text-muted rounded-lg text-xs"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setNewGroupPrompt(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-border/60 hover:border-slate-500 text-mutedDark hover:text-slate-300 text-xs transition-colors"
          >
            <FolderPlus className="w-3 h-3" />
            <span>新增分組</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pt-2 no-scrollbar">
        {filteredHosts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center text-mutedDark mb-3">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">查無主機資料</h3>
            <p className="text-xs text-mutedDark max-w-xs mt-1">
              {searchQuery ? '請嘗試更換搜尋關鍵字或分組篩選' : '建立您的第一台 SSH 遠端主機以開始連線'}
            </p>
            <button
              onClick={() => {
                setEditingHost(null);
                setModalOpen(true);
              }}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增第一台主機</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
            {filteredHosts.map((host) => (
              <HostCard
                key={host.id}
                host={host}
                groups={groups}
                onEdit={handleEdit}
                onDelete={deleteHost}
              />
            ))}
          </div>
        ) : (
          /* Table / List View */
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden mb-8">
            <table className="w-full text-left text-xs">
              <thead className="bg-sidebar border-b border-border/60 text-muted uppercase tracking-wider text-[10px] font-medium">
                <tr>
                  <th className="px-4 py-3">主機名稱</th>
                  <th className="px-4 py-3">連線位址與端口</th>
                  <th className="px-4 py-3">認證方式</th>
                  <th className="px-4 py-3">分組與標籤</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredHosts.map((host) => {
                  const grp = groups.find((g) => g.id === host.group);
                  const isSerial = host.protocol === 'serial';
                  return (
                    <tr key={host.id} className="hover:bg-cardHover/70 transition-colors group">
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        <div className="flex items-center gap-2">
                          {isSerial ? (
                            <Cable className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Server className="w-4 h-4 text-blue-400" />
                          )}
                          <span>{host.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-mutedDark">
                        {isSerial
                          ? `串口 · ${host.baudRate || 9600} 8N1 · ${host.serialPort || host.hostname}`
                          : `${host.username}@{host.hostname}:${host.port || 22}`}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {isSerial
                          ? 'Serial 串口'
                          : (host.authType === 'password' ? '密碼' : host.authType === 'yubikey' ? 'YubiKey' : host.authType === 'privateKey' ? '私鑰' : 'Agent')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {grp && (
                            <span 
                              className="text-[10px] px-2 py-0.2 rounded-full font-medium"
                              style={{ backgroundColor: `${grp.color}20`, color: grp.color }}
                            >
                              {grp.name}
                            </span>
                          )}
                          {host.tags?.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.2 bg-sidebar text-mutedDark rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSerial ? (
                            <button
                              onClick={() => openHostTerminal(host)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm active:scale-95"
                            >
                              <Cable className="w-3 h-3" />
                              <span>Console 連線</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => openHostTerminal(host)}
                                className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Terminal className="w-3 h-3" />
                                <span>SSH 連線</span>
                              </button>
                              <button
                                onClick={() => openSftpTab(host)}
                                className="px-2.5 py-1 rounded-lg bg-sidebar hover:bg-cardHover border border-border text-slate-300 text-xs font-medium flex items-center gap-1"
                              >
                                <FolderSync className="w-3 h-3 text-blue-400" />
                                <span>SFTP</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEdit(host)}
                            className="p-1.5 rounded-lg hover:bg-sidebar border border-transparent hover:border-border text-slate-400 hover:text-white transition-colors"
                            title="編輯主機"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteHost(host.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors"
                            title="刪除主機"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Host Modal */}
      <HostModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialHost={editingHost}
      />
    </div>
  );
};
