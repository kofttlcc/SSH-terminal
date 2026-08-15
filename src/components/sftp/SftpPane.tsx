import React, { useState } from 'react';
import { 
  Folder, 
  File, 
  FileCode, 
  FileArchive, 
  FileText, 
  Image, 
  ArrowUp, 
  RefreshCw, 
  FolderPlus, 
  Trash2, 
  Download, 
  Upload, 
  Edit3, 
  Search,
  Lock,
  ChevronRight,
  HardDrive,
  Server
} from 'lucide-react';
import { SftpFileItem } from '../../types';

interface SftpPaneProps {
  title: string;
  isRemote: boolean;
  currentPath: string;
  files: SftpFileItem[];
  loading: boolean;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onCreateFolder?: (name: string) => void;
  onDeleteFile?: (name: string, isDirectory: boolean) => void;
  onOpenFile?: (name: string) => void;
  onTransferFile?: (name: string) => void;
}

export const SftpPane: React.FC<SftpPaneProps> = ({
  title,
  isRemote,
  currentPath,
  files,
  loading,
  onNavigate,
  onRefresh,
  onCreateFolder,
  onDeleteFile,
  onOpenFile,
  onTransferFile
}) => {
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState(currentPath);
  const [newFolderPrompt, setNewFolderPrompt] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  React.useEffect(() => {
    setPathInput(currentPath);
  }, [currentPath]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (file: SftpFileItem) => {
    if (file.type === 'd') return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext || '')) {
      return <FileArchive className="w-4 h-4 text-purple-400" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'sh', 'json', 'yml', 'yaml', 'html', 'css'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-blue-400" />;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-4 h-4 text-emerald-400" />;
    }
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingPath(false);
    onNavigate(pathInput);
  };

  const handleGoUp = () => {
    if (currentPath === '/' || !currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const upPath = '/' + parts.join('/');
    onNavigate(upPath || '/');
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim() && onCreateFolder) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setNewFolderPrompt(false);
    }
  };

  const filteredFiles = files
    .filter((f) => f.name !== '.' && f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Folders first
      if (a.type === 'd' && b.type !== 'd') return -1;
      if (a.type !== 'd' && b.type === 'd') return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Pane Header */}
      <div className="h-10 px-3 bg-sidebar border-b border-border/60 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {isRemote ? (
            <Server className="w-4 h-4 text-blue-400" />
          ) : (
            <HardDrive className="w-4 h-4 text-termiusCyan" />
          )}
          <span className="font-semibold text-xs text-slate-200">{title}</span>
          <span className="text-[10px] text-mutedDark font-mono">(共 {files.length} 項)</span>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleGoUp}
            className="p-1 hover:bg-card text-muted hover:text-white rounded transition-colors"
            title="返回上一層資料夾"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefresh}
            className={`p-1 hover:bg-card text-muted hover:text-white rounded transition-colors ${loading ? 'animate-spin' : ''}`}
            title="重新整理目錄"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {onCreateFolder && (
            <button
              onClick={() => setNewFolderPrompt(true)}
              className="p-1 hover:bg-card text-muted hover:text-white rounded transition-colors"
              title="新建資料夾"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Path Bar & Search Input */}
      <div className="px-3 py-2 bg-background/50 border-b border-border/40 flex items-center gap-2">
        {/* Breadcrumb Path Input */}
        <div className="flex-1">
          {isEditingPath ? (
            <form onSubmit={handlePathSubmit}>
              <input
                type="text"
                autoFocus
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onBlur={() => setIsEditingPath(false)}
                className="w-full px-2 py-1 rounded bg-card border border-primary text-xs text-slate-100 font-mono focus:outline-none"
              />
            </form>
          ) : (
            <div
              onClick={() => {
                setPathInput(currentPath);
                setIsEditingPath(true);
              }}
              className="px-2 py-1 rounded bg-card/60 hover:bg-card text-xs font-mono text-slate-300 hover:text-white cursor-text truncate border border-border/40"
              title="點擊以直接編輯路徑"
            >
              {currentPath || '/'}
            </div>
          )}
        </div>

        {/* Search within pane */}
        <div className="relative w-36">
          <Search className="w-3 h-3 text-muted absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="過濾檔案..."
            className="w-full pl-6 pr-2 py-1 rounded-lg bg-card border border-border/40 text-[11px] text-slate-100 placeholder-mutedDark focus:outline-none"
          />
        </div>
      </div>

      {/* Inline New Folder Modal prompt */}
      {newFolderPrompt && (
        <form onSubmit={handleCreateFolderSubmit} className="p-2 bg-sidebar border-b border-border/60 flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-amber-400" />
          <input
            type="text"
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="資料夾名稱"
            className="flex-1 px-2 py-1 rounded bg-card border border-primary text-xs text-slate-100 focus:outline-none"
          />
          <button type="submit" className="px-3 py-1 bg-primary text-white rounded text-xs font-medium">
            建立
          </button>
          <button type="button" onClick={() => setNewFolderPrompt(false)} className="px-2 py-1 text-muted text-xs">
            取消
          </button>
        </form>
      )}

      {/* File List Table */}
      <div className="flex-1 overflow-y-auto no-scrollbar select-none">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-sidebar/80 sticky top-0 border-b border-border/40 text-mutedDark font-medium text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2">檔案名稱</th>
              <th className="px-3 py-2 w-20 text-right">大小</th>
              <th className="px-3 py-2 w-32 hidden md:table-cell">修改時間</th>
              <th className="px-2 py-2 w-16 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile === file.name;
              const isDir = file.type === 'd';

              return (
                <tr
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  onDoubleClick={() => {
                    if (isDir) {
                      if (file.name === '..') {
                        handleGoUp();
                      } else {
                        const next = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                        onNavigate(next);
                      }
                    } else if (isRemote && onOpenFile) {
                      onOpenFile(file.name);
                    } else if (onTransferFile) {
                      onTransferFile(file.name);
                    }
                  }}
                  className={`cursor-pointer transition-colors group ${
                    isSelected ? 'bg-blue-600/15 text-blue-300' : 'hover:bg-cardHover/60 text-slate-300'
                  }`}
                >
                  {/* Name with Icon */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 truncate max-w-[200px] lg:max-w-xs">
                      {getFileIcon(file)}
                      <span className="truncate font-mono text-[11px] group-hover:text-white">
                        {file.name}
                      </span>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="px-3 py-2 text-right font-mono text-[11px] text-mutedDark">
                    {isDir ? '-' : formatSize(file.size)}
                  </td>

                  {/* Modified */}
                  <td className="px-3 py-2 text-mutedDark font-mono text-[10px] hidden md:table-cell truncate">
                    {formatDate(file.modifyTime)}
                  </td>

                  {/* Action buttons */}
                  <td className="px-2 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isDir && isRemote && onOpenFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFile(file.name);
                          }}
                          className="p-1 hover:bg-sidebar text-slate-300 hover:text-white rounded"
                          title="在 Monaco 編輯器中在線編輯"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}

                      {!isDir && onTransferFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTransferFile(file.name);
                          }}
                          className="p-1 hover:bg-sidebar text-blue-400 hover:text-blue-300 rounded"
                          title={isRemote ? '下載至本機' : '上傳至遠端伺服器'}
                        >
                          {isRemote ? <Download className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                        </button>
                      )}

                      {onDeleteFile && file.name !== '..' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFile(file.name, isDir);
                          }}
                          className="p-1 hover:bg-red-500/20 text-muted hover:text-red-400 rounded"
                          title="刪除檔案"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
