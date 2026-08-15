import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X, 
  ChevronUp, 
  ChevronDown,
  Trash2
} from 'lucide-react';
import { useSftpStore } from '../../stores/useSftpStore';

export const TransferQueue: React.FC = () => {
  const { transfers, showTransferQueue, toggleTransferQueue } = useSftpStore();

  if (transfers.length === 0) return null;

  const activeCount = transfers.filter((t) => t.status === 'transferring' || t.status === 'pending').length;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="border-t border-border bg-sidebar select-none">
      {/* Header Bar */}
      <div 
        onClick={toggleTransferQueue}
        className="h-8 px-4 flex items-center justify-between cursor-pointer hover:bg-card transition-colors text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">檔案傳輸佇列</span>
          {activeCount > 0 ? (
            <span className="px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono animate-pulse">
              {activeCount} 個傳輸中
            </span>
          ) : (
            <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              全部完成
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-muted">
          <span className="text-[11px] font-mono">共 {transfers.length} 項</span>
          {showTransferQueue ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expandable List */}
      {showTransferQueue && (
        <div className="max-h-48 overflow-y-auto p-2 space-y-1.5 no-scrollbar border-t border-border/40">
          {transfers.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded-xl bg-card border border-border/60 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {item.direction === 'upload' ? (
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0" title="上傳">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0" title="下載">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="truncate font-medium text-slate-200">{item.filename}</span>
                    <span className="text-mutedDark ml-2">{item.progress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-background rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-200 ${
                        item.status === 'completed' ? 'bg-emerald-500' :
                        item.status === 'failed' ? 'bg-rose-500' : 'bg-primary'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-mutedDark font-mono mt-1">
                    <span className="truncate max-w-[250px]">
                      {item.direction === 'upload' ? `-> ${item.targetPath}` : `<- ${item.sourcePath}`}
                    </span>
                    <span>
                      {item.status === 'completed' && <span className="text-emerald-400">已完成</span>}
                      {item.status === 'failed' && <span className="text-rose-400">{item.errorMessage || '傳輸失敗'}</span>}
                      {item.status === 'transferring' && <span className="text-blue-400">{item.speed || '傳輸中...'}</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
