import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Copy, 
  Check, 
  AlertTriangle, 
  Server, 
  Fingerprint, 
  ArrowRight,
  XCircle,
  CheckCircle2
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useVaultStore } from '../../stores/useVaultStore';

export const HostFingerprintModal: React.FC = () => {
  const { hostKeyPrompt, setHostKeyPrompt, addToast } = useAppStore();
  const { loadKnownHosts } = useVaultStore();
  const [copied, setCopied] = useState(false);

  if (!hostKeyPrompt) return null;

  const { sessionId, hostname, port, keyType, fingerprint, visualArt, isMismatch, expectedFingerprint } = hostKeyPrompt;

  const handleCopy = () => {
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    addToast('info', '已複製主機公鑰指紋');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDecision = async (decision: 'trust_always' | 'trust_once' | 'reject') => {
    try {
      if ((window as any).electronAPI?.terminal?.sendHostKeyDecision) {
        await (window as any).electronAPI.terminal.sendHostKeyDecision(sessionId, decision);
      }
      if (decision === 'trust_always') {
        addToast('success', `已信任並記錄主機 ${hostname}:${port} 的公鑰指紋`);
        await loadKnownHosts();
      } else if (decision === 'reject') {
        addToast('warning', `已拒絕連線至未確認的主機 ${hostname}:${port}`);
      }
    } catch (err: any) {
      addToast('error', err.message || '決策處理異常');
    }
    setHostKeyPrompt(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div 
        className={`w-full max-w-xl bg-card border rounded-3xl shadow-modal overflow-hidden animate-fade-in flex flex-col ${
          isMismatch ? 'border-rose-500/70 shadow-rose-500/10' : 'border-amber-500/40 shadow-amber-500/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-start justify-between ${
          isMismatch ? 'bg-rose-500/15 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isMismatch ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isMismatch ? <ShieldAlert className="w-6 h-6" /> : <Fingerprint className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {isMismatch ? '⚠️ 嚴重安全警報：主機公鑰指紋已變更！' : '首次連線主機指紋核驗 (TOFU)'}
              </h2>
              <p className="text-xs text-mutedDark mt-1 leading-relaxed">
                {isMismatch
                  ? '檢測到目標主機公鑰與已知金庫不符！可能伺服器更換了密鑰，或您正在遭遇中間人攔截攻擊 (MITM)！'
                  : '無法建立該伺服器的初始真實性。請核對下方公鑰指紋是否與主機提供商相符。'}
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-xs text-slate-200">
          {/* Target Host Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-background border border-border/80 font-mono">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 font-semibold">{hostname}</span>
              <span className="text-muted">:{port}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-sidebar border border-border/60 text-[11px] text-amber-300 font-semibold uppercase">
              {keyType}
            </span>
          </div>

          {/* Fingerprint Value */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-semibold text-slate-300">目前收到的 SHA256 指紋：</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-primary-light hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已複製' : '複製指紋'}</span>
              </button>
            </div>
            <div className={`p-3 rounded-2xl border font-mono text-[11px] break-all ${
              isMismatch ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold' : 'bg-background border-border/80 text-amber-300'
            }`}>
              {fingerprint}
            </div>
          </div>

          {/* Mismatch Previous Fingerprint Notice */}
          {isMismatch && expectedFingerprint && (
            <div>
              <span className="font-semibold text-slate-400">先前記錄的舊指紋：</span>
              <div className="p-3 rounded-2xl border border-slate-700/80 bg-background/60 font-mono text-[11px] text-slate-400 break-all line-through mt-1">
                {expectedFingerprint}
              </div>
            </div>
          )}

          {/* Visual Randomart ASCII */}
          {visualArt && (
            <div>
              <div className="text-[11px] text-mutedDark mb-1">公鑰 Visual Randomart 氣泡圖鑑 (OpenSSH 規範):</div>
              <pre className="p-3 rounded-2xl bg-background/90 border border-border/80 font-mono text-[10px] text-emerald-400/90 leading-tight select-text overflow-x-auto">
                {visualArt}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/60 bg-background/50 flex flex-wrap items-center justify-end gap-2.5">
          <button
            onClick={() => handleDecision('reject')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              isMismatch 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/20' 
                : 'bg-sidebar hover:bg-card border border-border text-slate-300 hover:text-white'
            }`}
          >
            {isMismatch ? '立即中止連線 (推薦安全)' : '取消連線'}
          </button>

          {!isMismatch && (
            <button
              onClick={() => handleDecision('trust_once')}
              className="px-4 py-2 rounded-xl bg-sidebar hover:bg-card border border-border text-slate-200 hover:text-white text-xs font-semibold transition-all"
            >
              僅本次連線 (不儲存)
            </button>
          )}

          <button
            onClick={() => handleDecision('trust_always')}
            className={`px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
              isMismatch
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-primary hover:bg-primary-hover text-white shadow-primary/20'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isMismatch ? '覆寫並信任新密鑰 (高危險)' : '信任並記錄指紋'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
