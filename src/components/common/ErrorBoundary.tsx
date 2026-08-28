import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-background text-slate-100 select-none">
          <div className="max-w-md w-full bg-card border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-100">
                {this.props.fallbackTitle || '畫面載入發生異常'}
              </h2>
              <p className="text-xs text-mutedDark mt-1">
                應用程式捕捉到渲染錯誤，已自動進行安全隔離，保護您的終端會話與資料。
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-background/80 border border-border text-left font-mono text-[11px] text-rose-300 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                {this.state.error.toString()}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新整理畫面</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
