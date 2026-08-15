import React, { useState, useEffect } from 'react';
import { 
  X, 
  Target, 
  CheckSquare, 
  Square, 
  Terminal, 
  Server, 
  Cable, 
  Activity, 
  Layers,
  Radio
} from 'lucide-react';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { TargetSessionInfo } from '../../types';

export const SyncTargetModal: React.FC = () => {
  const targetPickerModalOpen = useTerminalStore((state) => state.targetPickerModalOpen);
  const setTargetPickerModalOpen = useTerminalStore((state) => state.setTargetPickerModalOpen);
  const customTargetSessionIds = useTerminalStore((state) => state.customTargetSessionIds);
  const setCustomTargetSessionIds = useTerminalStore((state) => state.setCustomTargetSessionIds);
  const setSyncTargetScope = useTerminalStore((state) => state.setSyncTargetScope);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeSessions, setActiveSessions] = useState<TargetSessionInfo[]>([]);

  useEffect(() => {
    if (targetPickerModalOpen) {
      const sessions = useTerminalStore.getState().getAllActiveSessions();
      setActiveSessions(sessions);
      if (customTargetSessionIds.length > 0) {
        setSelectedIds([...customTargetSessionIds]);
      } else {
        setSelectedIds(sessions.map((s) => s.sessionId));
      }
    }
  }, [targetPickerModalOpen, customTargetSessionIds]);

  if (!targetPickerModalOpen) return null;

  const handleToggle = (sessionId: string) => {
    setSelectedIds((prev) => 
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(activeSessions.map((s) => s.sessionId));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleSave = () => {
    setCustomTargetSessionIds(selectedIds);
    setSyncTargetScope('custom');
    setTargetPickerModalOpen(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => setTargetPickerModalOpen(false)}
    >
      <div 
        className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-modal overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>選擇同步目標終端會話</span>
                <span className="text-xs px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  已選 {selectedIds.length} / {activeSessions.length}
                </span>
              </h2>
              <p className="text-[11px] text-mutedDark">勾選您希望同步執行指令或鍵盤廣播的伺服器與串口設備</p>
            </div>
          </div>

          <button 
            onClick={() => setTargetPickerModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Batch Actions */}
        <div className="px-6 py-2.5 bg-sidebar/50 border-b border-border/40 flex items-center justify-between text-xs">
          <span className="text-muted text-[11px]">可同步的活動終端清單：</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-[11px] text-primary-light hover:underline font-medium"
            >
              全選
            </button>
            <span className="text-border">|</span>
            <button
              onClick={handleDeselectAll}
              className="text-[11px] text-muted hover:text-slate-200 font-medium"
            >
              清空
            </button>
          </div>
        </div>

        {/* Session List */}
        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2 no-scrollbar">
          {activeSessions.length > 0 ? (
            activeSessions.map((session) => {
              const isChecked = selectedIds.includes(session.sessionId);
              return (
                <div
                  key={session.sessionId}
                  onClick={() => handleToggle(session.sessionId)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 ${
                    isChecked
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                      : 'bg-sidebar/60 border-border/60 hover:bg-card hover:border-border'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button 
                      type="button"
                      className={`p-0.5 rounded transition-colors ${
                        isChecked ? 'text-amber-400' : 'text-muted'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      session.isSerial ? 'bg-amber-500/20 text-amber-400' :
                      session.isLocal ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {session.isSerial ? <Cable className="w-3.5 h-3.5" /> :
                       session.isLocal ? <Terminal className="w-3.5 h-3.5" /> :
                       <Server className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 flex items-center gap-2 truncate">
                        <span className="truncate">{session.paneTitle}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-background/80 text-mutedDark font-mono">
                          {session.tabTitle}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">
                        {session.isSerial ? 'Serial 串口設備' : session.isLocal ? '本機 Shell' : `SSH · ${session.hostLabel || '遠端主機'}`}
                      </div>
                    </div>
                  </div>

                  {session.ping !== undefined && (
                    <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 flex-shrink-0">
                      <Activity className="w-2.5 h-2.5" />
                      <span>{session.ping}ms</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-muted text-xs">
              目前沒有開啟中的終端會話。請先連線主機後再使用同步功能。
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/60 bg-background/50">
          <span className="text-[11px] text-mutedDark">
            設定自訂同步組後，撰寫欄與鍵盤廣播將僅發送至勾選的會話。
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTargetPickerModalOpen(false)}
              className="px-3 py-1.5 rounded-xl bg-sidebar hover:bg-card text-muted hover:text-white text-xs font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              套用目標 ({selectedIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
