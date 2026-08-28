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
  Activity,
  Sparkles,
  Bot,
  Eye,
  EyeOff,
  Globe,
  SlidersHorizontal
} from 'lucide-react';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';
import { TERMINAL_THEMES } from '../../utils/themePresets';
import { TerminalThemeId, AIProvider, AIModelConfig } from '../../types';
import { PROVIDER_PRESETS, AIService } from '../../services/aiService';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, knownHosts, removeKnownHost, canTouchId, promptTouchId, loadVault } = useVaultStore();
  const { addToast } = useAppStore();

  // AI Config States
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const aiConfig: AIModelConfig = settings.aiConfig || {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    temperature: 0.3,
    maxTokens: 4096,
    enableTerminalContext: true,
    dangerousCommandWarning: true
  };

  const handleUpdateAIConfig = (updates: Partial<AIModelConfig>) => {
    updateSettings({
      aiConfig: {
        ...aiConfig,
        ...updates
      }
    });
    setAiTestResult(null);
  };

  const handleTestAIConnection = async () => {
    setTestingAI(true);
    setAiTestResult(null);
    try {
      const res = await AIService.testConnection(aiConfig);
      setAiTestResult(res);
      if (res.success) {
        addToast('success', res.message);
      } else {
        addToast('error', res.message);
      }
    } catch (err: any) {
      setAiTestResult({ success: false, message: err.message || '測試失敗' });
      addToast('error', err.message || '測試失敗');
    } finally {
      setTestingAI(false);
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
          自定義 ITGeek 終端主題、字體排版、AI 智能體模型、生物識別金庫與跨平台加密備份
        </p>
      </div>

      <div className="space-y-8 max-w-4xl py-6 pb-16">
        {/* Section 0: AI Agent & Multi-Provider LLM Settings */}
        <div className="bg-card border border-purple-500/40 rounded-2xl p-5 space-y-5 shadow-sm shadow-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>AI 伺服器終端智能體 (AI Agent & LLM Providers)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-medium border border-purple-500/30">
                    Termius-Style AI
                  </span>
                </h2>
                <p className="text-xs text-mutedDark">
                  支援 GPT-5.6、Claude 5、Gemini 3.7、DeepSeek-V4、Qwen3、Kimi K3、GLM-5.3、Ollama 等 11+ 服務商
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestAIConnection}
              disabled={testingAI}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 shadow-purple-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingAI ? 'animate-spin' : ''}`} />
              <span>{testingAI ? '正在驗證連線...' : '測試模型連線'}</span>
            </button>
          </div>

          {/* Test Feedback Banner */}
          {aiTestResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
              aiTestResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {aiTestResult.success ? <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
              <span>{aiTestResult.message}</span>
            </div>
          )}

          {/* Provider Selection Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300">選擇 AI 模型服務商 (Provider)</label>
              <span className="text-[10px] text-mutedDark font-mono">支援 11+ 家主流雲端與本地端點</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {(Object.keys(PROVIDER_PRESETS) as AIProvider[]).map((provKey) => {
                const prov = PROVIDER_PRESETS[provKey];
                const isSelected = aiConfig.provider === provKey;
                return (
                  <button
                    key={provKey}
                    type="button"
                    onClick={() => {
                      const firstModel = prov.models[0]?.id || 'custom-model';
                      handleUpdateAIConfig({
                        provider: provKey,
                        model: firstModel,
                        baseUrl: prov.defaultBaseUrl
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow-sm shadow-purple-500/20 font-semibold ring-1 ring-purple-500/30'
                        : 'bg-background border-border/60 hover:border-border text-slate-400 hover:text-slate-200 hover:bg-cardHover'
                    }`}
                  >
                    <div className="text-xs truncate font-medium">{prov.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-mutedDark font-mono mt-0.5 truncate">
                      {provKey === 'ollama' ? 'Local' : provKey === 'custom' ? 'Custom' : 'Cloud API'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key & Endpoint Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* API Key */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                API 密鑰 (API Key)
                {aiConfig.provider === 'ollama' && <span className="text-mutedDark ml-1">(本地 Ollama 預設免 Key)</span>}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={aiConfig.apiKey || ''}
                  onChange={(e) => handleUpdateAIConfig({ apiKey: e.target.value })}
                  placeholder={aiConfig.provider === 'ollama' ? '可留空 (本地免認證)' : 'sk-********************************'}
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-background border border-border focus:border-purple-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-slate-200 transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Base URL (Endpoint) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                API 服務位址 (Base URL)
              </label>
              <input
                type="text"
                value={aiConfig.baseUrl !== undefined ? aiConfig.baseUrl : (PROVIDER_PRESETS[aiConfig.provider]?.defaultBaseUrl || '')}
                onChange={(e) => handleUpdateAIConfig({ baseUrl: e.target.value })}
                placeholder={PROVIDER_PRESETS[aiConfig.provider]?.defaultBaseUrl || 'https://api.example.com/v1'}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-purple-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono transition-colors"
              />
            </div>
          </div>

          {/* Model Selector & Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Model Name with Preset Select + Custom Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                模型名稱 (Model ID)
              </label>
              
              {PROVIDER_PRESETS[aiConfig.provider]?.models.length > 0 && (
                <select
                  value={PROVIDER_PRESETS[aiConfig.provider].models.some((m) => m.id === aiConfig.model) ? aiConfig.model : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom__') {
                      handleUpdateAIConfig({ model: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-background border border-border focus:border-purple-500 text-xs text-slate-100 focus:outline-none font-mono"
                >
                  {PROVIDER_PRESETS[aiConfig.provider].models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                  <option value="__custom__">⚙️ 自訂其他模型名稱...</option>
                </select>
              )}

              {/* Editable input allows typing any specific model version/ID */}
              <input
                type="text"
                value={aiConfig.model}
                onChange={(e) => handleUpdateAIConfig({ model: e.target.value })}
                placeholder="或手動輸入模型名稱 (例: gpt-4.5-preview, claude-3-7-sonnet)"
                className="w-full px-3 py-1.5 rounded-xl bg-background border border-border/70 focus:border-purple-500 text-xs text-slate-200 placeholder-mutedDark focus:outline-none font-mono"
              />
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">溫度 (Temperature: 建議 0.1~0.4)</label>
                <span className="text-xs text-muted font-mono">{aiConfig.temperature ?? 0.3}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={aiConfig.temperature ?? 0.3}
                onChange={(e) => handleUpdateAIConfig({ temperature: parseFloat(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Max Output Tokens */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">最大輸出長度 (Max Tokens)</label>
              <input
                type="number"
                min="256"
                max="32768"
                step="512"
                value={aiConfig.maxTokens || 4096}
                onChange={(e) => handleUpdateAIConfig({ maxTokens: parseInt(e.target.value) || 4096 })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-purple-500 text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* AI Grounding & Safety Feature Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60">
              <div>
                <div className="text-xs font-semibold text-slate-200">終端畫面自動情境感知</div>
                <div className="text-[11px] text-mutedDark">提問時自動附加終端最新輸出，以便診斷錯誤日誌</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiConfig.enableTerminalContext !== false}
                  onChange={(e) => handleUpdateAIConfig({ enableTerminalContext: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 border border-border"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60">
              <div>
                <div className="text-xs font-semibold text-slate-200">高危指令防呆警示阻攔</div>
                <div className="text-[11px] text-mutedDark">執行 rm -rf /、dd、重啟等破壞性指令前跳出防護彈窗</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiConfig.dangerousCommandWarning !== false}
                  onChange={(e) => handleUpdateAIConfig({ dangerousCommandWarning: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 border border-border"></div>
              </label>
            </div>
          </div>

          {/* Custom System Prompt */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              自訂系統提示詞附加條款 (Custom System Prompt)
            </label>
            <textarea
              rows={2}
              value={aiConfig.customSystemPrompt || ''}
              onChange={(e) => handleUpdateAIConfig({ customSystemPrompt: e.target.value })}
              placeholder="例如：我主要使用 Debian 伺服器，習慣使用 Podman 代替 Docker，請優先提供 podman 指令..."
              className="w-full p-2.5 rounded-xl bg-background border border-border focus:border-purple-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-sans transition-colors resize-none no-scrollbar"
            />
          </div>
        </div>

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
