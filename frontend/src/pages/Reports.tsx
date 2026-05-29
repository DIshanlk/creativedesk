import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../api';
import { useSpace } from '../context/SpaceContext';
import clsx from 'clsx';

const PIE_COLORS = ['#6366f1','#3b82f6','#f59e0b','#22c55e','#10b981','#ef4444'];

function KpiCard({ label, value, sub, color }: any) {
  return (
    <div className={clsx('bg-surface border border-border rounded-lg p-5', color && `border-l-4 ${color}`)}>
      <div className="text-3xl font-bold text-text mb-1">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      {sub && <div className="text-xs text-textMuted mt-1">{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { selectedSpaceId } = useSpace();

  useEffect(() => {
    setLoading(true);
    const url = selectedSpaceId ? `/reports/dashboard?spaceId=${selectedSpaceId}` : '/reports/dashboard';
    api.get(url).then(res => setData(res.data)).finally(() => setLoading(false));
  }, [selectedSpaceId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-textMuted">Loading reports...</div>
    </div>
  );

  if (!data) return null;

  const { kpis, charts, overdueTasks, overloadedDesigners } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports & Insights</h1>
        <span className="text-sm text-textMuted">{selectedSpaceId ? 'Filtered by space' : 'All spaces'}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Tasks Created (7d)" value={kpis.createdLast7Days} color="border-l-blue-500" sub="Last 7 days" />
        <KpiCard label="Completed (7d)" value={kpis.completedLast7Days} color="border-l-green-500" sub="Last 7 days" />
        <KpiCard label="Overdue" value={overdueTasks.length} color="border-l-red-500" sub="Past due date" />
        <KpiCard label="Due Soon" value={kpis.dueSoon} color="border-l-yellow-500" sub="Next 7 days" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Donut */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Tasks by Status</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.statusDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {charts.statusDonut.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Bar */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Tasks by Priority</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.priorityBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'var(--color-background)' }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Workload */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Team Workload</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.teamWorkload} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" width={90} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'var(--color-background)' }} />
                <Bar dataKey="activeTasks" fill="#8b5cf6" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-semibold mb-4">Task Trend — Last 7 Days</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" />
              <YAxis stroke="var(--color-text-muted)" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Created" />
              <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overdue Tasks Table */}
      {overdueTasks.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <h2 className="font-semibold">Overdue Tasks ({overdueTasks.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-textMuted">Task</th>
                  <th className="text-left px-4 py-3 font-medium text-textMuted">Assignee</th>
                  <th className="text-left px-4 py-3 font-medium text-textMuted">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium text-textMuted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overdueTasks.map((t: any) => {
                  const days = Math.round((Date.now() - new Date(t.dueDate).getTime()) / 86400000);
                  return (
                    <tr key={t.id} className="hover:bg-background transition-colors">
                      <td className="px-5 py-3">{t.title}</td>
                      <td className="px-4 py-3 text-textMuted">{t.assignee?.name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-red-500 font-medium">{new Date(t.dueDate).toLocaleDateString()} <span className="text-xs text-textMuted">({days}d ago)</span></td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">{t.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-orange-50 dark:bg-orange-900/10">
          <h2 className="font-semibold text-orange-600 dark:text-orange-400">Insights & Attention Needed</h2>
        </div>
        <div className="p-5 space-y-3">
          {overdueTasks.length === 0 && overloadedDesigners.length === 0 && (
            <div className="text-textMuted text-sm">No issues detected. Everything looks good!</div>
          )}
          {overdueTasks.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-red-500 shrink-0"></div>
              <div>
                <div className="font-medium">Overdue Tasks</div>
                <div className="text-sm text-textMuted">{overdueTasks.length} task{overdueTasks.length > 1 ? 's have' : ' has'} passed their due date and need attention.</div>
              </div>
            </div>
          )}
          {overloadedDesigners.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-orange-500 shrink-0"></div>
              <div>
                <div className="font-medium">Overloaded Team Members</div>
                <div className="text-sm text-textMuted">
                  {overloadedDesigners.map((d: any) => d.name).join(', ')} {overloadedDesigners.length === 1 ? 'has' : 'have'} more than 8 active tasks and may be overwhelmed.
                </div>
              </div>
            </div>
          )}
          {kpis.dueSoon > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-yellow-500 shrink-0"></div>
              <div>
                <div className="font-medium">Upcoming Deadlines</div>
                <div className="text-sm text-textMuted">{kpis.dueSoon} task{kpis.dueSoon > 1 ? 's are' : ' is'} due within the next 7 days.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
