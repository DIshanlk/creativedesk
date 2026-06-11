"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { FileText, Plus, X, Send, Eye, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

// ── Built-in form templates ──────────────────────────────────────────────────
const FORM_TEMPLATES = [
  {
    id: 'creative-request',
    name: 'Creative Request',
    description: 'Request new design work — banners, social posts, illustrations, etc.',
    icon: '🎨',
    color: 'border-t-blue-500',
    workType: 'Request',
    fields: [
      { name: 'title', label: 'Project / Request Name', type: 'text', required: true, placeholder: 'e.g. Q3 Campaign Banner Set' },
      { name: 'description', label: 'Brief Description', type: 'textarea', required: true, placeholder: 'Describe what you need, the purpose, target audience…' },
      { name: 'format', label: 'Required Format / Output', type: 'select', required: true, options: ['Social Media Post', 'Banner / Display Ad', 'Email Template', 'Print Material', 'Illustration', 'Video / Animation', 'Presentation', 'Other'] },
      { name: 'dimensions', label: 'Dimensions / Specs', type: 'text', required: false, placeholder: 'e.g. 1080×1080px, A4, 16:9' },
      { name: 'reference', label: 'Reference Links / Examples', type: 'text', required: false, placeholder: 'https://…' },
      { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Highest'] },
      { name: 'dueDate', label: 'Deadline', type: 'date', required: true },
    ]
  },
  {
    id: 'design-approval',
    name: 'Design Asset Approval',
    description: 'Submit a finished asset for stakeholder sign-off before publishing.',
    icon: '✅',
    color: 'border-t-green-500',
    workType: 'Approval',
    fields: [
      { name: 'title', label: 'Asset Name', type: 'text', required: true, placeholder: 'e.g. Homepage Hero Banner v2' },
      { name: 'description', label: 'What needs approval?', type: 'textarea', required: true, placeholder: 'Describe the asset and any context the approver needs…' },
      { name: 'assetLink', label: 'Link to Asset (Figma / Drive / URL)', type: 'text', required: false, placeholder: 'https://figma.com/…' },
      { name: 'changes', label: 'Changes Made Since Last Review', type: 'textarea', required: false, placeholder: 'Updated colour palette, changed headline copy…' },
      { name: 'priority', label: 'Urgency', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Highest'] },
      { name: 'dueDate', label: 'Approval Needed By', type: 'date', required: true },
    ]
  },
  {
    id: 'campaign-brief',
    name: 'New Campaign Brief',
    description: 'Kick off a new marketing campaign with a structured creative brief.',
    icon: '📣',
    color: 'border-t-purple-500',
    workType: 'Task',
    fields: [
      { name: 'title', label: 'Campaign Name', type: 'text', required: true, placeholder: 'e.g. Summer 2026 Product Launch' },
      { name: 'description', label: 'Campaign Objective', type: 'textarea', required: true, placeholder: 'What should this campaign achieve? Who is the audience?' },
      { name: 'deliverables', label: 'Deliverables Required', type: 'textarea', required: true, placeholder: 'List all assets needed — e.g. 5 social posts, 1 email header, 2 banners…' },
      { name: 'brand', label: 'Brand Guidelines / Tone', type: 'text', required: false, placeholder: 'e.g. Bold, youthful, use brand kit v3' },
      { name: 'budget', label: 'Allocated Budget', type: 'text', required: false, placeholder: 'e.g. $5,000' },
      { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Highest'] },
      { name: 'dueDate', label: 'Campaign Launch Date', type: 'date', required: true },
    ]
  },
  {
    id: 'bug-report',
    name: 'Content Error Report',
    description: 'Report a mistake in published content — wrong copy, outdated asset, broken link.',
    icon: '🐛',
    color: 'border-t-red-500',
    workType: 'Bug',
    fields: [
      { name: 'title', label: 'What is wrong?', type: 'text', required: true, placeholder: 'e.g. Incorrect phone number on Contact page' },
      { name: 'description', label: 'Details', type: 'textarea', required: true, placeholder: 'Where exactly is the error? What should it say instead?' },
      { name: 'url', label: 'Page / Location URL', type: 'text', required: false, placeholder: 'https://…' },
      { name: 'screenshot', label: 'Screenshot / Evidence Link', type: 'text', required: false, placeholder: 'https://…' },
      { name: 'priority', label: 'Severity', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Highest'] },
      { name: 'dueDate', label: 'Fix Needed By', type: 'date', required: false },
    ]
  },
];

// ── Form Submission Modal ─────────────────────────────────────────────────────
function FormModal({ template, spaces, onClose, onSubmit }: { template: typeof FORM_TEMPLATES[0]; spaces: any[]; onClose: () => void; onSubmit: () => void }) {
  const { currentUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(spaces[0]?.id || '');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const fd = new FormData(e.target);
    const values: any = Object.fromEntries(fd.entries());

    // Build description from all form fields
    const descParts = template.fields
      .filter(f => f.name !== 'title' && f.name !== 'dueDate' && f.name !== 'priority' && values[f.name])
      .map(f => `**${f.label}:** ${values[f.name]}`);

    try {
      await api.post('/tasks', {
        title: values.title,
        description: descParts.join('\n\n'),
        workType: template.workType,
        spaceId: selectedSpace,
        reporterId: currentUser?.id,
        priority: values.priority || 'Medium',
        dueDate: values.dueDate || undefined,
        status: 'To Do',
      });
      setDone(true);
      setTimeout(() => { onClose(); onSubmit(); }, 1500);
    } catch (err: any) {
      alert('Failed to submit: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <h2 className="text-lg font-bold">{template.name}</h2>
              <p className="text-xs text-textMuted mt-0.5">{template.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-text"><X className="w-5 h-5" /></button>
        </div>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center text-3xl">✓</div>
            <div className="text-center">
              <h3 className="text-lg font-bold">Submitted!</h3>
              <p className="text-sm text-textMuted mt-1">Your request has been created and the team has been notified.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <form id="form-submit" onSubmit={handleSubmit} className="space-y-5">
                {/* Space selector */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Submit to Space / Project <span className="text-red-500">*</span></label>
                  <select value={selectedSpace} onChange={e => setSelectedSpace(e.target.value)} required
                    className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Select space...</option>
                    {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Dynamic fields */}
                {template.fields.map(field => (
                  <div key={field.name} className="space-y-1.5">
                    <label className="block text-sm font-medium">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea name={field.name} required={field.required} placeholder={field.placeholder} rows={3}
                        className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary resize-none" />
                    ) : field.type === 'select' ? (
                      <select name={field.name} required={field.required}
                        className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                        <option value="">Select...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} name={field.name} required={field.required} placeholder={field.placeholder}
                        className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                    )}
                  </div>
                ))}
              </form>
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0 flex justify-between items-center bg-surface rounded-b-xl">
              <p className="text-xs text-textMuted">Submitted by <strong>{currentUser?.name}</strong></p>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded hover:bg-background">Cancel</button>
                <button type="submit" form="form-submit" disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Forms() {
  const [openTemplate, setOpenTemplate] = useState<typeof FORM_TEMPLATES[0] | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [tab, setTab] = useState<'templates' | 'responses'>('templates');
  const { currentUser } = useAuth();

  const fetchRecent = () => {
    api.get('/tasks').then(res => {
      const workTypes = FORM_TEMPLATES.map(f => f.workType);
      setRecentRequests(res.data.filter((t: any) => workTypes.includes(t.workType)).slice(0, 20));
    });
  };

  useEffect(() => {
    api.get('/reference/spaces').then(r => setSpaces(r.data));
    fetchRecent();
  }, []);

  const statusColor: Record<string, string> = {
    'To Do': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    'In Progress': 'bg-blue-100 text-blue-700',
    'In Review': 'bg-yellow-100 text-yellow-700',
    'Approved': 'bg-green-100 text-green-700',
    'Done': 'bg-emerald-100 text-emerald-700',
    'Blocked': 'bg-red-100 text-red-700',
  };

  const myRequests = recentRequests.filter(t => t.reporterId === currentUser?.id);
  const allRequests = recentRequests;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Forms & Requests</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {[
            { key: 'templates', label: 'Submit a Request', icon: FileText },
            { key: 'responses', label: `Responses (${allRequests.length})`, icon: ClipboardList },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={clsx('flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors',
                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-text')}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'templates' && (
        <div className="space-y-6">
          <p className="text-sm text-textMuted">Choose a form below to submit a new request. Your submission will be automatically created as a task and assigned to the relevant team.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FORM_TEMPLATES.map(tmpl => (
              <button key={tmpl.id} onClick={() => setOpenTemplate(tmpl)}
                className={clsx('bg-surface border border-border border-t-4 rounded-xl p-6 text-left hover:shadow-md transition-all group', tmpl.color)}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{tmpl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base group-hover:text-primary transition-colors">{tmpl.name}</h3>
                    <p className="text-sm text-textMuted mt-1 leading-relaxed">{tmpl.description}</p>
                    <div className="flex items-center gap-3 mt-4">
                      <span className="text-xs text-textMuted bg-background border border-border px-2 py-1 rounded-full">{tmpl.workType}</span>
                      <span className="text-xs text-textMuted">{tmpl.fields.length} fields</span>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-textMuted group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'responses' && (
        <div className="space-y-4">
          {/* My submissions banner */}
          {myRequests.length > 0 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm">
              <span className="font-medium text-primary">You have {myRequests.length} submission{myRequests.length > 1 ? 's' : ''}.</span>
              <span className="text-textMuted ml-1">Track status updates in your notifications or My Work page.</span>
            </div>
          )}

          {allRequests.length === 0 ? (
            <div className="p-10 text-center bg-surface border border-border rounded-lg text-textMuted">
              No form submissions yet. Use the "Submit a Request" tab to create one.
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background text-textMuted border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Key</th>
                    <th className="px-4 py-3 text-left font-medium">Request</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Submitted By</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Priority</th>
                    <th className="px-4 py-3 text-left font-medium">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allRequests.map(t => (
                    <tr key={t.id} className="hover:bg-background transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/task/${t.id}`} className="text-primary hover:underline font-mono text-xs">{t.key}</Link>
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <Link href={`/task/${t.id}`} className="font-medium hover:text-primary truncate block">{t.title}</Link>
                        <div className="text-xs text-textMuted truncate mt-0.5">{t.space?.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-background border border-border px-2 py-0.5 rounded-full">{t.workType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {t.reporter?.name?.charAt(0) || '?'}
                          </div>
                          <span>{t.reporter?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', statusColor[t.status] || 'bg-slate-100 text-slate-600')}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium" style={{ color: { Highest: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#60a5fa', Lowest: '#94a3b8' }[t.priority as string] }}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-textMuted">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Form submission modal */}
      {openTemplate && (
        <FormModal
          template={openTemplate}
          spaces={spaces}
          onClose={() => setOpenTemplate(null)}
          onSubmit={() => { fetchRecent(); setTab('responses'); }}
        />
      )}
    </div>
  );
}




