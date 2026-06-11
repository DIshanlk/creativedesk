"use client";
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors,
  type DragStartEvent, type DragOverEvent, type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useSpace } from '@/context/SpaceContext';
import { useAuth } from '@/context/AuthContext';
import clsx from 'clsx';
import { Plus, Clock, AlertTriangle } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────
const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Approved', 'Done', 'Blocked'];

const colColors: Record<string, string> = {
  'To Do': 'border-t-slate-400',
  'In Progress': 'border-t-blue-500',
  'In Review': 'border-t-yellow-500',
  'Approved': 'border-t-green-500',
  'Done': 'border-t-emerald-500',
  'Blocked': 'border-t-red-500',
};

const colDotColors: Record<string, string> = {
  'To Do': 'bg-slate-400',
  'In Progress': 'bg-blue-500',
  'In Review': 'bg-yellow-500',
  'Approved': 'bg-green-500',
  'Done': 'bg-emerald-500',
  'Blocked': 'bg-red-500',
};

const priorityColors: Record<string, string> = {
  Highest: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-400',
  Low: 'bg-blue-400',
  Lowest: 'bg-slate-300',
};

// ─── Task Card ────────────────────────────────────────────────
function TaskCard({ task, isOverlay = false }: { task: any; isOverlay?: boolean }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['Done', 'Approved'].includes(task.status);
  const dueDiff = task.dueDate ? Math.round((new Date(task.dueDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className={clsx(
      'bg-surface rounded-lg border border-border overflow-hidden select-none',
      isOverlay ? 'shadow-2xl rotate-1 scale-105 opacity-95' : 'shadow-sm hover:shadow-md transition-shadow'
    )}>
      {/* Priority accent */}
      <div className={clsx('h-1 w-full', priorityColors[task.priority] || 'bg-slate-300')} />
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] text-textMuted font-mono">{task.key}</span>
          <span className="text-[10px] text-textMuted shrink-0">{task.priority?.[0]}</span>
        </div>
        <p className="text-sm font-medium leading-snug line-clamp-2 text-text">{task.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.category && (
              <span className="text-[10px] text-textMuted bg-background border border-border px-1.5 py-0.5 rounded">
                {task.category.name}
              </span>
            )}
            {isOverdue && <span title="Overdue"><AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /></span>}
            {!isOverdue && dueDiff !== null && dueDiff >= 0 && dueDiff <= 2 && (
              <span title={`Due in ${dueDiff}d`}><Clock className="w-3.5 h-3.5 text-yellow-500 shrink-0" /></span>
            )}
          </div>
          <div className={clsx(
            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
            task.assignee ? 'bg-primary/20 text-primary' : 'bg-background border border-border text-textMuted'
          )} title={task.assignee?.name || 'Unassigned'}>
            {task.assignee ? task.assignee.name.charAt(0) : '?'}
          </div>
        </div>
        {task.dueDate && (
          <div className={clsx('text-[10px]', isOverdue ? 'text-red-500 font-medium' : dueDiff !== null && dueDiff <= 2 ? 'text-yellow-600' : 'text-textMuted')}>
            {isOverdue
              ? `${Math.abs(dueDiff!)}d overdue`
              : dueDiff === 0 ? 'Due today'
              : `Due ${new Date(task.dueDate).toLocaleDateString()}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sortable wrapper (adds drag handle + click-through link) ─
function SortableCard({ task }: { task: any }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-2 touch-none">
      {/* Link must not propagate pointer events up to the sortable listeners */}
      <div onClick={e => e.stopPropagation()}>
        <Link href={`/task/${task.id}`} onPointerDown={e => e.stopPropagation()} tabIndex={-1}>
          <TaskCard task={task} />
        </Link>
      </div>
    </div>
  );
}

// ─── Droppable Column ─────────────────────────────────────────
function DroppableColumn({
  col, tasks, spaceId, onAdd
}: { col: string; tasks: any[]; spaceId: string | null; onAdd: (t: any) => void }) {
  // Make the entire column a droppable zone
  const { setNodeRef, isOver } = useDroppable({ id: col });

  return (
    <div
      className={clsx(
        'bg-background rounded-xl w-64 shrink-0 flex flex-col border border-t-4 transition-colors',
        colColors[col],
        isOver ? 'border-primary/40 bg-primary/5' : 'border-border'
      )}
      style={{ maxHeight: 'calc(100vh - 9rem)' }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className={clsx('w-2 h-2 rounded-full', colDotColors[col])} />
          <span className="text-xs font-bold uppercase tracking-wider text-textMuted">{col}</span>
        </div>
        <span className="bg-surface text-textMuted px-2 py-0.5 rounded-full text-xs border border-border font-mono">
          {tasks.length}
        </span>
      </div>

      {/* Card list — scrollable */}
      <div ref={setNodeRef} className="p-2 flex-1 overflow-y-auto min-h-[60px]">
        <SortableContext id={col} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <SortableCard key={task.id} task={task} />)}
          {tasks.length === 0 && (
            <div className={clsx(
              'flex items-center justify-center h-14 rounded-lg border-2 border-dashed text-xs text-textMuted transition-colors',
              isOver ? 'border-primary/40 text-primary' : 'border-border'
            )}>
              {isOver ? 'Drop here' : 'No tasks'}
            </div>
          )}
        </SortableContext>
      </div>

      {/* Quick add */}
      <div className="border-t border-border shrink-0">
        <QuickAdd status={col} spaceId={spaceId} onAdd={onAdd} />
      </div>
    </div>
  );
}

// ─── Quick Add ────────────────────────────────────────────────
function QuickAdd({ status, spaceId, onAdd }: { status: string; spaceId: string | null; onAdd: (t: any) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selSpace, setSelSpace] = useState(spaceId || '');
  const { currentUser } = useAuth();

  useEffect(() => { api.get('/reference/spaces').then(r => setSpaces(r.data)); }, []);
  useEffect(() => { setSelSpace(spaceId || ''); }, [spaceId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selSpace) return;
    try {
      const res = await api.post('/tasks', {
        title, spaceId: selSpace, status, workType: 'Task', reporterId: currentUser?.id
      });
      onAdd(res.data);
      setTitle('');
      setOpen(false);
    } catch {
      alert('Select a space first.');
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-textMuted hover:text-text hover:bg-surface/50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Quick add
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="p-2 space-y-2" onMouseDown={e => e.stopPropagation()}>
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title…"
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        className="w-full p-2 bg-surface border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary"
      />
      {!spaceId && (
        <select value={selSpace} onChange={e => setSelSpace(e.target.value)}
          className="w-full p-1.5 bg-surface border border-border rounded text-xs outline-none focus:ring-1 focus:ring-primary">
          <option value="">Select space…</option>
          {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      <div className="flex gap-2">
        <button type="submit" className="flex-1 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90">Add</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 border border-border rounded text-xs hover:bg-surface">✕</button>
      </div>
    </form>
  );
}

// ─── Board ────────────────────────────────────────────────────
export default function Board() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const { selectedSpaceId } = useSpace();
  const { currentUser } = useAuth();

  const fetchTasks = useCallback(() => {
    const url = selectedSpaceId ? `/tasks?spaceId=${selectedSpaceId}` : '/tasks';
    return api.get(url).then(r => setTasks(r.data));
  }, [selectedSpaceId]);

  useEffect(() => {
    setLoading(true);
    const url = selectedSpaceId ? `/tasks?spaceId=${selectedSpaceId}` : '/tasks';
    Promise.all([api.get(url), api.get('/people')])
      .then(([t, u]) => { setTasks(t.data); setUsers(u.data); })
      .finally(() => setLoading(false));
  }, [selectedSpaceId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Helper: find what column a task (by id) currently lives in
  const findColumn = useCallback((id: string): string | null => {
    if (COLUMNS.includes(id)) return id;
    const task = tasks.find(t => t.id === id);
    return task?.status ?? null;
  }, [tasks]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    const activeCol = findColumn(active.id as string);
    const overCol = findColumn(over.id as string);

    if (!activeCol || !overCol || activeCol === overCol) return;

    // Optimistically move the card to the new column so the UI updates in real-time
    setTasks(prev => prev.map(t =>
      t.id === active.id ? { ...t, status: overCol } : t
    ));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;

    const activeCol = findColumn(active.id as string);
    const overCol = findColumn(over.id as string);

    if (!activeCol || !overCol) return;

    // Reorder within same column
    if (activeCol === overCol) {
      setTasks(prev => {
        const colTasks = prev.filter(t => t.status === activeCol);
        const otherTasks = prev.filter(t => t.status !== activeCol);
        const oldIdx = colTasks.findIndex(t => t.id === active.id);
        const newIdx = colTasks.findIndex(t => t.id === over.id);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        const reordered = arrayMove(colTasks, oldIdx, newIdx);
        return [...otherTasks, ...reordered];
      });
      return;
    }

    // Cross-column move: task already moved optimistically in handleDragOver
    // Just persist to backend
    api.patch(`/tasks/${active.id}`, { status: overCol }).catch(() => {
      // Rollback on error
      fetchTasks();
    });
  };

  const filteredTasks = tasks.filter(t => {
    if (filterAssignee && t.assigneeId !== filterAssignee) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (showMyTasks && t.assigneeId !== currentUser?.id) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-textMuted">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading board…
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3 shrink-0">
        <h1 className="text-2xl font-bold">Board</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setShowMyTasks(v => !v)}
            className={clsx('px-3 py-2 text-sm rounded-lg border transition-colors', showMyTasks
              ? 'bg-primary text-white border-primary'
              : 'bg-surface border-border hover:bg-background text-textMuted')}
          >
            My Tasks
          </button>
          <select
            className="p-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
            value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          >
            <option value="">All Assignees</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select
            className="p-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
            value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            {['Highest', 'High', 'Medium', 'Low', 'Lowest'].map(p => <option key={p}>{p}</option>)}
          </select>
          {(filterAssignee || filterPriority || showMyTasks) && (
            <button
              onClick={() => { setFilterAssignee(''); setFilterPriority(''); setShowMyTasks(false); }}
              className="px-3 py-2 text-sm border border-border rounded-lg text-textMuted hover:bg-background"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 h-full pb-4">
            {COLUMNS.map(col => (
              <DroppableColumn
                key={col}
                col={col}
                tasks={filteredTasks.filter(t => t.status === col)}
                spaceId={selectedSpaceId}
                onAdd={task => setTasks(prev => [task, ...prev])}
              />
            ))}
          </div>

          {/* Ghost card while dragging */}
          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}




