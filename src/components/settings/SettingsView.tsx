import React, { useState } from 'react';
import { 
  Settings, 
  Palette, 
  Type, 
  Terminal, 
  ShieldCheck, 
  Download, 
  Upload, 
  Lock, 
  Check, 
  Sliders,
  Fingerprint,
  Server,
  Trash2,
  Search,
  KeyRound,
  Copy,
  AlertCircle,
  FileCode,
  FileCheck,
  RefreshCw,
  Layers,
  ArrowRight,
  Shield,
  Cable,
  Activity
} from 'lucide-react';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';
import { TERMINAL_THEMES } from '../../utils/themePresets';
import { TerminalThemeId } from '../../types';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, knownHosts, removeKnownHost, canTouchId, promptTouchId, loadVault } = useVaultStore();
  const { addToast } = useAppStore();

  // Export States
  const [exportPassword, setExportPassword] = useState('');
  const [exportEncrypted, setExportEncrypted] = useState(true);

  // Import States
  const [importFileContent, setImportFileContent] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'overwrite' | 'selective'>('merge');
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedSnippets, setSelectedSnippets] = useState<string[]>([]);

  // Known Hosts States
  const [knownHostSearch, setKnownHostSearch] = useState('');
  const [copiedFingerprintId, setCopiedFingerprintId] = useState<string | null>(null);

  const themes = Object.values(TERMINAL_THEMES);

  const filteredKnownHosts = knownHosts.filter((kh) =>
    kh.hostname.toLowerCase().includes(knownHostSearch.toLowerCase()) ||
    kh.fingerprint.toLowerCase().includes(knownHostSearch.toLowerCase()) ||
    kh.keyType.toLowerCase().includes(knownHostSearch.toLowerCase())
  );

  const handleTestTouchId = async () => {
    const ok = await promptTouchId('正在測試 macOS Touch ID 指紋識別功能');
    if (ok) {
      addToast('success', 'Touch ID 指紋識別測試成功！');
    } else {
      addToast('warning', 'Touch ID 指紋識別未通過或已取消');
    }
  };

  const handleCopyFingerprint = (id: string, fp: string) => {
    navigator.clipboard.writeText(fp);
    setCopiedFingerprintId(id);
    addToast('info', '已複製主機指紋至剪貼簿');
    setTimeout(() => setCopiedFingerprintId(null), 2000);
  };

  const handleExportVault = async () => {
    try {
      if (exportEncrypted && !exportPassword.trim()) {
        addToast('warning', '請輸入用於加密金庫的主密碼，或取消勾選「密碼加密保護」');
        return;
      }

      if ((window as any).electronAPI?.vault) {
        const pwd = exportEncrypted ? exportPassword.trim() : undefined;
        const exportedStr = await (window as any).electronAPI.vault.exportVault(pwd);
        const blob = new Blob([exportedStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = exportEncrypted ? 'itgeek-vault' : 'json';
        a.download = `itgeek_vault_backup_${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('success', `已成功匯出${exportEncrypted ? '高強度加密 (AES-256-GCM)' : '明文'}金庫備份檔案`);
      } else {
        addToast('success', '已觸發匯出金庫（瀏覽器預覽）');
      }
    } catch (err: any) {
      addToast('error', err.message || '匯出失敗');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportFileContent(content);
      runPreview(content, importPassword);
    };
    reader.readAsText(file);
  };

  const runPreview = async (content: string, password?: string) => {
    if (!content.trim()) return;
    setPreviewLoading(true);
    try {
      if ((window as any).electronAPI?.vault?.previewImport) {
        const res = await (window as any).electronAPI.vault.previewImport(content.trim(), password || undefined);
        setImportPreview(res);
        if (res.success && res.previewData) {
          setSelectedHosts((res.previewData.hosts || []).map((h: any) => h.id));
          setSelectedKeys((res.previewData.keys || []).map((k: any) => k.id));
          setSelectedSnippets((res.previewData.snippets || []).map((s: any) => s.id));
        }
      }
    } catch (err: any) {
      console.error('Failed to preview import:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFileContent.trim()) {
      addToast('warning', '請先選擇或貼上備份金庫檔案');
      return;
    }

    try {
      if ((window as any).electronAPI?.vault) {
        const selection = importMode === 'selective' ? {
          hostIds: selectedHosts,
          keyIds: selectedKeys,
          snippetIds: selectedSnippets
        } : undefined;

        const res = await (window as any).electronAPI.vault.importVault(
          importFileContent.trim(),
          importPassword || undefined,
          importMode,
          selection
        );

        if (res.success) {
          addToast('success', `金庫還原成功！(${importMode === 'merge' ? '智慧增量合併' : importMode === 'overwrite' ? '全量覆蓋' : '選擇性匯入'})`);
          await loadVault();
          setImportFileContent('');
          setImportFileName('');
          setImportPassword('');
          setImportPreview(null);
        } else {
          addToast('error', `匯入失敗: ${res.error}`);
        }
      }
    } catch (err: any) {
      addToast('error', err.message || '匯入發生錯誤');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-y-auto p-6 select-none no-scrollbar">
      {/* Header */}
      <div className="pb-4 border-b border-border/60">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>偏好設定與安全中心</span>
        </h1>
        <p className="text-xs text-mutedDark mt-0.5">
          自定義 ITGeek 終端主題、字體排版、生物識別金庫與 macOS / Windows 跨平台加密備份
        </p>
      </div>

      <div className="space-y-8 max-w-4xl py-6 pb-16">
        {/* Section 1: Biometrics & Touch ID / Windows Hello */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>生物識別安全保護 (Touch ID / Windows Hello)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    canTouchId ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-sidebar text-muted border border-border'
                  }`}>
                    {canTouchId ? '硬體支援就緒' : '未檢測到生物識別硬體'}
                  </span>
                </h2>
                <p className="text-xs text-mutedDark">
                  支援調用本地指紋/面容識別保護 SSH 私鑰使用與主機連線授權
                </p>
              </div>
            </div>

            {canTouchId && (
              <button
                onClick={handleTestTouchId}
                className="px-3.5 py-1.5 rounded-xl bg-sidebar hover:bg-cardHover border border-border text-xs font-semibold text-slate-200 transition-all shadow-sm active:scale-95"
              >
                測試指紋授權
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60">
              <div>
                <div className="text-xs font-semibold text-slate-200">全域主機連線保護</div>
                <div className="text-[11px] text-mutedDark">連線至任何主機時均需先按壓指紋</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canTouchId}
                  checked={settings.touchIdForHosts}
                  onChange={(e) => updateSettings({ touchIdForHosts: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 border border-border peer-disabled:opacity-40"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60">
              <div>
                <div className="text-xs font-semibold text-slate-200">金庫安全鎖定</div>
                <div className="text-[11px] text-mutedDark">解鎖金庫與檢視明文密鑰時驗證指紋</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canTouchId}
                  checked={settings.touchIdEnabled}
                  onChange={(e) => updateSettings({ touchIdEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 border border-border peer-disabled:opacity-40"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Known Hosts & Security Fingerprints */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>已受信任的遠端主機公鑰指紋 (Known Hosts)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sidebar text-slate-300 font-mono font-medium border border-border">
                    共 {knownHosts.length} 台
                  </span>
                </h2>
                <p className="text-xs text-mutedDark">
                  管理已連線並信任的遠端 SSH 伺服器主機公鑰與指紋，防止中間人攻擊 (MITM)
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-mutedDark absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={knownHostSearch}
              onChange={(e) => setKnownHostSearch(e.target.value)}
              placeholder="搜尋主機名稱、IP 或指紋..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 no-scrollbar">
            {filteredKnownHosts.length > 0 ? (
              filteredKnownHosts.map((kh) => (
                <div
                  key={kh.id}
                  className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center justify-between text-xs hover:border-border transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{kh.hostname}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sidebar text-muted font-mono">
                        {kh.keyType}
                      </span>
                    </div>
                    <div className="text-[10px] text-mutedDark font-mono truncate mt-0.5">
                      {kh.fingerprint}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleCopyFingerprint(kh.id, kh.fingerprint)}
                      className="p-1 rounded-lg hover:bg-card text-muted hover:text-slate-200 transition-colors"
                      title="複製指紋"
                    >
                      {copiedFingerprintId === kh.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => removeKnownHost(kh.id)}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                      title="移除信任"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-mutedDark text-xs font-mono">
                {knownHosts.length === 0 ? '目前尚無已儲存的主機指紋記錄' : '查無符合的主機指紋'}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Themes */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-400" />
            <span>終端配色主題</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {themes.map((theme) => {
              const isSelected = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => updateSettings({ theme: theme.id as TerminalThemeId })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm shadow-primary/20'
                      : 'bg-background border-border/60 hover:border-border hover:bg-cardHover'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200">{theme.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <div className="flex gap-1">
                    {[theme.red, theme.green, theme.yellow, theme.blue, theme.magenta, theme.cyan].map(
                      (color, idx) => (
                        <div key={idx} className="w-4 h-3 rounded-sm" style={{ backgroundColor: color }} />
                      )
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Typography & Cursor */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Type className="w-4 h-4 text-termiusCyan" />
            <span>字體排版與游標樣式</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">字體名稱 (Font Family)</label>
              <input
                type="text"
                value={settings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">字體大小 (Font Size)</label>
                <span className="text-xs text-muted font-mono">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="24"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">游標形狀 (Cursor Style)</label>
              <select
                value={settings.cursorStyle}
                onChange={(e) => updateSettings({ cursorStyle: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
              >
                <option value="block">方塊區塊 █</option>
                <option value="underline">底線樣式 _</option>
                <option value="bar">垂直游標條 |</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">游標平滑閃爍</label>
              <div className="flex items-center h-9">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.cursorBlink}
                    onChange={(e) => updateSettings({ cursorBlink: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-background peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                  <span className="ml-2 text-xs text-slate-300">
                    {settings.cursorBlink ? '已啟用' : '已停用'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">選取文字自動複製</label>
              <div className="flex items-center h-9">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.copyOnSelect}
                    onChange={(e) => updateSettings({ copyOnSelect: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-background peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                  <span className="ml-2 text-xs text-slate-300">
                    {settings.copyOnSelect ? '已啟用' : '已停用'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Cross-Platform Vault Backup & Encrypted Transfer (macOS ↔ Windows) */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>金庫備份與跨平台傳輸 (macOS ↔ Windows 互通)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">
                    AES-256-GCM · 300k KDF
                  </span>
                </h2>
                <p className="text-xs text-mutedDark">
                  支援將全部主機配置、SSH 密鑰、分組與指令庫進行高強度加密備份，隨時在 Mac 與 Windows 間無縫還原
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Export Column */}
            <div className="space-y-3.5 p-4 rounded-xl bg-background border border-border/60 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>匯出金庫檔案</span>
                  </h3>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportEncrypted}
                      onChange={(e) => setExportEncrypted(e.target.checked)}
                      className="w-3.5 h-3.5 accent-primary rounded"
                    />
                    <span>密碼加密保護</span>
                  </label>
                </div>

                {exportEncrypted ? (
                  <div>
                    <label className="block text-[11px] text-mutedDark mb-1">
                      設定解密主密碼 (跨平台還原時需輸入) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                      placeholder="請設定強度充足的主加密密碼..."
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
                    />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300/90 leading-relaxed">
                    ⚠️ 提醒：您選擇了明文匯出 JSON。該檔案將包含未加密的主機與金鑰配置，請妥善保管。
                  </div>
                )}
              </div>

              <button
                onClick={handleExportVault}
                className="w-full py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>立即匯出備份檔案 ({exportEncrypted ? '.itgeek-vault' : '.json'})</span>
              </button>
            </div>

            {/* Import Column */}
            <div className="space-y-3.5 p-4 rounded-xl bg-background border border-border/60 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>匯入與還原金庫檔案</span>
                </h3>

                {/* File Upload Selector */}
                <div className="flex items-center gap-2">
                  <label className="flex-1 px-3 py-2 rounded-xl bg-card border border-border/80 hover:border-emerald-500/50 text-xs text-slate-300 hover:text-white cursor-pointer transition-all flex items-center justify-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{importFileName || '選擇 .itgeek-vault / .json 檔案'}</span>
                    <input
                      type="file"
                      accept=".json,.itgeek-vault,.sshvault,.enc"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Password & Preview Verification */}
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={importPassword}
                    onChange={(e) => {
                      setImportPassword(e.target.value);
                      if (importFileContent) {
                        runPreview(importFileContent, e.target.value);
                      }
                    }}
                    placeholder="若檔案已加密，請輸入主解密密碼..."
                    className="flex-1 px-3 py-2 rounded-xl bg-card border border-border focus:border-emerald-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => runPreview(importFileContent, importPassword)}
                    disabled={!importFileContent || previewLoading}
                    className="px-3 py-2 rounded-xl bg-card hover:bg-cardHover border border-border text-xs font-semibold text-slate-200 transition-colors disabled:opacity-40"
                    title="重新驗證密碼並預覽"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${previewLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Preview Summary Card */}
                {importPreview && (
                  <div className="p-3 rounded-xl bg-card/80 border border-border/80 space-y-2 animate-fade-in text-xs">
                    {importPreview.success && importPreview.summary ? (
                      <div>
                        <div className="flex items-center justify-between text-emerald-400 font-semibold mb-1">
                          <span className="flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>驗證成功 (來源: {importPreview.platform === 'win32' ? 'Windows' : 'macOS'})</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
                          <div className="p-1.5 rounded-lg bg-background text-center">
                            主機: <strong className="text-white">{importPreview.summary.hostCount}</strong> 台
                          </div>
                          <div className="p-1.5 rounded-lg bg-background text-center">
                            密鑰: <strong className="text-white">{importPreview.summary.keyCount}</strong> 組
                          </div>
                          <div className="p-1.5 rounded-lg bg-background text-center">
                            指令: <strong className="text-white">{importPreview.summary.snippetCount}</strong> 條
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-rose-400 flex items-center gap-1.5 text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{importPreview.error || '請輸入正確的主解密密碼'}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Import Mode Radio Switcher */}
                {importPreview?.success && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-[11px] text-mutedDark font-medium">合併模式策略：</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                          importMode === 'merge'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50'
                            : 'bg-card text-muted hover:text-slate-200 border-border/60'
                        }`}
                      >
                        <div>🔄 智慧增量合併</div>
                        <div className="text-[10px] font-normal text-mutedDark mt-0.5">保持現有並新增</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('overwrite')}
                        className={`p-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                          importMode === 'overwrite'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/50'
                            : 'bg-card text-muted hover:text-slate-200 border-border/60'
                        }`}
                      >
                        <div>⚠️ 全量完全覆蓋</div>
                        <div className="text-[10px] font-normal text-mutedDark mt-0.5">完全替換現有金庫</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleExecuteImport}
                disabled={!importFileContent || !importPreview?.success}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>執行還原金庫 ({importMode === 'merge' ? '智慧增量' : '全量覆蓋'})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
