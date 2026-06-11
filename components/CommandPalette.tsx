"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, List, KanbanSquare, Calendar, BarChart2,
  UsersRound, Users, Paperclip, FileText, Settings, Briefcase, Clock,
  CheckSquare, Hash, Archive } from 'lucide-react';
import api from '@/lib/api';
import clsx from 'clsx';

const STATIC_COMMANDS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, group: 'Navigate' },
  { label: 'My Work', path: '/my-work', icon: Briefcase, group: 'Navigate' },
  { label: 'Task List', path: '/list', icon: List, group: 'Navigate' },
  { label: 'Board', path: '/board', icon: KanbanSquare, group: 'Navigate' },
  { label: 'Calendar', path: '/calendar', icon: Calendar, group: 'Navigate' },
  { label: 'Timeline', path: '/timeline', icon: Clock, group: 'Navigate' },
  { label: 'Approvals', path: '/approvals', icon: CheckSquare, group: 'Navigate' },
  { label: 'Reports', path: '/reports', icon: BarChart2, group: 'Navigate' },
  { label: 'Teams', path: '/teams', icon: UsersRound, group: 'Navigate' },
  { label: 'People', path: '/people', icon: Users, group: 'Navigate' },
  { label: 'Attachments', path: '/attachments', icon: Paperclip, group: 'Navigate' },
  { label: 'Forms', path: '/forms', icon: FileText, group: 'Navigate' },
  { label: 'Archived', path: '/archived', icon: Archive, group: 'Navigate' },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'Navigate' },
];

interface Props { open: boolean; onClose: () => void; }

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery('');
      setTasks([]);
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setTasks([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/search', { params: { q: query } });
        setTasks(res.data.tasks || []);
      } catch { setTasks([]); }
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const filteredCommands = query
    ? STATIC_COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : STATIC_COMMANDS;

  const allItems: { label: string; path: string; icon?: any; group: string; key?: string }[] = [
    ...filteredCommands,
    ...tasks.map(t => ({ label: t.title, path: `/task/${t.id}`, group: 'Tasks', key: t.key }))
  ];

  const go = (path: string) => { router.push(path); onClose(); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && allItems[cursor]) go(allItems[cursor].path);
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  const groups = allItems.reduce<Record<string, typeof allItems>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-textMuted shrink-0" />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onKey} placeholder="Search tasks, pages…"
            className="flex-1 bg-transparent outline-none text-base placeholder-textMuted" />
          {loading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
          <kbd className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 text-textMuted">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-2">
          {allItems.length === 0 && (
            <div className="px-4 py-6 text-center text-textMuted text-sm">{query ? 'No results found' : 'Type to search…'}</div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-textMuted">{group}</div>
              {items.map(item => {
                const idx = globalIdx++;
                const Icon = item.icon;
                return (
                  <button key={item.path + item.label} onClick={() => go(item.path)}
                    className={clsx('w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                      cursor === idx ? 'bg-primary/10 text-primary' : 'hover:bg-background text-text')}>
                    {Icon ? <Icon className="w-4 h-4 shrink-0 text-textMuted" /> :
                      <Hash className="w-4 h-4 shrink-0 text-textMuted" />}
                    {item.key && <span className="font-mono text-xs text-textMuted shrink-0">{item.key}</span>}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-textMuted">
          <span><kbd className="bg-background border border-border rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="bg-background border border-border rounded px-1">↵</kbd> open</span>
          <span><kbd className="bg-background border border-border rounded px-1">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}




