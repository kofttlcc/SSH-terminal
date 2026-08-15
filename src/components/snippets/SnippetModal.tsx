import React, { useState, useEffect } from 'react';
import { X, Zap, Code, Tag, Info } from 'lucide-react';
import { Snippet } from '../../types';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';
import { extractSnippetVariables } from '../../utils/snippets';

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSnippet?: Snippet | null;
}

export const SnippetModal: React.FC<SnippetModalProps> = ({ isOpen, onClose, initialSnippet }) => {
  const { addSnippet, updateSnippet } = useVaultStore();
  const { addToast } = useAppStore();

  const [title, setTitle] = useState('');
  const [command, setCommand] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialSnippet) {
      setTitle(initialSnippet.title);
      setCommand(initialSnippet.command);
      setTags(initialSnippet.tags?.join(', ') || '');
      setDescription(initialSnippet.description || '');
    } else {
      setTitle('');
      setCommand('');
      setTags('');
      setDescription('');
    }
  }, [initialSnippet, isOpen]);

  if (!isOpen) return null;

  const detectedVars = extractSnippetVariables(command);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !command.trim()) {
      addToast('warning', '請輸入指令標題與腳本內容');
      return;
    }

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      command: command.trim(),
      tags: tagList,
      description: description.trim() || undefined,
      variables: detectedVars
    };

    if (initialSnippet) {
      await updateSnippet(initialSnippet.id, payload);
      addToast('success', `已更新指令「${title}」`);
    } else {
      await addSnippet(payload);
      addToast('success', `已建立指令「${title}」`);
    }

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-modal overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-background/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                {initialSnippet ? '編輯指令範本' : '新增快捷指令'}
              </h2>
              <p className="text-[10px] text-mutedDark">保存常用腳本，支援動態變量範本替換</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              指令名稱 (標題) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 重啟 Docker 容器並追蹤日誌"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-400 text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                指令腳本內容 <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-amber-400 font-mono">
                使用 {'{{變量名}}'} 定義參數
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="docker restart {{container_id}} && docker logs -f {{container_id}}"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-400 text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono text-[11px]"
            />
          </div>

          {detectedVars.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300">
                <span className="font-semibold text-amber-300">已自動識別動態參數: </span>
                <span className="font-mono text-amber-200">{detectedVars.join(', ')}</span>
                <p className="text-[10px] text-mutedDark mt-0.5">
                  執行該指令時，系統將彈出提示框引導您填寫對應的參數值。
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">自定義標籤 (以逗號分隔)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如: Docker, Nginx, Linux, 除錯"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-400 text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">功能描述 (選填)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="簡要說明此指令腳本的用途與執行效果..."
              className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-400 text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-sidebar hover:bg-card text-muted hover:text-white text-xs font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              {initialSnippet ? '儲存變更' : '建立指令'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
