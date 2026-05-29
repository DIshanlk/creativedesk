import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import api from '../api';
import { Link } from 'react-router-dom';
import { useSpace } from '../context/SpaceContext';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import { AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

const PIE_COLORS = ['#94a3b8','#3b82f6','#a855f7','#22c55e','#10b981','#ef4444'];

function KpiCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <div className={clsx('bg-surface border border-border rounded-lg p-5 border-l-4', color)}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm font-medium mt-1">{label}</div>
          {sub && <div className="text-xs text-textMuted mt-0.5">{sub}</div>}
        </div>
        {Icon && <Icon className="w-8 h-8 text-textMuted opacity-30" />}
      </div>
    </div>
  );
}

// ── Supervisor / Manager / Admin Dashboard ────────────────────────────────────
function SupervisorDashboard({ spaceId }: { spaceId: string | null }) {
  const [data, setData] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = spaceId ? `/reports/dashboard?spaceId=${spaceId}` : '/reports/dashboard';
    Promise.all([api.get(url), api.get('/approvals'), api.get('/people')])
      .then(([rep, app, ppl]) => { setData(rep.data); setApprovals(app.data); setPeople(ppl.data); })
      .finally(() => setLoading(false));
  }, [spaceId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-textMuted">Loading dashboard...</div>;
  if (!data) return null;

  const { kpis, charts, overdueTasks, overloadedDesigners } = data;
  const pendingApprovals = approvals.filter((a: any) => a.status === 'Pending Review');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
          <p className="text-sm text-textMuted">Team overview and actionable insights</p>
        </div>
      </div>

      {/* Alert row */}
      {(overdueTasks.length > 0 || pendingApprovals.length > 0 || overloadedDesigners.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {overdueTasks.length > 0 && (
            <Link to="/list" className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg hover:shadow-sm transition-shadow">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-700 dark:text-red-400 text-sm">{overdueTasks.length} Overdue Tasks</div>
                <div className="text-xs text-red-600 dark:text-red-300 mt-0.5">Require immediate attention</div>
              </div>
            </Link>
          )}
          {pendingApprovals.length > 0 && (
            <Link to="/approvals" className="flex gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg hover:shadow-sm transition-shadow">
              <Clock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-orange-700 dark:text-orange-400 text-sm">{pendingApprovals.length} Pending Approvals</div>
                <div className="text-xs text-orange-600 dark:text-orange-300 mt-0.5">Awaiting your review</div>
              </div>
            </Link>
          )}
          {overloadedDesigners.length > 0 && (
            <Link to="/people" className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg hover:shadow-sm transition-shadow">
              <TrendingUp className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-700 dark:text-yellow-400 text-sm">{overloadedDesigners.length} Overloaded Member{overloadedDesigners.length > 1 ? 's' : ''}</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-300 mt-0.5">{overloadedDesigners.map((d: any) => d.name).join(', ')}</div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Created (7d)" value={kpis.createdLast7Days} color="border-l-blue-500" icon={TrendingUp} />
        <KpiCard label="Completed (7d)" value={kpis.completedLast7Days} color="border-l-green-500" icon={CheckCircle2} />
        <KpiCard label="Overdue" value={overdueTasks.length} color="border-l-red-500" icon={AlertTriangle} />
        <KpiCard label="Due Soon" value={kpis.dueSoon} color="border-l-yellow-500" sub="Next 7 days" icon={Clock} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Status Breakdown</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.statusDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {charts.statusDonut.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Team Workload</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.teamWorkload} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" width={80} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'var(--color-background)' }} />
                <Bar dataKey="activeTasks" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold mb-4">7-Day Trend</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={false} name="Created" />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={false} name="Done" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Designer Workloads */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex justify-between">
          <h2 className="font-semibold">Designer Workloads</h2>
          <Link to="/people" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.filter((p: any) => p.role === 'Designer').map((p: any) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">{p.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className={clsx('text-xs font-bold', p.workloadPercentage > 100 ? 'text-red-500' : 'text-textMuted')}>{p.activeTasksCount} tasks</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden border border-border mt-1">
                  <div className={clsx('h-full', p.workloadPercentage > 80 ? 'bg-red-500' : p.workloadPercentage > 60 ? 'bg-yellow-500' : 'bg-primary')}
                    style={{ width: `${Math.min(p.workloadPercentage, 100)}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold">Pending Approvals</h2>
            <Link to="/approvals" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {pendingApprovals.slice(0, 5).map((a: any) => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-4 hover:bg-background transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.task?.title}</div>
                  <div className="text-xs text-textMuted mt-0.5">Submitted by {a.submitter?.name} · {new Date(a.createdAt).toLocaleDateString()}</div>
                </div>
                <Link to="/approvals" className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 shrink-0">Review</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-red-500">Overdue Tasks ({overdueTasks.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-background text-textMuted border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Key</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Assignee</th>
                <th className="px-4 py-3 text-left font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {overdueTasks.map((task: any) => {
                const days = Math.round((Date.now() - new Date(task.dueDate).getTime()) / 86400000);
                return (
                  <tr key={task.id} className="hover:bg-background">
                    <td className="px-5 py-3"><Link to={`/task/${task.id}`} className="text-primary hover:underline font-mono text-xs">{task.key}</Link></td>
                    <td className="px-4 py-3 font-medium">{task.title}</td>
                    <td className="px-4 py-3 text-textMuted">{task.assignee?.name || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-red-500 font-medium">{new Date(task.dueDate).toLocaleDateString()} <span className="text-xs text-textMuted">({days}d ago)</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Designer Personal Dashboard ───────────────────────────────────────────────
function DesignerDashboard() {
  const { currentUser } = useAuth();
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    api.get('/tasks').then(res => {
      setMyTasks(res.data.filter((t: any) => t.assigneeId === currentUser.id));
    }).finally(() => setLoading(false));
  }, [currentUser]);

  if (loading) return <div className="flex items-center justify-center h-64 text-textMuted">Loading...</div>;

  const active = myTasks.filter(t => !['Done','Approved'].includes(t.status));
  const overdue = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !['Done','Approved'].includes(t.status));
  const inReview = myTasks.filter(t => t.status === 'In Review');
  const done7d = myTasks.filter(t => ['Done','Approved'].includes(t.status) && new Date(t.updatedAt) >= new Date(Date.now() - 7 * 86400000));
  const upcoming = active.filter(t => t.dueDate).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5);

  const statusCounts = myTasks.reduce((acc: any, t) => { acc[t.status] = (acc[t.status]||0)+1; return acc; }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {currentUser?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-textMuted mt-1">{currentUser?.jobTitle || currentUser?.role} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {overdue.length > 0 && (
        <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-700 dark:text-red-400 text-sm">You have {overdue.length} overdue task{overdue.length > 1 ? 's' : ''}</div>
            <div className="text-xs text-red-600 dark:text-red-300 mt-0.5">{overdue.map(t => t.key).join(', ')}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Tasks" value={active.length} color="border-l-blue-500" />
        <KpiCard label="In Review" value={inReview.length} color="border-l-yellow-500" sub="Awaiting feedback" />
        <KpiCard label="Overdue" value={overdue.length} color="border-l-red-500" />
        <KpiCard label="Completed (7d)" value={done7d.length} color="border-l-green-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming deadlines */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">Upcoming Deadlines</h2>
            <Link to="/my-work" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-textMuted text-sm">No upcoming deadlines.</div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(t => {
                const diff = Math.round((new Date(t.dueDate).getTime() - Date.now()) / 86400000);
                const isOverdue = diff < 0;
                return (
                  <Link key={t.id} to={`/task/${t.id}`} className="flex items-center gap-3 hover:bg-background p-2 -mx-2 rounded-lg transition-colors">
                    <div className={clsx('text-xs font-bold w-12 text-center py-1 rounded', isOverdue ? 'bg-red-100 text-red-600' : diff <= 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
                      {isOverdue ? `${Math.abs(diff)}d` : diff === 0 ? 'Today' : `${diff}d`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.title}</div>
                      <div className="text-xs text-textMuted">{t.key} · {new Date(t.dueDate).toLocaleDateString()}</div>
                    </div>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full', PIE_COLORS[0])}>
                      {t.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* My task status chart */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold mb-4">My Tasks by Status</h2>
          {statusData.length === 0 ? (
            <div className="text-textMuted text-sm">No tasks assigned to you yet.</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Tasks In Review awaiting feedback */}
      {inReview.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-yellow-600 dark:text-yellow-400">Awaiting Review ({inReview.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {inReview.map(t => (
              <Link key={t.id} to={`/task/${t.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-background transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-xs text-textMuted mt-0.5">{t.key} · Submitted for review</div>
                </div>
                <span className="text-xs text-yellow-700 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 px-2 py-0.5 rounded-full">In Review</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { currentUser } = useAuth();
  const { selectedSpaceId } = useSpace();
  const isSupervisor = ['Admin','Manager'].includes(currentUser?.role || '');

  return isSupervisor
    ? <SupervisorDashboard spaceId={selectedSpaceId} />
    : <DesignerDashboard />;
}
