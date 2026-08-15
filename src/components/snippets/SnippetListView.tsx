import React, { useState } from 'react';
import { 
  Zap, 
  Plus, 
  Search, 
  Play, 
  Copy, 
  Edit3, 
  Trash2, 
  Tag, 
  Code,
  Check
} from 'lucide-react';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';
import { SnippetModal } from './SnippetModal';
import { SnippetParamPrompt } from './SnippetParamPrompt';
import { Snippet } from '../../types';

export const SnippetListView: React.FC = () => {
  const { snippets, deleteSnippet } = useVaultStore();
  const { setSnippetPrompt, addToast } = useAppStore();

  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);

  // Extract all unique tags
  const allTags = Array.from(new Set(snippets.flatMap((s) => s.tags || [])));

  const filteredSnippets = snippets.filter((s) => {
    const matchesTag = selectedTag === 'all' || s.tags?.includes(selectedTag);
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.command.toLowerCase().includes(search.toLowerCase()) ||
      s.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesTag && matchesSearch;
  });

  const handleRun = (snippet: Snippet) => {
    setSnippetPrompt({ snippet });
  };

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    addToast('success', '已複製指令至剪貼簿');
  };

  const handleEdit = (snip: Snippet) => {
    setEditingSnippet(snip);
    setModalOpen(true);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>快捷指令庫</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-sidebar border border-border/60 text-mutedDark">
              共 {snippets.length} 條
            </span>
          </h1>
          <p className="text-xs text-mutedDark mt-0.5">
            保存常用運維腳本、指令別名與參數化範本，一鍵在當前終端執行
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋指令名稱、內容或標籤..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-border/70 focus:border-amber-400 text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setEditingSnippet(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>新增指令</span>
          </button>
        </div>
      </div>

      {/* Tag Filters */}
      <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar flex-shrink-0">
        <button
          onClick={() => setSelectedTag('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            selectedTag === 'all'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-card text-muted hover:text-slate-200 border border-border/40'
          }`}
        >
          全部 ({snippets.length})
        </button>

        {allTags.map((tag) => {
          const count = snippets.filter((s) => s.tags?.includes(tag)).length;
          return (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                selectedTag === tag
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-card text-muted hover:text-slate-200 border border-border/40'
              }`}
            >
              <span>#{tag}</span>
              <span className="text-[10px] text-mutedDark font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Snippet Cards Grid */}
      <div className="flex-1 overflow-y-auto pt-2 no-scrollbar">
        {filteredSnippets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center text-mutedDark mb-3">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">查無指令範本</h3>
            <p className="text-xs text-mutedDark max-w-xs mt-1">
              建立帶有動態參數的指令範本，大幅提升終端操作效率
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {filteredSnippets.map((snip) => (
              <div
                key={snip.id}
                className="bg-card hover:bg-cardHover border border-border hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 group flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-slate-100 group-hover:text-amber-300">
                          {snip.title}
                        </h3>
                        {snip.description && (
                          <p className="text-xs text-mutedDark line-clamp-1 mt-0.5">
                            {snip.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(snip)}
                        className="p-1 hover:bg-sidebar text-slate-400 hover:text-white rounded"
                        title="編輯"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteSnippet(snip.id)}
                        className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded"
                        title="刪除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Command Box */}
                  <div className="mt-3 p-2.5 rounded-xl bg-background border border-border/60 text-[11px] font-mono text-slate-300 break-all line-clamp-3">
                    {snip.command}
                  </div>

                  {/* Tags & Variables */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {snip.variables && snip.variables.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        {snip.variables.length} 個參數變量
                      </span>
                    )}
                    {snip.tags?.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-sidebar text-mutedDark font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                  <button
                    onClick={() => handleRun(snip)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>執行指令</span>
                  </button>

                  <button
                    onClick={() => handleCopy(snip.command)}
                    className="p-1.5 rounded-xl bg-sidebar hover:bg-card border border-border text-slate-400 hover:text-white transition-colors"
                    title="複製指令內容"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SnippetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialSnippet={editingSnippet}
      />

      <SnippetParamPrompt />
    </div>
  );
};
