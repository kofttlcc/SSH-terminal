import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { X, Save, FileCode, Check } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useSftpStore } from '../../stores/useSftpStore';

export const FileEditorModal: React.FC = () => {
  const { fileEditorModal, setFileEditorModal, addToast } = useAppStore();
  const { saveRemoteFileContent } = useSftpStore();

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fileEditorModal) {
      setContent(fileEditorModal.content);
    }
  }, [fileEditorModal]);

  if (!fileEditorModal) return null;

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'html':
        return 'html';
      case 'css':
      case 'scss':
        return 'css';
      case 'py':
        return 'python';
      case 'sh':
      case 'bash':
      case 'zsh':
        return 'shell';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'xml':
        return 'xml';
      case 'md':
        return 'markdown';
      case 'conf':
      case 'ini':
      case 'env':
        return 'ini';
      default:
        return 'plaintext';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveRemoteFileContent(fileEditorModal.remotePath, content);
    setSaving(false);
    if (success) {
      addToast('success', `已儲存遠端檔案 ${fileEditorModal.filename}`);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
      onClick={() => setFileEditorModal(null)}
    >
      <div 
        className="w-full max-w-5xl h-[85vh] bg-card border border-border/80 rounded-2xl shadow-modal overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-5 bg-sidebar border-b border-border/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-blue-400" />
            <div>
              <span className="font-mono text-xs font-semibold text-slate-100">
                {fileEditorModal.filename}
              </span>
              <span className="text-[11px] text-mutedDark font-mono ml-2">
                ({fileEditorModal.remotePath})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-medium shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? '儲存中...' : '儲存至遠端'}</span>
            </button>

            <button
              onClick={() => setFileEditorModal(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-card transition-colors"
              title="關閉編輯器"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-1 w-full h-full overflow-hidden bg-[#1e1e1e]">
          <Editor
            height="100%"
            language={getLanguage(fileEditorModal.filename)}
            value={content}
            theme="vs-dark"
            onChange={(val) => setContent(val || '')}
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              automaticLayout: true
            }}
          />
        </div>

        {/* Footer */}
        <div className="h-7 px-4 bg-sidebar border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-mutedDark">
          <span>語言模式: {getLanguage(fileEditorModal.filename)}</span>
          <span>按「儲存至遠端」或點擊右上角 ✕ 關閉</span>
        </div>
      </div>
    </div>
  );
};
