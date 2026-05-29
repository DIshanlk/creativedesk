import { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useSpace } from '../context/SpaceContext';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, X, ChevronDown } from 'lucide-react';

export default function TaskList() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const { selectedSpaceId } = useSpace();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('edit_task');

  useEffect(() => {
    setLoading(true);
    const url = selectedSpaceId ? `/tasks?spaceId=${selectedSpaceId}` : '/tasks';
    Promise.all([api.get(url), api.get('/people')])
      .then(([tasksRes, usersRes]) => { setTasks(tasksRes.data); setUsers(usersRes.data); })
      .finally(() => setLoading(false));
  }, [selectedSpaceId]);

  const updateTask = async (taskId: string, field: string, value: any) => {
    if (!canEdit) return;
    try {
      await api.patch(`/tasks/${taskId}`, { [field]: value });
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t;
        const updated = { ...t, [field]: value };
        if (field === 'assigneeId') updated.assignee = users.find(u => u.id === value) || null;
        if (field === 'reporterId') updated.reporter = users.find(u => u.id === value) || null;
        return updated;
      }));
    } catch (err) { console.error(err); }
  };

  const bulkUpdate = async () => {
    if (!selected.size) return;
    const data: any = {};
    if (bulkStatus) data.status = bulkStatus;
    if (bulkPriority) data.priority = bulkPriority;
    if (bulkAssignee !== '') data.assigneeId = bulkAssignee || null;
    if (!Object.keys(data).length) return;
    await api.patch('/tasks/bulk/update', { ids: Array.from(selected), data });
    // refresh locally
    setTasks(prev => prev.map(t => {
      if (!selected.has(t.id)) return t;
      const updated = { ...t, ...data };
      if (data.assigneeId !== undefined) updated.assignee = users.find(u => u.id === data.assigneeId) || null;
      return updated;
    }));
    setSelected(new Set());
    setBulkStatus(''); setBulkAssignee(''); setBulkPriority('');
  };

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids: string[]) => setSelected(s => s.size === ids.length ? new Set() : new Set(ids));

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = {
      'To Do': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'In Review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Done': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Blocked': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[s] || 'bg-slate-100 text-slate-700';
  };

  const getPriorityColor = (p: string) => {
    const map: Record<string, string> = { Highest: 'text-red-500', High: 'text-orange-500', Medium: 'text-yellow-500', Low: 'text-blue-500', Lowest: 'text-slate-400' };
    return map[p] || 'text-slate-400';
  };

  const getPriorityOrder = (p: string) => ['Highest','High','Medium','Low','Lowest'].indexOf(p);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortedTasks = [...tasks]
    .filter(t => {
      if (filterAssignee && t.assigneeId !== filterAssignee) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      let av: any, bv: any;
      if (sortField === 'priority') { av = getPriorityOrder(a.priority); bv = getPriorityOrder(b.priority); }
      else if (sortField === 'dueDate') { av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity; bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity; }
      else { av = (a[sortField] || '').toString().toLowerCase(); bv = (b[sortField] || '').toString().toLowerCase(); }
      return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <th className="p-3 font-medium cursor-pointer hover:text-text select-none" onClick={() => handleSort(field)}>
      {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-textMuted">Loading tasks...</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Bulk Action Toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-primary shrink-0">
            <CheckSquare className="w-4 h-4" />
            {selected.size} selected
          </div>
          <div className="h-4 border-l border-primary/20" />
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            className="text-sm bg-surface border border-border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary">
            <option value="">Set Status…</option>
            {['To Do','In Progress','In Review','Approved','Done','Blocked'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value)}
            className="text-sm bg-surface border border-border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary">
            <option value="">Set Priority…</option>
            {['Highest','High','Medium','Low','Lowest'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)}
            className="text-sm bg-surface border border-border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary">
            <option value="">Assign To…</option>
            <option value="__unassign__">— Unassign —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button onClick={bulkUpdate} className="flex items-center gap-1.5 text-sm bg-primary text-white rounded-lg px-3 py-1.5 hover:bg-primary/90">
            <ChevronDown className="w-3.5 h-3.5" /> Apply
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto p-1 text-textMuted hover:text-red-500 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold">Task List</h1>
        <div className="flex gap-2 flex-wrap">
          <select className="p-2 bg-surface border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['To Do','In Progress','In Review','Approved','Done','Blocked'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="p-2 bg-surface border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary"
            value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            {['Highest','High','Medium','Low','Lowest'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="p-2 bg-surface border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary"
            value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value="">All Assignees</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {(filterStatus || filterPriority || filterAssignee) && (
            <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterAssignee(''); }}
              className="px-3 py-2 text-sm text-textMuted hover:text-text border border-border rounded hover:bg-background">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-background text-textMuted border-b border-border">
            <tr>
              {canEdit && (
                <th className="p-3 w-8">
                  <input type="checkbox" className="rounded cursor-pointer"
                    checked={selected.size === sortedTasks.length && sortedTasks.length > 0}
                    onChange={() => toggleAll(sortedTasks.map(t => t.id))} />
                </th>
              )}
              <SortHeader field="key" label="Key" />
              <SortHeader field="title" label="Summary" />
              <SortHeader field="status" label="Status" />
              <SortHeader field="priority" label="Priority" />
              <th className="p-3 font-medium">Assignee</th>
              <th className="p-3 font-medium">Reporter</th>
              <SortHeader field="dueDate" label="Due Date" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedTasks.map(task => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['Done','Approved'].includes(task.status);
              return (
                <tr key={task.id} className={clsx('hover:bg-background transition-colors', selected.has(task.id) && 'bg-primary/5')}>
                  {canEdit && (
                    <td className="p-3">
                      <input type="checkbox" className="rounded cursor-pointer"
                        checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)} />
                    </td>
                  )}
                  <td className="p-3">
                    <Link to={`/task/${task.id}`} className="text-primary hover:underline font-mono text-xs">{task.key}</Link>
                  </td>
                  <td className="p-3 font-medium max-w-xs">
                    <Link to={`/task/${task.id}`} className="hover:text-primary hover:underline truncate block">{task.title}</Link>
                  </td>
                  <td className="p-3">
                    {canEdit ? (
                      <select className={clsx('px-2 py-1 rounded-full text-xs font-medium border-none focus:ring-1 focus:ring-primary outline-none cursor-pointer', getStatusColor(task.status))}
                        value={task.status} onChange={e => updateTask(task.id, 'status', e.target.value)}>
                        {['To Do','In Progress','In Review','Approved','Done','Blocked'].map(s => <option key={s} value={s} className="bg-background text-text">{s}</option>)}
                      </select>
                    ) : (
                      <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(task.status))}>{task.status}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {canEdit ? (
                      <select className={clsx('font-medium bg-transparent border-none focus:ring-1 focus:ring-primary outline-none cursor-pointer text-sm', getPriorityColor(task.priority))}
                        value={task.priority} onChange={e => updateTask(task.id, 'priority', e.target.value)}>
                        {['Highest','High','Medium','Low','Lowest'].map(s => <option key={s} value={s} className="bg-background text-text">{s}</option>)}
                      </select>
                    ) : (
                      <span className={clsx('text-sm font-medium', getPriorityColor(task.priority))}>{task.priority}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {task.assignee?.name?.charAt(0) || '?'}
                      </div>
                      {canEdit ? (
                        <select className="bg-transparent border-none focus:ring-1 focus:ring-primary outline-none cursor-pointer text-sm w-28"
                          value={task.assigneeId || ''} onChange={e => updateTask(task.id, 'assigneeId', e.target.value || null)}>
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      ) : <span className="text-sm">{task.assignee?.name || 'Unassigned'}</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {task.reporter?.name?.charAt(0) || '?'}
                      </div>
                      {canEdit ? (
                        <select className="bg-transparent border-none focus:ring-1 focus:ring-primary outline-none cursor-pointer text-sm w-28"
                          value={task.reporterId || ''} onChange={e => updateTask(task.id, 'reporterId', e.target.value || null)}>
                          <option value="">No Reporter</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      ) : <span className="text-sm">{task.reporter?.name || '-'}</span>}
                    </div>
                  </td>
                  <td className={clsx('p-3', isOverdue ? 'text-red-500 font-medium' : 'text-textMuted')}>
                    {canEdit ? (
                      <input type="date"
                        className={clsx('bg-transparent border-none focus:ring-1 focus:ring-primary outline-none cursor-pointer text-sm', isOverdue ? 'text-red-500' : 'text-textMuted')}
                        value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                        onChange={e => updateTask(task.id, 'dueDate', e.target.value ? new Date(e.target.value).toISOString() : null)} />
                    ) : (
                      <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedTasks.length === 0 && (
          <div className="p-10 text-center text-textMuted">
            {filterStatus || filterPriority || filterAssignee ? 'No tasks match the selected filters.' : 'No tasks in this space yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
