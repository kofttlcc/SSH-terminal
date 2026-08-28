import React, { useEffect, useState, useRef } from 'react';
import { 
  FolderSync, 
  Server, 
  HardDrive, 
  ArrowLeftRight, 
  Upload, 
  Download, 
  Layers, 
  Activity,
  CheckCircle2,
  AlertCircle
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
    uploadArbitraryFile,
    downloadFile, 
    deleteRemoteFile, 
    createRemoteFolder,
    deleteLocalFile,
    createLocalFolder,
    revealLocalInFolder,
    openRemoteFileInEditor
  } = useSftpStore();

  const { hosts } = useVaultStore();
  const { addToast } = useAppStore();
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handlePickAndUploadToRemote = async () => {
    if (!connected) {
      addToast('warning', '請先點擊上方「連線 SFTP」按鈕連線至伺服器再進行上傳');
      return;
    }

    try {
      if ((window as any).electronAPI?.dialog?.selectFile) {
        const filePath = await (window as any).electronAPI.dialog.selectFile({
          title: '選擇要上傳至遠端伺服器的檔案'
        });
        if (filePath) {
          uploadArbitraryFile(filePath);
        }
      } else {
        hiddenFileInputRef.current?.click();
      }
    } catch (err: any) {
      console.error('File select error:', err);
    }
  };

  const handleHiddenFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addToast('info', `已選擇檔案: ${file.name} (請在桌面客戶端中獲取完整本機路徑)`);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden select-none">
      {/* Hidden file input for web fallback */}
      <input
        type="file"
        ref={hiddenFileInputRef}
        onChange={handleHiddenFileChange}
        className="hidden"
      />

      {/* Top SFTP Session Control Bar */}
      <div className="h-12 px-5 bg-sidebar border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <FolderSync className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>雙欄 SFTP 檔案傳輸管理器</span>
              {connected ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>已連線 ({currentHost?.username}@{currentHost?.hostname})</span>
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sidebar text-mutedDark border border-border/80 font-mono">
                  未連線 (右鍵點選本機檔案可快速上傳)
                </span>
              )}
            </h2>
            <p className="text-[10px] text-mutedDark">
              支援滑鼠右鍵選單快速傳輸、線上 Monaco 編輯、目錄新建與本機/遠端雙向檔案同步
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
                {h.label} ({h.username}@{h.hostname}:{h.port})
              </option>
            ))}
          </select>

          {connected ? (
            <button
              onClick={disconnect}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-medium transition-all shadow-sm active:scale-95"
            >
              斷開 SFTP
            </button>
          ) : (
            <button
              onClick={handleConnectHost}
              disabled={connecting || hosts.length === 0}
              className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <FolderSync className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
              <span>{connecting ? '連線中...' : '連線遠端 SFTP'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Pane Workspace */}
      <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-hidden">
        {/* Left Pane: Remote Host */}
        <SftpPane
          title={currentHost ? `遠端伺服器: ${currentHost.label}` : '遠端 SFTP 伺服器 (未連線)'}
          isRemote={true}
          currentPath={remotePath}
          files={remoteFiles}
          loading={remoteLoading}
          targetPathInfo={localPath ? `本機 (${localPath})` : '本機目錄'}
          onNavigate={(p) => loadRemoteDir(p)}
          onRefresh={() => loadRemoteDir()}
          onCreateFolder={(name) => createRemoteFolder(name)}
          onDeleteFile={(name, isDir) => deleteRemoteFile(name, isDir)}
          onOpenFile={(name) => openRemoteFileInEditor(name)}
          onTransferFile={(name) => downloadFile(name)}
          onUploadFilePicker={handlePickAndUploadToRemote}
        />

        {/* Right Pane: Local Workstation */}
        <SftpPane
          title="本機工作站 (本地目錄)"
          isRemote={false}
          currentPath={localPath}
          files={localFiles}
          loading={localLoading}
          targetPathInfo={connected ? `遠端 (${remotePath})` : '遠端伺服器 (請先連線)'}
          onNavigate={(p) => loadLocalDir(p)}
          onRefresh={() => loadLocalDir()}
          onCreateFolder={(name) => createLocalFolder(name)}
          onDeleteFile={(name, isDir) => deleteLocalFile(name, isDir)}
          onTransferFile={(name) => uploadFile(name)}
          onRevealInFolder={(name) => revealLocalInFolder(name)}
          onUploadFilePicker={handlePickAndUploadToRemote}
        />
      </div>

      {/* Bottom Transfer Queue Drawer */}
      <TransferQueue />

      {/* Monaco Code Editor Modal */}
      <FileEditorModal />
    </div>
  );
};
