"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Shield, Users, Layers, UsersRound, LayoutList, Activity,
  Plus, Pencil, Trash2, RotateCcw, Search, Bell, RefreshCw,
  ChevronLeft, ChevronRight, Tag, FolderOpen, X, Check,
  TrendingUp, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import clsx from 'clsx';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'spaces', label: 'Spaces', icon: Layers },
  { id: 'teams', label: 'Teams', icon: UsersRound },
  { id: 'tasks', label: 'Tasks', icon: LayoutList },
  { id: 'categories', label: 'Categories & Labels', icon: Tag },
  { id: 'logs', label: 'Activity Logs', icon: Activity },
  { id: 'broadcast', label: 'Broadcast', icon: Bell },
] as const;

type Tab = typeof TABS[number]['id'];

const ROLES = ['SuperAdmin', 'Admin', 'Manager', 'Designer', 'Viewer'];
const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Designer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Viewer: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#64748b', '#14b8a6'];

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');

  // Guard
  useEffect(() => {
    if (currentUser && currentUser.role !== 'SuperAdmin') router.push('/');
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== 'SuperAdmin') return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-surface border-r border-border flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold">Admin Panel</div>
              <div className="text-[10px] text-textMuted">SuperAdmin</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx('w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                  tab === t.id ? 'bg-primary/10 text-primary font-medium' : 'text-textMuted hover:bg-background hover:text-text')}>
                <Icon className="w-4 h-4 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <button onClick={() => router.push('/')} className="text-xs text-textMuted hover:text-primary flex items-center gap-1.5">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to App
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'spaces' && <SpacesTab />}
        {tab === 'teams' && <TeamsTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'categories' && <CatLabTab />}
        {tab === 'logs' && <LogsTab />}
        {tab === 'broadcast' && <BroadcastTab />}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Overview
// ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {}); }, []);
  if (!stats) return <LoadingScreen />;

  const kpis = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Tasks', value: stats.totalTasks, icon: LayoutList, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Open Tasks', value: stats.openTasks, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Overdue Tasks', value: stats.overdueTasks, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Done Tasks', value: stats.doneTasks, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, icon: Shield, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { label: 'Spaces', value: stats.totalSpaces, icon: Layers, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { label: 'Teams', value: stats.totalTeams, icon: UsersRound, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">System Overview</h1>
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', k.bg)}>
                <Icon className={clsx('w-5 h-5', k.color)} />
              </div>
              <div>
                <div className="text-2xl font-bold">{k.value}</div>
                <div className="text-xs text-textMuted">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Role breakdown */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Users by Role</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={stats.roleBreakdown.map((r: any) => ({ name: r.role, value: r.count }))}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                {stats.roleBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status breakdown */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.statusBreakdown.map((s: any) => ({ name: s.status.replace(' ', '\n'), value: s.count }))} margin={{ bottom: 20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 7-day activity */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Tasks Created (7 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats.activityTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | { user: any } | null>(null);
  const [resetModal, setResetModal] = useState<any>(null);
  const { confirm, confirmProps } = useConfirm();

  const load = useCallback(() => api.get('/admin/users').then(r => setUsers(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const deleteUser = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete User',
      message: `Delete "${name}"? All their tasks, comments, and data will be permanently removed.`,
      confirmLabel: 'Delete User',
      variant: 'danger'
    });
    if (!ok) return;
    await api.delete(`/admin/users/${id}`);
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">User Management <span className="text-textMuted text-sm font-normal">({users.length})</span></h1>
        <button onClick={() => setModal('create')} className="flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…" className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" />
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border text-xs text-textMuted uppercase tracking-wide">
            <tr>
              {['Name', 'Email', 'Role', 'Dept', 'Tasks', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-background/50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-textMuted">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[u.role] || ROLE_COLORS.Viewer)}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-textMuted">{u.department || '—'}</td>
                <td className="px-4 py-3">{u._count?.assignedTasks ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full',
                    u.availability === 'Available' ? 'bg-green-100 text-green-700' :
                    u.availability === 'Busy' ? 'bg-yellow-100 text-yellow-700' :
                    u.availability === 'Overloaded' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')}>
                    {u.availability}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setModal({ user: u })} className="p-1.5 text-textMuted hover:text-primary rounded hover:bg-background" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setResetModal(u)} className="p-1.5 text-textMuted hover:text-yellow-600 rounded hover:bg-background" title="Reset Password">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteUser(u.id, u.name)} className="p-1.5 text-textMuted hover:text-red-500 rounded hover:bg-background" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-textMuted">No users found</div>}
      </div>

      {modal && <UserModal onClose={() => setModal(null)} onSaved={load}
        user={modal === 'create' ? null : (modal as any).user} />}
      {resetModal && <ResetPasswordModal user={resetModal} onClose={() => setResetModal(null)} />}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}

function UserModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'Designer',
    jobTitle: user?.jobTitle || '',
    department: user?.department || '',
    availability: user?.availability || 'Available',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      if (user) await api.patch(`/admin/users/${user.id}`, payload);
      else await api.post('/admin/users', payload);
      onSaved(); onClose();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed');
    }
    setSaving(false);
  };

  return (
    <Modal title={user ? 'Edit User' : 'Create User'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={input} /></Field>
        <Field label="Email *"><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" className={input} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role *">
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={input}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Availability">
            <select value={form.availability} onChange={e => setForm(f => ({ ...f, availability: e.target.value }))} className={input}>
              {['Available', 'Busy', 'Overloaded', 'On Leave'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Job Title"><input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} className={input} /></Field>
          <Field label="Department"><input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={input} /></Field>
        </div>
        <Field label={user ? 'New Password (leave blank to keep)' : 'Password (default: Password@123)'}>
          <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} type="password" className={input} placeholder={user ? 'Leave blank to keep' : 'Password@123'} />
        </Field>
      </div>
      <div className="flex justify-end gap-3 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-background">Cancel</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {saving ? 'Saving…' : user ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [pw, setPw] = useState('Password@123');
  const [done, setDone] = useState(false);
  const reset = async () => {
    await api.post(`/admin/users/${user.id}/reset-password`, { password: pw });
    setDone(true);
  };
  return (
    <Modal title={`Reset password for ${user.name}`} onClose={onClose}>
      {done ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm">Password has been reset to <code className="bg-background border border-border px-2 py-0.5 rounded text-xs font-mono">{pw}</code></p>
          <p className="text-xs text-textMuted">Share this with the user and ask them to change it on next login.</p>
          <button onClick={onClose} className="mt-2 px-4 py-2 text-sm bg-primary text-white rounded-lg">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="New Temporary Password">
            <input value={pw} onChange={e => setPw(e.target.value)} className={input} />
          </Field>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-background">Cancel</button>
            <button onClick={reset} className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Reset Password</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// Spaces
// ──────────────────────────────────────────────────────────────
function SpacesTab() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [modal, setModal] = useState<'create' | { space: any } | null>(null);
  const { confirm, confirmProps } = useConfirm();

  const load = useCallback(() => {
    Promise.all([
      api.get('/admin/spaces'),
      api.get('/admin/teams'),
      api.get('/admin/users'),
    ]).then(([s, t, u]) => { setSpaces(s.data); setTeams(t.data); setUsers(u.data); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Space',
      message: `Delete space "${name}"? This will fail if the space still has tasks. Remove all tasks first.`,
      confirmLabel: 'Delete Space',
      variant: 'danger'
    });
    if (!ok) return;
    try { await api.delete(`/admin/spaces/${id}`); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Space Management</h1>
        <button onClick={() => setModal('create')} className="flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Space
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {spaces.map(s => (
          <div key={s.id} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 inline-block mt-1">{s.key}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setModal({ space: s })} className="p-1.5 text-textMuted hover:text-primary rounded"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => del(s.id, s.name)} className="p-1.5 text-textMuted hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="text-xs text-textMuted space-y-0.5">
              <div>Team: {s.team?.name || '—'}</div>
              <div>Lead: {s.lead?.name || '—'}</div>
              <div>Tasks: <span className="font-medium text-text">{s._count?.tasks}</span></div>
            </div>
          </div>
        ))}
        {spaces.length === 0 && <div className="col-span-3 text-center text-textMuted py-12">No spaces yet</div>}
      </div>
      {modal && <SpaceModal space={modal === 'create' ? null : (modal as any).space}
        teams={teams} users={users} onClose={() => setModal(null)} onSaved={load} />}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}

function SpaceModal({ space, teams, users, onClose, onSaved }: any) {
  const [form, setForm] = useState({ name: space?.name || '', key: space?.key || '', teamId: space?.teamId || '', leadId: space?.leadId || '' });
  const save = async () => {
    try {
      if (space) await api.patch(`/admin/spaces/${space.id}`, form);
      else await api.post('/admin/spaces', form);
      onSaved(); onClose();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };
  return (
    <Modal title={space ? 'Edit Space' : 'New Space'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Space Name *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={input} /></Field>
        <Field label="Key (e.g. PHOTOR) *"><input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toUpperCase() }))} className={input} placeholder="PHOTOR" /></Field>
        <Field label="Team">
          <select value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))} className={input}>
            <option value="">— None —</option>
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Lead">
          <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))} className={input}>
            <option value="">— None —</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-3 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-background">Cancel</button>
        <button onClick={save} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">Save</button>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// Teams
// ──────────────────────────────────────────────────────────────
function TeamsTab() {
  const [teams, setTeams] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [modal, setModal] = useState<'create' | null>(null);
  const [expand, setExpand] = useState<string | null>(null);
  const [newMember, setNewMember] = useState<Record<string, string>>({});
  const { confirm, confirmProps } = useConfirm();

  const load = useCallback(() => {
    Promise.all([api.get('/admin/teams'), api.get('/admin/users')]).then(([t, u]) => { setTeams(t.data); setAllUsers(u.data); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const addMember = async (teamId: string) => {
    const userId = newMember[teamId];
    if (!userId) return;
    try { await api.post(`/admin/teams/${teamId}/members`, { userId }); load(); setNewMember(n => ({ ...n, [teamId]: '' })); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const removeMember = async (teamId: string, userId: string) => {
    await api.delete(`/admin/teams/${teamId}/members/${userId}`); load();
  };

  const delTeam = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Team',
      message: `Delete team "${name}"? Members will be removed and the team will be unlinked from all spaces.`,
      confirmLabel: 'Delete Team',
      variant: 'danger'
    });
    if (!ok) return;
    try { await api.delete(`/admin/teams/${id}`); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Team Management</h1>
        <button onClick={() => setModal('create')} className="flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Team
        </button>
      </div>
      <div className="space-y-3">
        {teams.map(team => (
          <div key={team.id} className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-background" onClick={() => setExpand(expand === team.id ? null : team.id)}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <UsersRound className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{team.name}</div>
                  <div className="text-xs text-textMuted">{team.type} · {team.members?.length} members · {team._count?.tasks} tasks</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); delTeam(team.id, team.name); }} className="p-1.5 text-textMuted hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                {expand === team.id ? <ChevronLeft className="w-4 h-4 rotate-90 text-textMuted" /> : <ChevronRight className="w-4 h-4 text-textMuted" />}
              </div>
            </div>
            {expand === team.id && (
              <div className="border-t border-border p-4 space-y-3">
                {/* Members list */}
                <div className="space-y-2">
                  {team.members.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {m.user.name[0]}
                        </div>
                        <span>{m.user.name}</span>
                        {m.isLead && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded">Lead</span>}
                      </div>
                      <button onClick={() => removeMember(team.id, m.user.id)} className="p-1 text-textMuted hover:text-red-500 rounded"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                {/* Add member */}
                <div className="flex gap-2">
                  <select value={newMember[team.id] || ''} onChange={e => setNewMember(n => ({ ...n, [team.id]: e.target.value }))} className={clsx(input, 'flex-1')}>
                    <option value="">Add a member…</option>
                    {allUsers.filter(u => !team.members.find((m: any) => m.user.id === u.id)).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                  <button onClick={() => addMember(team.id)} className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90">Add</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {modal && <NewTeamModal onClose={() => setModal(null)} onSaved={load} />}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}

function NewTeamModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Official');
  const save = async () => {
    if (!name) return;
    await api.post('/admin/teams', { name, type });
    onSaved(); onClose();
  };
  return (
    <Modal title="New Team" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Team Name *"><input value={name} onChange={e => setName(e.target.value)} className={input} /></Field>
        <Field label="Type">
          <select value={type} onChange={e => setType(e.target.value)} className={input}>
            <option>Official</option>
            <option>Local</option>
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-3 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-background">Cancel</button>
        <button onClick={save} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">Create Team</button>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// Tasks
// ──────────────────────────────────────────────────────────────
function TasksTab() {
  const [data, setData] = useState<any>({ tasks: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { confirm, confirmProps } = useConfirm();

  const load = useCallback(() => {
    api.get('/admin/tasks', { params: { search, status, page } }).then(r => setData(r.data));
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string, key: string) => {
    const ok = await confirm({
      title: 'Delete Task',
      message: `Permanently delete task ${key}? All subtasks, comments, attachments and logs will be removed. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger'
    });
    if (!ok) return;
    await api.delete(`/admin/tasks/${id}`); load();
  };

  const STATUS_COLORS: Record<string, string> = {
    'To Do': 'bg-slate-100 text-slate-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    'In Review': 'bg-yellow-100 text-yellow-700',
    'Approved': 'bg-green-100 text-green-700',
    'Done': 'bg-emerald-100 text-emerald-700',
    'Blocked': 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Task Management <span className="text-sm text-textMuted font-normal">(Total: {data.total})</span></h1>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-textMuted hover:text-text px-3 py-1.5 border border-border rounded-lg hover:bg-background">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search tasks…" className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
          <option value="">All Statuses</option>
          {['To Do', 'In Progress', 'In Review', 'Approved', 'Done', 'Blocked'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border text-xs text-textMuted uppercase tracking-wide">
            <tr>{['Key', 'Title', 'Space', 'Assignee', 'Status', 'Due', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.tasks.map((t: any) => (
              <tr key={t.id} className="hover:bg-background/50">
                <td className="px-4 py-3 font-mono text-xs">{t.key}</td>
                <td className="px-4 py-3 max-w-xs truncate">{t.title}</td>
                <td className="px-4 py-3 text-textMuted">{t.space?.name}</td>
                <td className="px-4 py-3 text-textMuted">{t.assignee?.name || '—'}</td>
                <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full', STATUS_COLORS[t.status])}>{t.status}</span></td>
                <td className="px-4 py-3 text-textMuted text-xs">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => del(t.id, t.key)} className="p-1.5 text-textMuted hover:text-red-500 rounded hover:bg-background"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.tasks.length === 0 && <div className="p-8 text-center text-textMuted">No tasks found</div>}
      </div>

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-background"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-textMuted">Page {page} of {data.pages}</span>
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-background"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Categories & Labels
// ──────────────────────────────────────────────────────────────
function CatLabTab() {
  const [cats, setCats] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [newCat, setNewCat] = useState('');
  const [newLabel, setNewLabel] = useState({ name: '', color: '#6366f1' });

  const load = useCallback(() => {
    Promise.all([api.get('/admin/categories'), api.get('/admin/labels')]).then(([c, l]) => { setCats(c.data); setLabels(l.data); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const addCat = async () => {
    if (!newCat.trim()) return;
    try { await api.post('/admin/categories', { name: newCat }); setNewCat(''); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const addLabel = async () => {
    if (!newLabel.name.trim()) return;
    try { await api.post('/admin/labels', newLabel); setNewLabel({ name: '', color: '#6366f1' }); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="p-6 grid grid-cols-2 gap-6">
      {/* Categories */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><FolderOpen className="w-5 h-5 text-primary" /> Categories</h2>
        <div className="flex gap-2">
          <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()} placeholder="Category name…" className={clsx(input, 'flex-1')} />
          <button onClick={addCat} className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90">Add</button>
        </div>
        <div className="space-y-1.5">
          {cats.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2">
              <div>
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-textMuted ml-2">({c._count?.tasks} tasks)</span>
              </div>
              <button onClick={async () => { await api.delete(`/admin/categories/${c.id}`); load(); }}
                className="p-1 text-textMuted hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /> Labels</h2>
        <div className="flex gap-2">
          <input value={newLabel.name} onChange={e => setNewLabel(l => ({ ...l, name: e.target.value }))} placeholder="Label name…" className={clsx(input, 'flex-1')} />
          <input type="color" value={newLabel.color} onChange={e => setNewLabel(l => ({ ...l, color: e.target.value }))} className="w-10 h-9 rounded border border-border cursor-pointer" title="Pick color" />
          <button onClick={addLabel} className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90">Add</button>
        </div>
        <div className="space-y-1.5">
          {labels.map(l => (
            <div key={l.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: l.color || '#6366f1' }} />
                <span className="text-sm font-medium">{l.name}</span>
                <span className="text-xs text-textMuted">({l._count?.tasks} tasks)</span>
              </div>
              <button onClick={async () => { await api.delete(`/admin/labels/${l.id}`); load(); }}
                className="p-1 text-textMuted hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Activity Logs
// ──────────────────────────────────────────────────────────────
function LogsTab() {
  const [data, setData] = useState<any>({ logs: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    api.get('/admin/logs', { params: { page } }).then(r => setData(r.data));
  }, [page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Activity Logs <span className="text-sm text-textMuted font-normal">(Total: {data.total})</span></h1>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-textMuted hover:text-text px-3 py-1.5 border border-border rounded-lg hover:bg-background">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border text-xs text-textMuted uppercase tracking-wide">
            <tr>{['Time', 'User', 'Action', 'Task'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.logs.map((l: any) => (
              <tr key={l.id} className="hover:bg-background/50">
                <td className="px-4 py-2.5 text-xs text-textMuted whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2.5 font-medium text-xs">{l.user?.name}</td>
                <td className="px-4 py-2.5">
                  <span className="text-xs bg-background border border-border rounded px-2 py-0.5">{l.action}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-textMuted">{l.task ? `${l.task.key} — ${l.task.title}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.logs.length === 0 && <div className="p-8 text-center text-textMuted">No logs</div>}
      </div>
      {data.pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-background"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-textMuted">Page {page} of {data.pages}</span>
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-background"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Broadcast Notification
// ──────────────────────────────────────────────────────────────
function BroadcastTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<string[]>([]); // empty = all
  const [sent, setSent] = useState<number | null>(null);

  useEffect(() => { api.get('/admin/users').then(r => setUsers(r.data)); }, []);

  const send = async () => {
    if (!title || !content) return alert('Fill in title and content');
    const res = await api.post('/admin/broadcast', { title, content, userIds: selected });
    setSent(res.data.sent);
    setTitle(''); setContent(''); setSelected([]);
  };

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <h1 className="text-xl font-bold flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Broadcast Notification</h1>
      {sent !== null && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 shrink-0" />
          <span className="text-sm text-green-700 dark:text-green-400">Notification sent to {sent} user{sent !== 1 ? 's' : ''}!</span>
        </div>
      )}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <Field label="Notification Title *">
          <input value={title} onChange={e => setTitle(e.target.value)} className={input} placeholder="e.g. System Maintenance at 10 PM" />
        </Field>
        <Field label="Message *">
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} className={clsx(input, 'resize-none')} placeholder="Type your announcement…" />
        </Field>
        <div>
          <div className="text-sm font-medium mb-2">Recipients <span className="text-textMuted">(leave all unchecked to send to everyone)</span></div>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
            {users.map(u => (
              <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-background px-2 py-1.5 rounded">
                <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} className="rounded" />
                <span>{u.name}</span>
                <span className="text-xs text-textMuted">{u.role}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-textMuted">
            Will be sent to: <span className="font-medium">{selected.length === 0 ? `all ${users.length} users` : `${selected.length} selected user${selected.length !== 1 ? 's' : ''}`}</span>
          </div>
          <button onClick={send} className="flex items-center gap-2 bg-primary text-white rounded-lg px-5 py-2 text-sm hover:bg-primary/90">
            <Bell className="w-4 h-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 text-textMuted hover:text-text rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs font-medium text-textMuted">{label}</label>{children}</div>;
}

function LoadingScreen() {
  return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
}

const input = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none';




