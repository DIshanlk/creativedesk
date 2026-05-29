import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Trash2, ArrowLeft, Send, Link2, X } from 'lucide-react';
import clsx from 'clsx';
import FileUploadZone from '../components/FileUploadZone';
import AttachmentGallery from '../components/AttachmentGallery';
import TimeTracker from '../components/TimeTracker';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';

const STATUSES = ['To Do', 'In Progress', 'In Review', 'Approved', 'Done', 'Blocked'];
const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

const statusColors: Record<string, string> = {
  'To Do': 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'In Review': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'Done': 'bg-emerald-100 text-emerald-700',
  'Blocked': 'bg-red-100 text-red-700',
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkType, setLinkType] = useState<'blocks' | 'is blocked by' | 'relates to' | 'duplicates'>('blocks');
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const { currentUser, hasPermission } = useAuth();
  const canEdit = hasPermission('edit_task');
  const isAdmin = hasPermission('manage_users');
  const { confirm, confirmProps } = useConfirm();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/tasks/${id}`),
      api.get('/people'),
      api.get('/teams'),
      api.get('/reference/categories'),
      api.get('/tasks'),
    ]).then(([taskRes, usersRes, teamsRes, categoriesRes, allTasksRes]) => {
      setTask(taskRes.data);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
      setAllTasks(allTasksRes.data);
      setCategories(categoriesRes.data);
      setManagers(usersRes.data.filter((u: any) => ['Admin','Manager'].includes(u.role)));
    }).finally(() => setLoading(false));
  }, [id]);

  const patch = (data: any) => {
    api.patch(`/tasks/${task.id}`, { ...data, userId: currentUser?.id }).then(res => {
      setTask((t: any) => ({ ...t, ...res.data }));
    });
  };

  const postComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    const res = await api.post(`/tasks/${task.id}/comments`, { content: newComment, authorId: currentUser.id });
    setTask((t: any) => ({ ...t, comments: [...(t.comments || []), res.data] }));
    setNewComment('');
  };

  const deleteComment = async (commentId: string) => {
    const ok = await confirm({
      title: 'Delete Comment',
      message: 'This comment will be permanently deleted.',
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;
    await api.delete(`/tasks/${task.id}/comments/${commentId}`);
    setTask((t: any) => ({ ...t, comments: t.comments.filter((c: any) => c.id !== commentId) }));
  };

  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    const res = await api.post(`/tasks/${task.id}/subtasks`, { title: newSubtask });
    setTask((t: any) => ({ ...t, subtasks: [...(t.subtasks || []), res.data] }));
    setNewSubtask('');
    setAddingSubtask(false);
  };

  const toggleSubtask = async (stId: string, done: boolean) => {
    const res = await api.patch(`/tasks/${task.id}/subtasks/${stId}`, { status: done ? 'Done' : 'To Do' });
    setTask((t: any) => ({ ...t, subtasks: t.subtasks.map((s: any) => s.id === stId ? res.data : s) }));
  };

  const deleteAttachment = async (attId: string) => {
    const ok = await confirm({
      title: 'Delete Attachment',
      message: 'This file will be permanently removed from the task. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;
    await api.delete(`/attachments/${attId}`);
    setTask((t: any) => ({ ...t, attachments: t.attachments.filter((a: any) => a.id !== attId) }));
  };

  const deleteTask = async () => {
    const ok = await confirm({
      title: 'Delete Task',
      message: `Permanently delete "${task?.title}"? All subtasks, comments, and attachments will also be removed. This cannot be undone.`,
      confirmLabel: 'Delete Task',
      variant: 'danger'
    });
    if (!ok) return;
    await api.delete(`/tasks/${task.id}`);
    navigate(-1);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-textMuted">Loading task...</div>
    </div>
  );

  if (!task) return (
    <div className="p-8 text-center text-textMuted">Task not found.</div>
  );

  const doneSubtasks = task.subtasks?.filter((s: any) => s.status === 'Done').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const timeProgress = task.originalEstimate ? Math.min(Math.round(((task.timeSpent||0) / task.originalEstimate) * 100), 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-textMuted">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-text transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Link to="/list" className="hover:text-text">{task.space?.name || 'Tasks'}</Link>
        <span>/</span>
        <span className="font-medium text-text">{task.key}</span>
        <span className={clsx('ml-2 px-2 py-0.5 rounded-full text-xs font-medium', statusColors[task.status] || 'bg-slate-100 text-slate-600')}>
          {task.status}
        </span>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main Content */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Title */}
          <div>
            <input
              type="text"
              className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 -ml-1 disabled:cursor-default"
              value={task.title}
              disabled={!canEdit}
              onChange={e => setTask((t: any) => ({ ...t, title: e.target.value }))}
              onBlur={e => patch({ title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-sm text-textMuted uppercase tracking-wide">Description</h3>
            <textarea
              className="w-full min-h-[120px] p-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-default disabled:opacity-80 resize-none"
              value={task.description || ''}
              disabled={!canEdit}
              placeholder="Add a description..."
              onChange={e => setTask((t: any) => ({ ...t, description: e.target.value }))}
              onBlur={e => patch({ description: e.target.value })}
            />
          </div>

          {/* Subtasks */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-sm text-textMuted uppercase tracking-wide">Subtasks</h3>
                {totalSubtasks > 0 && (
                  <span className="text-xs text-textMuted">{doneSubtasks}/{totalSubtasks} done</span>
                )}
              </div>
              {canEdit && !addingSubtask && (
                <button onClick={() => setAddingSubtask(true)} className="text-primary text-sm hover:underline">+ Add Subtask</button>
              )}
            </div>
            {totalSubtasks > 0 && (
              <div className="h-1.5 bg-background rounded-full overflow-hidden border border-border mb-3">
                <div className="h-full bg-primary transition-all" style={{ width: `${totalSubtasks ? (doneSubtasks/totalSubtasks)*100 : 0}%` }}></div>
              </div>
            )}
            <div className="space-y-2">
              {task.subtasks?.map((st: any) => (
                <div key={st.id} className="flex items-center gap-2 p-2 rounded hover:bg-background">
                  <input
                    type="checkbox"
                    checked={st.status === 'Done'}
                    disabled={!canEdit}
                    onChange={e => toggleSubtask(st.id, e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className={clsx('flex-1 text-sm', st.status === 'Done' && 'line-through text-textMuted')}>{st.title}</span>
                  {st.assignee && <span className="text-xs text-textMuted">{st.assignee.name}</span>}
                </div>
              ))}
              {addingSubtask && (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setAddingSubtask(false); }}
                    placeholder="Subtask title..."
                    className="flex-1 p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={addSubtask} className="px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90">Add</button>
                  <button onClick={() => setAddingSubtask(false)} className="px-3 py-2 border border-border rounded text-sm hover:bg-background">Cancel</button>
                </div>
              )}
              {totalSubtasks === 0 && !addingSubtask && <div className="text-textMuted text-sm">No subtasks.</div>}
            </div>
          </div>

          {/* Comments */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-4 text-sm text-textMuted uppercase tracking-wide">Comments</h3>
            <div className="space-y-4 mb-4">
              {task.comments?.map((c: any) => (
                <div key={c.id} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 text-sm">
                    {c.author?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">{c.author?.name}</span>
                      <span className="text-textMuted text-xs">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-sm mt-1">{c.content}</div>
                  </div>
                  {(isAdmin || currentUser?.id === c.authorId) && (
                    <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-red-500 transition-opacity mt-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {task.comments?.length === 0 && <div className="text-textMuted text-sm">No comments yet.</div>}
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {currentUser?.name?.charAt(0) || '?'}
              </div>
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') postComment(); }}
                placeholder="Add a comment... (Enter to submit)"
                className="flex-1 p-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={postComment} className="px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90">Post</button>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-semibold text-sm text-textMuted uppercase tracking-wide mb-3">
              Attachments ({task.attachments?.length || 0})
            </h3>

            {/* Upload zone */}
            <FileUploadZone
              taskId={task.id}
              onUploaded={att => setTask((t: any) => ({ ...t, attachments: [...(t.attachments || []), att] }))}
              compact
            />

            {/* Gallery */}
            {task.attachments?.length > 0 && (
              <div className="mt-3">
                <AttachmentGallery
                  attachments={task.attachments}
                  canDelete={canEdit}
                  onDelete={deleteAttachment}
                />
              </div>
            )}
          </div>

          {/* Activity History */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-4 text-sm text-textMuted uppercase tracking-wide">Activity History</h3>
            <div className="space-y-3">
              {task.activityLogs?.map((log: any) => {
                let details = '';
                try { if (log.details) { const p = JSON.parse(log.details); if (p.from && p.to) details = `from "${p.from}" to "${p.to}"`; } } catch {}
                return (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold shrink-0 text-xs">
                      {log.user?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <span className="font-medium mr-1">{log.user?.name || 'System'}</span>
                      <span className="text-textMuted">
                        {log.action === 'created' ? 'created this task' :
                         log.action === 'status_changed' ? `changed status ${details}` :
                         log.action === 'commented' ? 'added a comment' :
                         log.action}
                      </span>
                      <div className="text-xs text-textMuted mt-0.5">{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
              {task.activityLogs?.length === 0 && <div className="text-textMuted text-sm">No activity yet.</div>}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 shrink-0 space-y-4">
          <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
            <Field label="Status">
              <select className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-70"
                value={task.status} disabled={!canEdit}
                onChange={e => patch({ status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Priority">
              <select className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-70"
                value={task.priority} disabled={!canEdit}
                onChange={e => patch({ priority: e.target.value })}>
                {PRIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Assignee">
              <select className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-70"
                value={task.assigneeId || ''} disabled={!canEdit}
                onChange={e => patch({ assigneeId: e.target.value || null })}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>

            <Field label="Reporter">
              <select className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-70"
                value={task.reporterId || ''} disabled={!canEdit}
                onChange={e => patch({ reporterId: e.target.value || null })}>
                <option value="">No Reporter</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>

            <Field label="Team">
              <select className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-70"
                value={task.teamId || ''} disabled={!canEdit}
                onChange={e => patch({ teamId: e.target.value || null })}>
                <option value="">No Team</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>

            <Field label="Category">
              <select className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-70"
                value={task.categoryId || ''} disabled={!canEdit}
                onChange={e => patch({ categoryId: e.target.value || null })}>
                <option value="">No Category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>

            <Field label="Start Date">
              <input type="date" disabled={!canEdit}
                className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-70"
                value={task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''}
                onChange={e => patch({ startDate: e.target.value || null })} />
            </Field>

            <Field label="Due Date">
              <input type="date" disabled={!canEdit}
                className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-70"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                onChange={e => patch({ dueDate: e.target.value || null })} />
            </Field>
          </div>

          {/* Time Tracking */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-textMuted uppercase tracking-wide">Time Tracking</span>
              {canEdit && (
                <input type="number" min="0" placeholder="Estimate (hrs)"
                  className="w-24 p-1 bg-background border border-border rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                  defaultValue={task.originalEstimate || ''}
                  onBlur={e => { if (e.target.value) patch({ originalEstimate: parseInt(e.target.value) }); }}
                  title="Set estimate (hours)" />
              )}
            </div>
            <TimeTracker
              taskId={task.id}
              userId={currentUser?.id || ''}
              timeSpent={task.timeSpent || 0}
              estimate={task.originalEstimate}
              onLogged={newTs => setTask((t: any) => ({ ...t, timeSpent: newTs }))}
            />
          </div>

          {/* Task Dependencies */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-textMuted uppercase tracking-wide">Linked Tasks</span>
              {canEdit && (
                <button onClick={() => setShowLinkSearch(v => !v)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Link2 className="w-3.5 h-3.5" /> Add Link
                </button>
              )}
            </div>

            {/* Add link UI */}
            {showLinkSearch && (
              <div className="mb-3 space-y-2">
                <select value={linkType} onChange={e => setLinkType(e.target.value as any)}
                  className="w-full p-1.5 text-xs bg-background border border-border rounded outline-none focus:ring-1 focus:ring-primary">
                  <option value="blocks">Blocks</option>
                  <option value="is blocked by">Is blocked by</option>
                  <option value="relates to">Relates to</option>
                  <option value="duplicates">Duplicates</option>
                </select>
                <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                  placeholder="Search task by key or title…"
                  className="w-full p-1.5 text-xs bg-background border border-border rounded outline-none focus:ring-1 focus:ring-primary" />
                {linkSearch.length > 1 && (
                  <div className="border border-border rounded-lg overflow-hidden bg-background max-h-40 overflow-y-auto">
                    {allTasks
                      .filter(t => t.id !== task.id &&
                        (t.key.toLowerCase().includes(linkSearch.toLowerCase()) ||
                         t.title.toLowerCase().includes(linkSearch.toLowerCase())))
                      .slice(0, 8)
                      .map((t: any) => (
                        <button key={t.id} className="w-full text-left px-3 py-2 text-xs hover:bg-surface flex items-center gap-2"
                          onClick={async () => {
                            try {
                              await api.post(`/tasks/${task.id}/links`, { targetTaskId: t.id, type: linkType });
                              const fresh = await api.get(`/tasks/${task.id}`);
                              setTask(fresh.data);
                              setLinkSearch(''); setShowLinkSearch(false);
                            } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
                          }}>
                          <span className="font-mono text-textMuted">{t.key}</span>
                          <span className="truncate">{t.title}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Existing links */}
            {[...(task.linkedTo || []), ...(task.linkedFrom || [])].length > 0 ? (
              <div className="space-y-1.5">
                {[...(task.linkedTo || []), ...(task.linkedFrom || [])].map((link: any) => {
                  const other = link.sourceTaskId === task.id ? link.targetTask : link.sourceTask;
                  return (
                    <div key={link.id} className="flex items-center justify-between text-xs group">
                      <div className="flex items-center gap-2">
                        <span className="text-textMuted italic">{link.type}</span>
                        <Link to={`/task/${other?.id}`} className="font-mono text-primary hover:underline">{other?.key}</Link>
                        <span className="text-textMuted truncate max-w-[140px]">{other?.title}</span>
                      </div>
                      {canEdit && (
                        <button className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-red-500"
                          onClick={async () => { await api.delete(`/tasks/${task.id}/links/${link.id}`); const f = await api.get(`/tasks/${task.id}`); setTask(f.data); }}>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-textMuted">No linked tasks. Use links to show dependencies between tasks.</div>
            )}
          </div>

          {/* Meta */}
          <div className="bg-surface border border-border rounded-lg p-4 text-xs text-textMuted space-y-1.5">
            <div className="flex justify-between"><span>Work Type</span><span className="font-medium text-text">{task.workType}</span></div>
            <div className="flex justify-between"><span>Space</span><span className="font-medium text-text">{task.space?.name}</span></div>
            <div className="flex justify-between"><span>Created</span><span>{new Date(task.createdAt).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span>Updated</span><span>{new Date(task.updatedAt).toLocaleDateString()}</span></div>
          </div>

          {/* Submit for Approval */}
          {!['Approved','Done'].includes(task.status) && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-3">Submit for Approval</h4>
              {submitMsg ? (
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">{submitMsg}</div>
              ) : (
                <div className="space-y-2">
                  <select id="approverSelect" className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Any manager / admin</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                  <button
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      const sel = document.getElementById('approverSelect') as HTMLSelectElement;
                      await api.post('/approvals', {
                        taskId: task.id,
                        submitterId: currentUser?.id,
                        approverId: sel.value || undefined
                      });
                      setSubmitMsg('Submitted for review!');
                      patch({ status: 'In Review' });
                      setSubmitting(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Danger Zone */}
          {isAdmin && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Danger Zone</h4>
              <button onClick={deleteTask} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors">
                <Trash2 className="w-4 h-4" /> Delete Task
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}

export { ConfirmDialog };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-textMuted mb-1 uppercase tracking-wide">{label}</div>
      {children}
    </div>
  );
}
