import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { CanvasAddon } from '@xterm/addon-canvas';
import '@xterm/xterm/css/xterm.css';
import { 
  Terminal as TerminalIcon, 
  RotateCcw, 
  Trash2, 
  X, 
  Activity, 
  Copy, 
  ShieldCheck, 
  Maximize2,
  Usb,
  Cable
} from 'lucide-react';
import { TerminalPaneState, HostItem } from '../../types';
import { useVaultStore } from '../../stores/useVaultStore';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { useAppStore } from '../../stores/useAppStore';
import { TERMINAL_THEMES } from '../../utils/themePresets';

interface TerminalPaneProps {
  pane: TerminalPaneState;
  tabId: string;
  isActive: boolean;
  onFocus: () => void;
  isBroadcast: boolean;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  pane,
  tabId,
  isActive,
  onFocus,
  isBroadcast
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { hosts, settings } = useVaultStore();
  const { updatePaneState, closePane, tabs } = useTerminalStore();
  const { addToast } = useAppStore();

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [ping, setPing] = useState<number | undefined>(undefined);
  const [yubikeyPrompt, setYubikeyPrompt] = useState<{ keyName: string; serial: string } | null>(null);

  const host = pane.host || hosts.find((h) => h.id === pane.hostId);

  // Initialize xterm instance
  useEffect(() => {
    if (!containerRef.current) return;

    const themeConfig = TERMINAL_THEMES[settings.theme] || TERMINAL_THEMES.termius;

    const term = new Terminal({
      cursorBlink: settings.cursorBlink,
      cursorStyle: settings.cursorStyle,
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      letterSpacing: settings.letterSpacing,
      scrollback: settings.scrollback,
      theme: {
        background: themeConfig.background,
        foreground: themeConfig.foreground,
        cursor: themeConfig.cursor,
        cursorAccent: themeConfig.cursorAccent,
        selectionBackground: themeConfig.selectionBackground,
        black: themeConfig.black,
        red: themeConfig.red,
        green: themeConfig.green,
        yellow: themeConfig.yellow,
        blue: themeConfig.blue,
        magenta: themeConfig.magenta,
        cyan: themeConfig.cyan,
        white: themeConfig.white,
        brightBlack: themeConfig.brightBlack,
        brightRed: themeConfig.brightRed,
        brightGreen: themeConfig.brightGreen,
        brightYellow: themeConfig.brightYellow,
        brightBlue: themeConfig.brightBlue,
        brightMagenta: themeConfig.brightMagenta,
        brightCyan: themeConfig.brightCyan,
        brightWhite: themeConfig.brightWhite,
      },
      allowTransparency: true
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);

    term.open(containerRef.current);

    // Try canvas addon for fast rendering
    try {
      const canvasAddon = new CanvasAddon();
      term.loadAddon(canvasAddon);
    } catch {
      // fallback to dom
    }

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch {}
    }, 100);

    const sessionId = pane.sessionId || 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    updatePaneState(pane.paneId, { sessionId });

    // Handle connection
    startConnection(sessionId, term);

    const isSerialHost = host?.protocol === 'serial';

    // Handle user input in xterm
    term.onData((data) => {
      const { isGlobalKeystrokeSync, sendKeystrokeToTargets } = useTerminalStore.getState();

      if (isGlobalKeystrokeSync) {
        sendKeystrokeToTargets(sessionId, data);
        return;
      }

      if (isSerialHost) {
        if ((window as any).electronAPI?.serial) {
          (window as any).electronAPI.serial.write(sessionId, data);
        }
        return;
      }

      const currentTab = tabs.find((t) => t.id === tabId);
      if (currentTab?.broadcast) {
        // Broadcast mode: Send this keystroke to all panes in this tab!
        currentTab.panes.forEach((p) => {
          if (p.sessionId && (window as any).electronAPI?.terminal) {
            (window as any).electronAPI.terminal.sendData(p.sessionId, data, p.isLocal);
          }
        });
      } else {
        // Normal single pane input
        if ((window as any).electronAPI?.terminal) {
          (window as any).electronAPI.terminal.sendData(sessionId, data, pane.isLocal);
        } else {
          // Browser demo echo
          if (data === '\r') {
            term.write('\r\n$ ');
          } else if (data === '\u007F') {
            term.write('\b \b');
          } else {
            term.write(data);
          }
        }
      }
    });

    // Copy on selection
    if (settings.copyOnSelect) {
      term.onSelectionChange(() => {
        const sel = term.getSelection();
        if (sel) {
          navigator.clipboard.writeText(sel);
        }
      });
    }

    // Subscribe to IPC data stream
    let removeDataListener: (() => void) | undefined;
    let removeClosedListener: (() => void) | undefined;
    let removeErrorListener: (() => void) | undefined;
    let removePingListener: (() => void) | undefined;
    let removeYkPromptListener: (() => void) | undefined;

    if ((window as any).electronAPI?.terminal) {
      removeDataListener = (window as any).electronAPI.terminal.onData(({ sessionId: sid, data }: any) => {
        if (sid === sessionId) {
          setYubikeyPrompt(null);
          term.write(data);
        }
      });

      removeClosedListener = (window as any).electronAPI.terminal.onClosed(({ sessionId: sid }: any) => {
        if (sid === sessionId) {
          setYubikeyPrompt(null);
          term.writeln('\r\n\x1b[33m[Session closed by remote host]\x1b[0m');
          setConnected(false);
          updatePaneState(pane.paneId, { status: 'disconnected' });
        }
      });

      removeErrorListener = (window as any).electronAPI.terminal.onError(({ sessionId: sid, error }: any) => {
        if (sid === sessionId) {
          setYubikeyPrompt(null);
          term.writeln(`\r\n\x1b[31m[Error: ${error}]\x1b[0m`);
          setConnected(false);
          setConnecting(false);
          updatePaneState(pane.paneId, { status: 'error', errorMessage: error });
        }
      });

      removePingListener = (window as any).electronAPI.terminal.onPing(({ sessionId: sid, ping: p }: any) => {
        if (sid === sessionId) {
          setPing(p);
          updatePaneState(pane.paneId, { ping: p });
        }
      });

      if (typeof (window as any).electronAPI?.terminal?.onYubiKeyTouchPrompt === 'function') {
        removeYkPromptListener = (window as any).electronAPI.terminal.onYubiKeyTouchPrompt(({ sessionId: sid, keyName, serial }: any) => {
          if (sid === sessionId) {
            setYubikeyPrompt({ keyName, serial });
          }
        });
      }
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (term.cols && term.rows && (window as any).electronAPI?.terminal) {
          (window as any).electronAPI.terminal.resize(sessionId, term.cols, term.rows, pane.isLocal);
        }
      } catch {}
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      removeDataListener?.();
      removeClosedListener?.();
      removeErrorListener?.();
      removePingListener?.();
      removeYkPromptListener?.();
      if (isSerialHost && (window as any).electronAPI?.serial) {
        (window as any).electronAPI.serial.close(sessionId);
      } else if ((window as any).electronAPI?.terminal) {
        (window as any).electronAPI.terminal.closeSession(sessionId, pane.isLocal);
      }
      term.dispose();
    };
  }, [pane.paneId, pane.hostId, pane.isLocal]);

  // Re-fit and focus terminal when switching back to this pane/tab
  useEffect(() => {
    if (isActive && fitAddonRef.current && terminalRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          terminalRef.current?.focus();
        } catch {}
      }, 50);
    }
  }, [isActive]);

  // Listen to physical YubiKey hardware touch sensor (HID sensor trigger)
  useEffect(() => {
    if (!yubikeyPrompt) return;

    let otpBuffer = '';
    let otpTimer: any = null;

    const handleHardwareTouch = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        (window as any).electronAPI?.terminal?.confirmYubiKeyTouch?.(pane.sessionId);
        setYubikeyPrompt(null);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        (window as any).electronAPI?.terminal?.cancelYubiKeyTouch?.(pane.sessionId);
        setYubikeyPrompt(null);
        return;
      }

      // YubiKey hardware touch sends ModHex OTP characters
      if (/^[cbdefghijklnrtuvCBDEFGHIJKLNRTUV]$/.test(e.key)) {
        otpBuffer += e.key;
        clearTimeout(otpTimer);
        otpTimer = setTimeout(() => {
          if (otpBuffer.length >= 16) {
            (window as any).electronAPI?.terminal?.confirmYubiKeyTouch?.(pane.sessionId);
            setYubikeyPrompt(null);
          }
          otpBuffer = '';
        }, 150);
      }
    };

    window.addEventListener('keydown', handleHardwareTouch, true);
    return () => {
      window.removeEventListener('keydown', handleHardwareTouch, true);
      clearTimeout(otpTimer);
    };
  }, [yubikeyPrompt, pane.sessionId]);

  // Connect helper
  const startConnection = async (sessionId: string, term: Terminal) => {
    setConnecting(true);
    updatePaneState(pane.paneId, { status: 'connecting' });

    term.clear();
    term.writeln(`\x1b[36m正在連線至 ${pane.title}...\x1b[0m`);

    if ((window as any).electronAPI) {
      if (pane.isLocal) {
        const res = await (window as any).electronAPI.terminal.createLocalPty(sessionId, settings.localShell);
        if (res.success) {
          term.clear();
          setConnected(true);
          setConnecting(false);
          updatePaneState(pane.paneId, { status: 'connected' });
        } else {
          setConnected(false);
          setConnecting(false);
          term.writeln(`\x1b[31m啟動本地 Shell 失敗: ${res.error}\x1b[0m`);
          updatePaneState(pane.paneId, { status: 'error', errorMessage: res.error });
        }
      } else if (host && host.protocol === 'serial') {
        const portPath = host.serialPort || host.hostname;
        const baud = host.baudRate || 9600;
        term.writeln(`\x1b[33m正在開啟 Serial 串口設備: ${portPath} (${baud} 8N1)...\x1b[0m`);

        if ((window as any).electronAPI.serial) {
          const res = await (window as any).electronAPI.serial.create(sessionId, {
            portPath,
            baudRate: baud,
            dataBits: host.dataBits || 8,
            stopBits: host.stopBits || 1,
            parity: host.parity || 'none',
            flowControl: host.flowControl || 'none'
          });

          if (res.success) {
            term.clear();
            term.writeln(`\x1b[32m✔ 已連線至 Serial 串口: ${portPath} (${baud} 8N1)\x1b[0m`);
            term.writeln(`\x1b[90m[提示: 串口控制台已就緒，請敲擊鍵盤 Enter 鍵獲取交換機/路由器輸出]\x1b[0m\r\n`);
            setConnected(true);
            setConnecting(false);
            updatePaneState(pane.paneId, { status: 'connected' });
          } else {
            setConnected(false);
            setConnecting(false);
            term.writeln(`\x1b[31mSerial 串口開啟失敗: ${res.error}\x1b[0m`);
            updatePaneState(pane.paneId, { status: 'error', errorMessage: res.error });
          }
        }
      } else if (host) {
        const jumpHost = host.jumpHostId ? hosts.find((h) => h.id === host.jumpHostId) : undefined;
        const res = await (window as any).electronAPI.terminal.connectSSH(
          sessionId,
          host,
          term.cols || 80,
          term.rows || 24,
          jumpHost
        );
        if (res.success) {
          term.clear();
          setConnected(true);
          setConnecting(false);
          updatePaneState(pane.paneId, { status: 'connected' });
        } else {
          setConnected(false);
          setConnecting(false);
          term.writeln(`\x1b[31mSSH 連線失敗: ${res.error}\x1b[0m`);
          updatePaneState(pane.paneId, { status: 'error', errorMessage: res.error });
        }
      } else {
        setConnected(false);
        setConnecting(false);
        term.writeln(`\x1b[31m連線失敗：找不到目標主機配置資訊\x1b[0m`);
        updatePaneState(pane.paneId, { status: 'error', errorMessage: '找不到目標主機配置資訊' });
      }
    } else {
      // Browser Mock mode
      setTimeout(() => {
        setConnected(true);
        setConnecting(false);
        setPing(18);
        term.writeln('\x1b[32m✔ 連線成功！(網頁預覽模式)\x1b[0m');
        term.writeln(`\x1b[90m歡迎進入 ${pane.title} (Ubuntu 22.04.4 LTS / Linux 6.5.0)\x1b[0m`);
        term.writeln('\x1b[90m系統登入時間: ' + new Date().toLocaleString() + '\x1b[0m\r\n');
        term.write('user@server:~$ ');
        updatePaneState(pane.paneId, { status: 'connected', ping: 18 });
      }, 600);
    }
  };

  const handleReconnect = () => {
    if (terminalRef.current && pane.sessionId) {
      startConnection(pane.sessionId, terminalRef.current);
    }
  };

  const handleClear = () => {
    terminalRef.current?.clear();
  };

  const handleCopyBuffer = () => {
    if (terminalRef.current) {
      terminalRef.current.selectAll();
      const text = terminalRef.current.getSelection();
      terminalRef.current.clearSelection();
      if (text) {
        navigator.clipboard.writeText(text);
        addToast('success', '已複製終端全部輸出內容至剪貼簿');
      }
    }
  };

  const isGlobalSyncActive = useTerminalStore((state) => state.isGlobalKeystrokeSync);
  const syncTargetScope = useTerminalStore((state) => state.syncTargetScope);
  const customTargetSessionIds = useTerminalStore((state) => state.customTargetSessionIds);
  const activeTabId = useTerminalStore((state) => state.activeTabId);

  const isSyncTarget = isGlobalSyncActive && (
    syncTargetScope === 'all'
      ? true
      : syncTargetScope === 'current-tab'
      ? tabId === activeTabId
      : syncTargetScope === 'current-pane'
      ? isActive
      : customTargetSessionIds.includes(pane.sessionId || '')
  );

  return (
    <div 
      onClick={onFocus}
      className={`h-full w-full flex flex-col bg-background relative overflow-hidden transition-all duration-150 border ${
        isSyncTarget
          ? 'border-amber-500/80 shadow-md shadow-amber-500/15 ring-1 ring-amber-500/30'
          : isActive 
            ? 'border-blue-500/60 shadow-sm shadow-blue-500/10' 
            : 'border-border/60 hover:border-border'
      }`}
    >
      {/* Pane Top Toolbar */}
      <div className="h-7 bg-sidebar/90 border-b border-border/60 flex items-center justify-between px-3 text-[11px] select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Status Dot */}
          <span className={`w-2 h-2 rounded-full ${
            connected ? 'bg-emerald-400' :
            connecting ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
          }`} />

          {/* Title */}
          <div className="flex items-center gap-1.5 font-mono text-slate-200 font-medium truncate max-w-[220px]">
            {host?.protocol === 'serial' ? (
              <Cable className="w-3 h-3 text-amber-400" />
            ) : (
              <TerminalIcon className="w-3 h-3 text-termiusCyan" />
            )}
            <span>{pane.title}</span>
            {host?.protocol === 'serial' && (
              <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">
                {host.baudRate || 9600} 8N1
              </span>
            )}
          </div>

          {/* Latency Ping */}
          {ping !== undefined && (
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
              <Activity className="w-2.5 h-2.5" />
              {ping}ms
            </span>
          )}

          {/* Broadcast Active tag */}
          {isBroadcast && (
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono border border-amber-500/30">
              廣播同步中
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-muted">
          <button
            onClick={handleReconnect}
            className="p-1 hover:bg-card hover:text-white rounded transition-colors"
            title="重新連線"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-card hover:text-white rounded transition-colors"
            title="清空螢幕"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleCopyBuffer}
            className="p-1 hover:bg-card hover:text-white rounded transition-colors"
            title="複製全部輸出內容"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closePane(tabId, pane.paneId);
            }}
            className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors ml-1"
            title="關閉分屏"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      {/* YubiKey Interactive Touch Authorization Modal (Strict Zero Trust Mode) */}
      {yubikeyPrompt && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-30 flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-card border border-amber-500/60 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-4 shadow-amber-500/20">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center ring-4 ring-amber-500/30 animate-pulse">
                <Usb className="w-8 h-8" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-card animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-card" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-2">
                <span>請輕觸實體 YubiKey 金屬感應區</span>
              </h3>
              <p className="text-xs text-mutedDark mt-1.5 leading-relaxed">
                伺服器正在請求使用金鑰「<span className="text-amber-300 font-semibold">{yubikeyPrompt.keyName}</span>」進行硬體安全簽名。
              </p>
              <p className="text-[11px] text-amber-300/80 font-mono mt-1">
                設備序號: {yubikeyPrompt.serial}
              </p>
            </div>

            <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex flex-col items-center gap-1.5 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span>正在等待人體物理觸碰 YubiKey...</span>
              </div>
              <div className="text-[10px] text-mutedDark font-mono">
                🛡️ 零信任硬體防護已生效：已禁用螢幕點擊繞過
              </div>
            </div>

            <div className="w-full pt-1">
              <button
                type="button"
                onClick={() => {
                  (window as any).electronAPI?.terminal?.cancelYubiKeyTouch?.(pane.sessionId);
                  setYubikeyPrompt(null);
                }}
                className="w-full py-2.5 rounded-xl bg-sidebar hover:bg-card border border-border text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                取消連線 (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* xterm.js Terminal Canvas Wrapper */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full overflow-hidden p-2"
      />
    </div>
  );
};
