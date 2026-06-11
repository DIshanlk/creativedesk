"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import clsx from 'clsx';
import { Send, Clock, AlertTriangle, CheckCircle2, Circle, Loader2 } from 'lucide-react';

const STATUSES = ['To Do', 'In Progress', 'In Review', 'Approved', 'Done', 'Blocked'];

const statusColors: Record<string, string> = {
  'To Do': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Review': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Done': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Blocked': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const priorityColors: Record<string, string> = {
  Highest: 'text-red-500', High: 'text-orange-500', Medium: 'text-yellow-500', Low: 'text-blue-400', Lowest: 'text-slate-400'
};

const statusIcon: Record<string, any> = {
  'To Do': Circle, 'In Progress': Loader2, 'In Review': Clock,
  'Approved': CheckCircle2, 'Done': CheckCircle2, 'Blocked': AlertTriangle,
};

function daysDiff(date: string) {
  return Math.round((new Date(date).getTime() - Date.now()) / 86400000);
}

export default function MyWork() {
  const { currentUser } = useAuth();
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [reported, setReported] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'assigned' | 'reported'>('assigned');
  const [filterStatus, setFilterStatus] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    Promise.all([api.get('/tasks'), api.get('/people')]).then(([tasksRes, usersRes]) => {
      setMyTasks(tasksRes.data.filter((t: any) => t.assigneeId === currentUser.id));
      setReported(tasksRes.data.filter((t: any) => t.reporterId === currentUser.id && t.assigneeId !== currentUser.id));
      setUsers(usersRes.data);
    }).finally(() => setLoading(false));
  }, [currentUser]);

  const updateStatus = async (taskId: string, status: string) => {
    await api.patch(`/tasks/${taskId}`, { status, userId: currentUser?.id });
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const submitForApproval = async (taskId: string, title: string) => {
    if (submittingId) return;
    setSubmittingId(taskId);
    try {
      await api.post('/approvals', { taskId, submitterId: currentUser?.id });
      await updateStatus(taskId, 'In Review');
      alert(`"${title}" submitted for approval!`);
    } catch { alert('Failed to submit'); }
    finally { setSubmittingId(null); }
  };

  const displayTasks = (tab === 'assigned' ? myTasks : reported)
    .filter(t => !filterStatus || t.status === filterStatus);

  const active = myTasks.filter(t => !['Done','Approved'].includes(t.status));
  const overdue = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !['Done','Approved'].includes(t.status));
  const dueSoon = myTasks.filter(t => {
    if (!t.dueDate || ['Done','Approved'].includes(t.status)) return false;
    const d = daysDiff(t.dueDate);
    return d >= 0 && d <= 3;
  });
  const done7d = myTasks.filter(t => ['Done','Approved'].includes(t.status) && new Date(t.updatedAt) >= new Date(Date.now() - 7 * 86400000));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-textMuted">Loading your work...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Work</h1>
          <p className="text-sm text-textMuted mt-1">Tasks assigned to and reported by {currentUser?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="p-2 text-sm bg-surface border border-border rounded outline-none focus:ring-1 focus:ring-primary">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Personal KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Tasks" value={active.length} color="border-l-blue-500" />
        <StatCard label="Overdue" value={overdue.length} color="border-l-red-500" alert={overdue.length > 0} />
        <StatCard label="Due in 3 Days" value={dueSoon.length} color="border-l-yellow-500" alert={dueSoon.length > 0} />
        <StatCard label="Completed (7d)" value={done7d.length} color="border-l-green-500" />
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-700 dark:text-red-400 text-sm">You have {overdue.length} overdue task{overdue.length > 1 ? 's' : ''}</div>
            <div className="text-sm text-red-600 dark:text-red-300 mt-0.5">
              {overdue.map(t => t.key).join(', ')} — please update their status or contact your supervisor.
            </div>
          </div>
        </div>
      )}

      {/* Due soon */}
      {dueSoon.length > 0 && (
        <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
          <Clock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-yellow-700 dark:text-yellow-400 text-sm">{dueSoon.length} task{dueSoon.length > 1 ? 's' : ''} due within 3 days</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-300 mt-0.5">
              {dueSoon.map(t => `${t.key} (in ${daysDiff(t.dueDate)}d)`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {[
            { key: 'assigned', label: `Assigned to Me (${myTasks.length})` },
            { key: 'reported', label: `Reported by Me (${reported.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={clsx('pb-3 text-sm font-medium border-b-2 transition-colors', tab === t.key ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-text')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards */}
      {displayTasks.length === 0 ? (
        <div className="p-10 text-center text-textMuted bg-surface border border-border rounded-lg">
          {filterStatus ? 'No tasks match this filter.' : tab === 'assigned' ? "You don't have any tasks assigned." : "You haven't reported any tasks."}
        </div>
      ) : (
        <div className="space-y-2">
          {displayTasks
            .sort((a, b) => {
              // Sort: overdue first, then by due date, then by priority
              const aOverdue = a.dueDate && new Date(a.dueDate) < new Date() && !['Done','Approved'].includes(a.status);
              const bOverdue = b.dueDate && new Date(b.dueDate) < new Date() && !['Done','Approved'].includes(b.status);
              if (aOverdue && !bOverdue) return -1;
              if (!aOverdue && bOverdue) return 1;
              if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
              if (a.dueDate && !b.dueDate) return -1;
              if (!a.dueDate && b.dueDate) return 1;
              return 0;
            })
            .map(task => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['Done','Approved'].includes(task.status);
              const diff = task.dueDate ? daysDiff(task.dueDate) : null;
              const StatusIcon = statusIcon[task.status] || Circle;

              return (
                <div key={task.id} className={clsx(
                  'bg-surface border rounded-lg p-4 flex items-start gap-4 hover:shadow-sm transition-shadow',
                  isOverdue ? 'border-red-200 dark:border-red-900/40' : 'border-border'
                )}>
                  <StatusIcon className={clsx('w-5 h-5 mt-0.5 shrink-0', statusColors[task.status]?.includes('blue') ? 'text-blue-500' : statusColors[task.status]?.includes('green') ? 'text-green-500' : 'text-slate-400')} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/task/${task.id}`} className="font-mono text-xs text-textMuted hover:text-primary">{task.key}</Link>
                          <span className={clsx('text-xs font-medium', priorityColors[task.priority])}>{task.priority}</span>
                          {task.category && <span className="text-xs text-textMuted bg-background border border-border px-1.5 py-0.5 rounded">{task.category.name}</span>}
                        </div>
                        <Link href={`/task/${task.id}`} className="font-semibold text-sm mt-0.5 block hover:text-primary truncate">{task.title}</Link>
                        {task.space && <div className="text-xs text-textMuted mt-0.5">in {task.space?.name || ''} · {task.team?.name || ''}</div>}
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {/* Status selector */}
                        {tab === 'assigned' && (
                          <select
                            value={task.status}
                            onChange={e => updateStatus(task.id, e.target.value)}
                            className={clsx('px-2 py-1 rounded-full text-xs font-medium border-none focus:ring-1 focus:ring-primary outline-none cursor-pointer', statusColors[task.status])}
                          >
                            {STATUSES.map(s => <option key={s} value={s} className="bg-background text-text">{s}</option>)}
                          </select>
                        )}
                        {tab === 'assigned' && !['In Review','Approved','Done'].includes(task.status) && (
                          <button
                            disabled={!!submittingId}
                            onClick={() => submitForApproval(task.id, task.title)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" /> Submit for review
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-textMuted">
                      {task.dueDate && (
                        <span className={clsx('flex items-center gap-1', isOverdue ? 'text-red-500 font-medium' : diff !== null && diff <= 3 ? 'text-yellow-600 font-medium' : '')}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? `${Math.abs(diff!)}d overdue` : diff === 0 ? 'Due today' : `Due in ${diff}d`}
                          {' '}({new Date(task.dueDate).toLocaleDateString()})
                        </span>
                      )}
                      {task.assignee && tab === 'reported' && (
                        <span className="flex items-center gap-1">
                          Assigned to <strong className="text-text">{task.assignee.name}</strong>
                        </span>
                      )}
                      {task.originalEstimate && (
                        <span>{task.timeSpent || 0}h / {task.originalEstimate}h logged</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, alert }: { label: string; value: number; color: string; alert?: boolean }) {
  return (
    <div className={clsx('bg-surface border border-border rounded-lg p-4 border-l-4', color)}>
      <div className={clsx('text-3xl font-bold', alert && value > 0 ? 'text-red-500' : '')}>{value}</div>
      <div className="text-sm text-textMuted mt-1">{label}</div>
    </div>
  );
}




