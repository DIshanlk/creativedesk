import { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { AlertTriangle, User, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const STATUSES = ['To Do', 'In Progress', 'In Review', 'Approved', 'Done', 'Blocked'];

const statusColors: Record<string, string> = {
  'To Do': 'bg-slate-200 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'In Review': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'Done': 'bg-emerald-100 text-emerald-700',
  'Blocked': 'bg-red-100 text-red-700',
};

const priorityDot: Record<string, string> = {
  Highest: 'bg-red-500',
  High: 'bg-orange-400',
  Medium: 'bg-yellow-400',
  Low: 'bg-blue-400',
  Lowest: 'bg-slate-300',
};

const CAPACITY = 8; // tasks = 100%

export default function Workload() {
  const [people, setPeople] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expand, setExpand] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/people'), api.get('/tasks')]).then(([p, t]) => {
      setPeople(p.data.filter((u: any) => ['Designer', 'Manager', 'Admin'].includes(u.role)));
      setUsers(p.data);
      setTasks(t.data.filter((t: any) => !['Done', 'Approved'].includes(t.status)));
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const tasksByAssignee = (userId: string) => tasks.filter(t => t.assigneeId === userId);

  const reassign = async (taskId: string, newUserId: string) => {
    await api.patch(`/tasks/${taskId}`, { assigneeId: newUserId });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigneeId: newUserId, assignee: users.find(u => u.id === newUserId) } : t));
  };

  const onDrop = (e: React.DragEvent, toUserId: string) => {
    e.preventDefault();
    setDragOver(null);
    if (dragTaskId && toUserId) reassign(dragTaskId, toUserId);
    setDragTaskId(null);
  };

  const unassigned = tasks.filter(t => !t.assigneeId);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Workload Balancer</h1>
          <p className="text-sm text-textMuted mt-0.5">Drag tasks between designers to rebalance. Only active tasks shown.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-textMuted border border-border px-3 py-1.5 rounded-lg hover:bg-surface">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {people.slice(0, 4).map(p => {
          const count = tasksByAssignee(p.id).length;
          const pct = Math.min(Math.round((count / CAPACITY) * 100), 100);
          return (
            <div key={p.id} className="bg-surface border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm truncate">{p.name}</div>
                <span className={clsx('text-xs font-bold', pct >= 100 ? 'text-red-500' : pct >= 75 ? 'text-yellow-600' : 'text-green-600')}>
                  {count} tasks
                </span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all', pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-400' : 'bg-green-500')}
                  style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-textMuted">{pct}% capacity</div>
            </div>
          );
        })}
      </div>

      {/* Designer lanes */}
      <div className="space-y-3">
        {people.map(person => {
          const personTasks = tasksByAssignee(person.id);
          const count = personTasks.length;
          const pct = Math.min(Math.round((count / CAPACITY) * 100), 100);
          const isOver = pct >= 100;
          const isHigh = pct >= 75;
          const isExpanded = expand === person.id;

          return (
            <div key={person.id}
              onDragOver={e => { e.preventDefault(); setDragOver(person.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => onDrop(e, person.id)}
              className={clsx('bg-surface border rounded-xl overflow-hidden transition-all',
                dragOver === person.id ? 'border-primary ring-2 ring-primary/20' :
                isOver ? 'border-red-300 dark:border-red-800' : 'border-border')}>

              {/* Header */}
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-background"
                onClick={() => setExpand(isExpanded ? null : person.id)}>
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {person.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{person.name}</span>
                    <span className="text-xs text-textMuted">{person.jobTitle}</span>
                    {isOver && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full', isOver ? 'bg-red-500' : isHigh ? 'bg-yellow-400' : 'bg-green-500')}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className={clsx('text-xs font-medium shrink-0', isOver ? 'text-red-500' : isHigh ? 'text-yellow-600' : 'text-textMuted')}>
                      {count}/{CAPACITY}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Status pills */}
                  {STATUSES.map(s => {
                    const c = personTasks.filter(t => t.status === s).length;
                    return c > 0 ? (
                      <span key={s} className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusColors[s])}>{c}</span>
                    ) : null;
                  })}
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-textMuted" /> : <ChevronRight className="w-4 h-4 text-textMuted" />}
                </div>
              </div>

              {/* Task list */}
              {isExpanded && (
                <div className="border-t border-border divide-y divide-border">
                  {personTasks.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-textMuted italic">No active tasks</div>
                  ) : (
                    personTasks.map(task => (
                      <div key={task.id}
                        draggable
                        onDragStart={() => setDragTaskId(task.id)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-background cursor-grab active:cursor-grabbing group">
                        <div className={clsx('w-2 h-2 rounded-full shrink-0', priorityDot[task.priority] || 'bg-slate-400')} title={task.priority} />
                        <span className="text-xs text-textMuted font-mono shrink-0">{task.key}</span>
                        <Link to={`/task/${task.id}`} className="flex-1 text-sm truncate hover:text-primary hover:underline" onClick={e => e.stopPropagation()}>
                          {task.title}
                        </Link>
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full shrink-0', statusColors[task.status])}>{task.status}</span>
                        {/* Reassign dropdown */}
                        <select
                          value={task.assigneeId || ''}
                          onChange={e => reassign(task.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 text-xs bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary transition-opacity">
                          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <span className="opacity-0 group-hover:opacity-100 text-[9px] text-textMuted shrink-0 transition-opacity">drag to reassign</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned pool */}
        {unassigned.length > 0 && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver('unassigned'); }}
            onDragLeave={() => setDragOver(null)}
            className={clsx('bg-surface border rounded-xl overflow-hidden transition-all',
              dragOver === 'unassigned' ? 'border-primary ring-2 ring-primary/20' : 'border-dashed border-border')}>
            <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-background"
              onClick={() => setExpand(expand === 'unassigned' ? null : 'unassigned')}>
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-textMuted flex items-center justify-center shrink-0">
                <User className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Unassigned Tasks</div>
                <div className="text-xs text-textMuted">{unassigned.length} task{unassigned.length !== 1 ? 's' : ''} without assignee</div>
              </div>
              {expand === 'unassigned' ? <ChevronDown className="w-4 h-4 text-textMuted" /> : <ChevronRight className="w-4 h-4 text-textMuted" />}
            </div>
            {expand === 'unassigned' && (
              <div className="border-t border-border divide-y divide-border">
                {unassigned.map(task => (
                  <div key={task.id}
                    draggable onDragStart={() => setDragTaskId(task.id)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-background cursor-grab active:cursor-grabbing group">
                    <div className={clsx('w-2 h-2 rounded-full shrink-0', priorityDot[task.priority] || 'bg-slate-400')} />
                    <span className="text-xs text-textMuted font-mono shrink-0">{task.key}</span>
                    <Link to={`/task/${task.id}`} className="flex-1 text-sm truncate hover:text-primary hover:underline" onClick={e => e.stopPropagation()}>
                      {task.title}
                    </Link>
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full shrink-0', statusColors[task.status])}>{task.status}</span>
                    <select value="" onChange={e => reassign(task.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 text-xs bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary transition-opacity">
                      <option value="">Assign to…</option>
                      {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
