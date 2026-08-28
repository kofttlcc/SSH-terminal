import React from 'react';
import { ShieldAlert, AlertTriangle, Play, X, Terminal } from 'lucide-react';
import { useAIStore } from '../../stores/useAIStore';

export const DangerousCommandModal: React.FC = () => {
  const { pendingDangerousCommand, setPendingDangerousCommand, executeCommand } = useAIStore();

  if (!pendingDangerousCommand) return null;

  const { command, reason, targetSessionId, isLocal, isSerial } = pendingDangerousCommand;

  const handleConfirm = () => {
    executeCommand(command, targetSessionId, isLocal, isSerial, true);
    setPendingDangerousCommand(null);
  };

  const handleCancel = () => {
    setPendingDangerousCommand(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="bg-card border border-rose-500/60 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col space-y-4 shadow-rose-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center ring-4 ring-rose-500/30 flex-shrink-0 animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>⚠️ 高危指令安全攔截與防呆警示</span>
            </h3>
            <p className="text-xs text-rose-300/90 mt-0.5">
              AI 檢測到即將執行的指令包含潛在破壞性或敏感操作
            </p>
          </div>
        </div>

        {/* Reason Banner */}
        {reason && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-300">風險原因：</span>
              <span>{reason}</span>
            </div>
          </div>
        )}

        {/* Command Code Preview */}
        <div>
          <div className="text-[11px] text-mutedDark font-medium mb-1 flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-muted" />
            <span>即將發送至終端的原始命令：</span>
          </div>
          <div className="p-3 rounded-xl bg-background border border-border font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-40">
            {command}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl bg-sidebar hover:bg-card border border-border text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            取消 (Cancel)
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>已知悉風險，強制執行</span>
          </button>
        </div>
      </div>
    </div>
  );
};
