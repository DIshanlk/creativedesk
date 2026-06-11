"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { X, Send } from 'lucide-react';

export default function Approvals() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [showSubmit, setShowSubmit] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { currentUser, hasPermission } = useAuth();
  const canApprove = hasPermission('approve_task');

  useEffect(() => { fetchApprovals(); }, []);

  const fetchApprovals = async () => {
    const [approvRes, tasksRes, usersRes] = await Promise.all([
      api.get('/approvals'),
      api.get('/tasks'),
      api.get('/people')
    ]);
    setApprovals(approvRes.data);
    setTasks(tasksRes.data.filter((t: any) => !['Done','Approved'].includes(t.status)));
    setUsers(usersRes.data);
  };

  const handleApprove = async (id: string) => {
    await api.patch(`/approvals/${id}`, { status: 'Approved', approverId: currentUser?.id });
    fetchApprovals();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await api.patch(`/approvals/${rejectModal.id}`, { status: 'Changes Requested', comment: rejectComment, approverId: currentUser?.id });
    setRejectModal(null);
    setRejectComment('');
    fetchApprovals();
  };

  const handleSubmitForApproval = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    await api.post('/approvals', { ...data, submitterId: currentUser?.id });
    setShowSubmit(false);
    fetchApprovals();
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      'Pending Review': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'Changes Requested': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Not Submitted': 'bg-slate-100 text-slate-600',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const filtered = approvals.filter(a => !filterStatus || a.status === filterStatus);

  const myPending = approvals.filter(a => a.submitterId === currentUser?.id && a.status === 'Pending Review');
  const needsMyAction = canApprove ? approvals.filter(a => a.status === 'Pending Review') : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Approvals</h1>
        <div className="flex gap-2 items-center">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="p-2 bg-surface border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
            <option value="">All Statuses</option>
            {['Pending Review','Approved','Changes Requested','Not Submitted'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowSubmit(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90">
            <Send className="w-4 h-4" /> Submit for Approval
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: approvals.length, color: 'border-l-slate-400' },
          { label: 'Pending Review', value: approvals.filter(a => a.status === 'Pending Review').length, color: 'border-l-orange-500' },
          { label: 'Approved', value: approvals.filter(a => a.status === 'Approved').length, color: 'border-l-green-500' },
          { label: 'Changes Requested', value: approvals.filter(a => a.status === 'Changes Requested').length, color: 'border-l-red-500' },
        ].map(card => (
          <div key={card.label} className={clsx('bg-surface border border-border rounded-lg p-4 border-l-4', card.color)}>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-sm text-textMuted">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Action alerts */}
      {needsMyAction.length > 0 && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0"></div>
          <div className="text-sm">
            <span className="font-semibold text-orange-700 dark:text-orange-400">{needsMyAction.length} request{needsMyAction.length > 1 ? 's' : ''} need your approval.</span>
          </div>
        </div>
      )}
      {myPending.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></div>
          <div className="text-sm">
            <span className="font-semibold text-blue-700 dark:text-blue-400">You have {myPending.length} submission{myPending.length > 1 ? 's' : ''} awaiting review.</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-textMuted border-b border-border">
            <tr>
              <th className="p-3 font-medium">Task</th>
              <th className="p-3 font-medium">Space</th>
              <th className="p-3 font-medium">Submitted By</th>
              <th className="p-3 font-medium">Approver</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Comment</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-background transition-colors">
                <td className="p-3">
                  <Link href={`/task/${a.task.id}`} className="text-primary hover:underline font-medium text-xs font-mono">{a.task.key}</Link>
                  <div className="text-xs text-textMuted max-w-[200px] truncate mt-0.5">{a.task.title}</div>
                </td>
                <td className="p-3 text-textMuted text-xs">{a.task.space?.name || '-'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {a.submitter?.name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm">{a.submitter?.name || '-'}</span>
                  </div>
                </td>
                <td className="p-3 text-sm text-textMuted">{a.approver?.name || <span className="italic">Any manager</span>}</td>
                <td className="p-3">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(a.status))}>{a.status}</span>
                </td>
                <td className="p-3 text-xs text-textMuted max-w-[160px] truncate">{a.comment || '-'}</td>
                <td className="p-3 text-xs text-textMuted whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  {a.status === 'Pending Review' && canApprove && (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleApprove(a.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600">
                        Approve
                      </button>
                      <button onClick={() => setRejectModal({ id: a.id, title: a.task.title })}
                        className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600">
                        Request Changes
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-textMuted">No approval requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Submit for Approval Modal */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface w-full max-w-md rounded-lg shadow-xl border border-border">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h2 className="text-lg font-bold">Submit Task for Approval</h2>
              <button onClick={() => setShowSubmit(false)} className="text-textMuted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitForApproval} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Select Task *</label>
                <select name="taskId" required className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Choose a task...</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.key} — {t.title}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Assign Approver</label>
                <select name="approverId" className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Any manager / admin</option>
                  {users.filter(u => ['Admin','Manager'].includes(u.role)).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setShowSubmit(false)} className="px-4 py-2 text-sm border border-border rounded hover:bg-background">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject / Request Changes Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface w-full max-w-md rounded-lg shadow-xl border border-border">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h2 className="text-lg font-bold">Request Changes</h2>
              <button onClick={() => setRejectModal(null)} className="text-textMuted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-textMuted">Add a comment explaining what needs to be changed for <strong className="text-text">"{rejectModal.title}"</strong>.</p>
              <textarea
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                rows={4}
                placeholder="Describe the changes needed..."
                className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm border border-border rounded hover:bg-background">Cancel</button>
                <button onClick={handleReject} className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600">Request Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




