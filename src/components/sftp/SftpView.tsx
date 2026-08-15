import React, { useEffect, useState } from 'react';
import { 
  FolderSync, 
  Server, 
  HardDrive, 
  ArrowLeftRight, 
  Upload, 
  Download, 
  Layers, 
  Activity 
} from 'lucide-react';
import { useSftpStore } from '../../stores/useSftpStore';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';
import { SftpPane } from './SftpPane';
import { TransferQueue } from './TransferQueue';
import { FileEditorModal } from './FileEditorModal';
import { HostItem } from '../../types';

export const SftpView: React.FC = () => {
  const { 
    connected, 
    connecting, 
    currentHost, 
    remotePath, 
    remoteFiles, 
    remoteLoading,
    localPath, 
    localFiles, 
    localLoading,
    connect, 
    disconnect, 
    loadRemoteDir, 
    loadLocalDir,
    uploadFile, 
    downloadFile, 
    deleteRemoteFile, 
    createRemoteFolder,
    openRemoteFileInEditor
  } = useSftpStore();

  const { hosts } = useVaultStore();
  const [selectedHostId, setSelectedHostId] = useState<string>('');

  useEffect(() => {
    if (hosts.length > 0 && !currentHost) {
      setSelectedHostId(hosts[0].id);
    }
  }, [hosts, currentHost]);

  useEffect(() => {
    loadLocalDir();
  }, []);

  const handleConnectHost = () => {
    const host = hosts.find((h) => h.id === selectedHostId);
    if (host) {
      connect(host);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden select-none">
      {/* Top SFTP Session Control Bar */}
      <div className="h-12 px-5 bg-sidebar border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <FolderSync className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>雙欄 SFTP 檔案管理器</span>
              {connected && (
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  已連線
                </span>
              )}
            </h2>
            <p className="text-[10px] text-mutedDark">
              在遠端伺服器與本機工作站之間輕鬆傳輸、同步與管理檔案
            </p>
          </div>
        </div>

        {/* Host Selector & Connect Button */}
        <div className="flex items-center gap-2.5">
          <select
            value={currentHost ? currentHost.id : selectedHostId}
            onChange={(e) => setSelectedHostId(e.target.value)}
            disabled={connected}
            className="px-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs text-slate-100 focus:border-primary focus:outline-none"
          >
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.label} ({h.username}@{h.hostname})
              </option>
            ))}
          </select>

          {connected ? (
            <button
              onClick={disconnect}
              className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-medium transition-all"
            >
              斷開連線
            </button>
          ) : (
            <button
              onClick={handleConnectHost}
              disabled={connecting || hosts.length === 0}
              className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {connecting ? '連線中...' : '連線 SFTP'}
            </button>
          )}
        </div>
      </div>

      {/* Dual Pane Workspace */}
      <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-hidden">
        {/* Left Pane: Remote Host */}
        <SftpPane
          title={currentHost ? `遠端伺服器: ${currentHost.label}` : '遠端 SFTP (未連線)'}
          isRemote={true}
          currentPath={remotePath}
          files={remoteFiles}
          loading={remoteLoading}
          onNavigate={(p) => loadRemoteDir(p)}
          onRefresh={() => loadRemoteDir()}
          onCreateFolder={(name) => createRemoteFolder(name)}
          onDeleteFile={(name, isDir) => deleteRemoteFile(name, isDir)}
          onOpenFile={(name) => openRemoteFileInEditor(name)}
          onTransferFile={(name) => downloadFile(name)}
        />

        {/* Right Pane: Local Workstation */}
        <SftpPane
          title="本機工作站 (本地目錄)"
          isRemote={false}
          currentPath={localPath}
          files={localFiles}
          loading={localLoading}
          onNavigate={(p) => loadLocalDir(p)}
          onRefresh={() => loadLocalDir()}
          onTransferFile={(name) => uploadFile(name)}
        />
      </div>

      {/* Bottom Transfer Queue Drawer */}
      <TransferQueue />

      {/* Monaco Code Editor Modal */}
      <FileEditorModal />
    </div>
  );
};
