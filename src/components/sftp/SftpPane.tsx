import React, { useState, useEffect, useRef } from 'react';
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
  Server,
  Copy,
  ExternalLink,
  Eye,
  FileUp,
  FolderOpen
} from 'lucide-react';
import { SftpFileItem } from '../../types';
import { useAppStore } from '../../stores/useAppStore';

interface SftpPaneProps {
  title: string;
  isRemote: boolean;
  currentPath: string;
  files: SftpFileItem[];
  loading: boolean;
  targetPathInfo?: string;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onCreateFolder?: (name: string) => void;
  onDeleteFile?: (name: string, isDirectory: boolean) => void;
  onOpenFile?: (name: string) => void;
  onTransferFile?: (name: string) => void;
  onRevealInFolder?: (name: string) => void;
  onUploadFilePicker?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  file: SftpFileItem | null;
}

export const SftpPane: React.FC<SftpPaneProps> = ({
  title,
  isRemote,
  currentPath,
  files,
  loading,
  targetPathInfo,
  onNavigate,
  onRefresh,
  onCreateFolder,
  onDeleteFile,
  onOpenFile,
  onTransferFile,
  onRevealInFolder,
  onUploadFilePicker
}) => {
  const { addToast } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState(currentPath);
  const [newFolderPrompt, setNewFolderPrompt] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPathInput(currentPath);
  }, [currentPath]);

  // Close context menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', () => setContextMenu(null), true);

    return () => {
      window.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', () => setContextMenu(null), true);
    };
  }, []);

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
    if (file.type === 'd') return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20 flex-shrink-0" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext || '')) {
      return <FileArchive className="w-4 h-4 text-purple-400 flex-shrink-0" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'sh', 'json', 'yml', 'yaml', 'html', 'css', 'go', 'rs', 'c', 'cpp'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'ico'].includes(ext || '')) {
      return <Image className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />;
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

  const handleContextMenu = (e: React.MouseEvent, file: SftpFileItem | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (file) {
      setSelectedFile(file.name);
    }

    // Smart positioning so it doesn't overflow screen
    const menuWidth = 220;
    const menuHeight = 280;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({ x, y, file });
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast('info', `已複製 ${label} 至剪貼簿`);
    setContextMenu(null);
  };

  const filteredFiles = files
    .filter((f) => f.name !== '.' && f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // ".." always on top
      if (a.name === '..') return -1;
      if (b.name === '..') return 1;
      // Folders first
      if (a.type === 'd' && b.type !== 'd') return -1;
      if (a.type !== 'd' && b.type === 'd') return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div 
      className="h-full flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm relative"
      onContextMenu={(e) => handleContextMenu(e, null)}
    >
      {/* Pane Header */}
      <div className="h-10 px-3 bg-sidebar border-b border-border/60 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isRemote ? (
            <Server className="w-4 h-4 text-blue-400 flex-shrink-0" />
          ) : (
            <HardDrive className="w-4 h-4 text-termiusCyan flex-shrink-0" />
          )}
          <span className="font-semibold text-xs text-slate-200 truncate">{title}</span>
          <span className="text-[10px] text-mutedDark font-mono flex-shrink-0">({files.length} 項)</span>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Upload Button */}
          {onUploadFilePicker && (
            <button
              onClick={onUploadFilePicker}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/40 text-[11px] font-medium transition-all shadow-sm active:scale-95"
              title={isRemote ? '從本機選擇檔案上傳至此遠端目錄' : '選擇檔案上傳至遠端伺服器'}
            >
              <Upload className="w-3 h-3" />
              <span className="hidden sm:inline">上傳檔案</span>
            </button>
          )}

          {/* Reveal in local Finder / Explorer button */}
          {!isRemote && onRevealInFolder && (
            <button
              onClick={() => onRevealInFolder('')}
              className="p-1.5 hover:bg-card text-muted hover:text-white rounded-lg transition-colors"
              title="在系統檔案總管/Finder中開啟當前目錄"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Go Up Directory */}
          <button
            onClick={handleGoUp}
            className="p-1.5 hover:bg-card text-muted hover:text-white rounded-lg transition-colors"
            title="返回上一層資料夾"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className={`p-1.5 hover:bg-card text-muted hover:text-white rounded-lg transition-colors ${loading ? 'animate-spin' : ''}`}
            title="重新整理目錄"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* New Folder */}
          {onCreateFolder && (
            <button
              onClick={() => setNewFolderPrompt(true)}
              className="p-1.5 hover:bg-card text-muted hover:text-white rounded-lg transition-colors"
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
        <div className="flex-1 min-w-0">
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
        <div className="relative w-32 sm:w-36 flex-shrink-0">
          <Search className="w-3 h-3 text-muted absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="過濾檔案..."
            className="w-full pl-6 pr-2 py-1 rounded-lg bg-card border border-border/40 text-[11px] text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Inline New Folder Modal prompt */}
      {newFolderPrompt && (
        <form onSubmit={handleCreateFolderSubmit} className="p-2 bg-sidebar border-b border-border/60 flex items-center gap-2 animate-fade-in">
          <FolderPlus className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="請輸入新資料夾名稱..."
            className="flex-1 px-2.5 py-1 rounded-lg bg-card border border-primary text-xs text-slate-100 focus:outline-none font-mono"
          />
          <button type="submit" className="px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium shadow-sm transition-all">
            建立
          </button>
          <button type="button" onClick={() => setNewFolderPrompt(false)} className="px-2.5 py-1 hover:bg-card text-muted hover:text-white rounded-lg text-xs transition-colors">
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
              <th className="px-3 py-2 w-24 text-right">操作</th>
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
                  onContextMenu={(e) => handleContextMenu(e, file)}
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
                    isSelected ? 'bg-blue-600/20 text-blue-200' : 'hover:bg-cardHover/60 text-slate-300'
                  }`}
                >
                  {/* Name with Icon */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 truncate max-w-[180px] sm:max-w-xs lg:max-w-md">
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

                  {/* Action buttons (Always clearly visible with badges/icons) */}
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Transfer button (Upload for local, Download for remote, supports files & folders) */}
                      {file.name !== '..' && onTransferFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTransferFile(file.name);
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all shadow-sm active:scale-95 ${
                            isRemote
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40'
                          }`}
                          title={isRemote ? `下載${isDir ? '資料夾' : ''}至本機 (${targetPathInfo || '當前本機目錄'})` : `上傳${isDir ? '資料夾' : ''}至遠端伺服器 (${targetPathInfo || '當前遠端目錄'})`}
                        >
                          {isRemote ? <Download className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                          <span>{isRemote ? '下載' : '上傳'}</span>
                        </button>
                      )}

                      {/* Online Editor button for remote files */}
                      {!isDir && isRemote && onOpenFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFile(file.name);
                          }}
                          className="p-1 hover:bg-sidebar text-slate-400 hover:text-white rounded transition-colors"
                          title="在 Monaco 編輯器中在線編輯"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Folder Enter button */}
                      {isDir && file.name !== '..' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                            onNavigate(next);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-sidebar hover:bg-card text-muted hover:text-slate-200 border border-border/40 transition-colors"
                          title="進入目錄"
                        >
                          進入
                        </button>
                      )}

                      {/* Delete button */}
                      {onDeleteFile && file.name !== '..' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`確定要刪除「${file.name}」嗎？`)) {
                              onDeleteFile(file.name, isDir);
                            }
                          }}
                          className="p-1 hover:bg-rose-500/20 text-mutedDark hover:text-rose-400 rounded transition-colors"
                          title="刪除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredFiles.length === 0 && !loading && (
          <div className="p-8 text-center text-mutedDark text-xs font-mono">
            {search ? '查無符合的檔案或目錄' : '此目錄目前為空'}
          </div>
        )}
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-56 rounded-2xl bg-sidebar/95 backdrop-blur-md border border-border/80 shadow-2xl p-1.5 space-y-1 text-xs text-slate-200 animate-fade-in font-sans select-none"
        >
          {contextMenu.file ? (
            <>
              {/* Header: File info */}
              <div className="px-2.5 py-1.5 border-b border-border/60 flex items-center gap-2">
                {getFileIcon(contextMenu.file)}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[11px] truncate text-white">{contextMenu.file.name}</div>
                  <div className="text-[10px] text-mutedDark font-mono">
                    {contextMenu.file.type === 'd' ? '資料夾' : formatSize(contextMenu.file.size)}
                  </div>
                </div>
              </div>

              {/* Primary Action: Upload or Download */}
              {onTransferFile && contextMenu.file.name !== '..' && (
                <button
                  onClick={() => {
                    onTransferFile(contextMenu.file!.name);
                    setContextMenu(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left font-medium transition-all ${
                    isRemote 
                      ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' 
                      : 'bg-primary/20 text-primary-light hover:bg-primary/30'
                  }`}
                >
                  {isRemote ? <Download className="w-4 h-4 text-emerald-400" /> : <Upload className="w-4 h-4 text-primary" />}
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs">{isRemote ? '下載至本機目錄' : '上傳至遠端伺服器'}</span>
                    <span className="text-[9px] text-mutedDark font-mono truncate max-w-[150px]">
                      目標: {targetPathInfo || (isRemote ? '本機' : '遠端')}
                    </span>
                  </div>
                </button>
              )}

              {/* Folder open action */}
              {contextMenu.file.type === 'd' && (
                <button
                  onClick={() => {
                    if (contextMenu.file!.name === '..') {
                      handleGoUp();
                    } else {
                      const next = currentPath === '/' ? `/${contextMenu.file!.name}` : `${currentPath}/${contextMenu.file!.name}`;
                      onNavigate(next);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-card text-left transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>進入此資料夾</span>
                </button>
              )}

              {/* Edit text file */}
              {isRemote && contextMenu.file.type !== 'd' && onOpenFile && (
                <button
                  onClick={() => {
                    onOpenFile(contextMenu.file!.name);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-card text-left transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>在線編輯檔案 (Monaco)</span>
                </button>
              )}

              {/* Reveal in local folder */}
              {!isRemote && onRevealInFolder && (
                <button
                  onClick={() => {
                    onRevealInFolder(contextMenu.file!.name);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-card text-left transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-termiusCyan" />
                  <span>在系統檔案總管/Finder中顯示</span>
                </button>
              )}

              <div className="h-[1px] bg-border/60 my-1" />

              {/* Copy actions */}
              <button
                onClick={() => handleCopyText(contextMenu.file!.name, '檔案名稱')}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-card text-left transition-colors text-muted hover:text-white"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>複製檔案名稱</span>
              </button>

              <button
                onClick={() => {
                  const full = currentPath === '/' ? `/${contextMenu.file!.name}` : `${currentPath}/${contextMenu.file!.name}`;
                  handleCopyText(full, '完整路徑');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-card text-left transition-colors text-muted hover:text-white"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>複製完整路徑</span>
              </button>

              {/* Delete action */}
              {onDeleteFile && contextMenu.file.name !== '..' && (
                <>
                  <div className="h-[1px] bg-border/60 my-1" />
                  <button
                    onClick={() => {
                      const f = contextMenu.file!;
                      setContextMenu(null);
                      if (window.confirm(`確定要刪除「${f.name}」嗎？`)) {
                        onDeleteFile(f.name, f.type === 'd');
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-400 text-left transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>刪除{contextMenu.file.type === 'd' ? '資料夾' : '檔案'}</span>
                  </button>
                </>
              )}
            </>
          ) : (
            /* Blank space context menu */
            <>
              {onUploadFilePicker && (
                <button
                  onClick={() => {
                    setContextMenu(null);
                    onUploadFilePicker();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary-light text-left font-medium transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>上傳檔案至此目錄...</span>
                </button>
              )}

              {onCreateFolder && (
                <button
                  onClick={() => {
                    setContextMenu(null);
                    setNewFolderPrompt(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-card text-left transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>新建資料夾</span>
                </button>
              )}

              <button
                onClick={() => {
                  setContextMenu(null);
                  onRefresh();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-card text-left transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>重新整理目錄</span>
              </button>

              <button
                onClick={() => handleCopyText(currentPath, '當前目錄路徑')}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-card text-left transition-colors text-muted hover:text-white"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>複製當前目錄路徑</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
