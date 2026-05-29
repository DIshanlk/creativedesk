import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { currentUser, hasPermission } = useAuth();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [saveMsg, setSaveMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isAdmin = hasPermission('create_space');

  useEffect(() => {
    if (isAdmin) {
      api.get('/reference/spaces').then(res => setSpaces(res.data));
      api.get('/teams').then(res => setTeams(res.data));
      api.get('/people').then(res => setUsers(res.data));
    }
  }, [isAdmin]);

  const handleCreateSpace = async (e: any) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.post('/reference/spaces', data);
      api.get('/reference/spaces').then(res => setSpaces(res.data));
      e.target.reset();
      alert('Space created! It will appear in the sidebar after a page refresh.');
    } catch { alert('Failed to create space'); }
  };

  const handleSaveProfile = async (e: any) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingProfile(true);
    const fd = new FormData(e.target);
    const data: any = Object.fromEntries(fd.entries());
    try {
      await api.patch(`/people/${currentUser.id}`, data);
      setSaveMsg('Profile saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { setSaveMsg('Failed to save.'); } finally { setSavingProfile(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold mb-1">Profile Settings</h2>
          <p className="text-sm text-textMuted">Update your personal information.</p>
        </div>
        <form ref={formRef} onSubmit={handleSaveProfile} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Full Name</label>
              <input name="name" type="text" defaultValue={currentUser?.name} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Email</label>
              <input name="email" type="email" defaultValue={currentUser?.email} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Job Title</label>
              <input name="jobTitle" type="text" defaultValue={currentUser?.jobTitle} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Department</label>
              <input name="department" type="text" defaultValue={currentUser?.department} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">New Password</label>
              <input name="password" type="password" placeholder="Leave blank to keep current" className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Availability</label>
              <select name="availability" defaultValue={currentUser?.availability || 'Available'} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                {['Available','Busy','On Leave'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={savingProfile} className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
            {saveMsg && <span className="text-sm text-green-600 dark:text-green-400">{saveMsg}</span>}
          </div>
        </form>
      </div>

      {/* Space Management (Admin only) */}
      {isAdmin && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold mb-1">Space Management</h2>
            <p className="text-sm text-textMuted">Create new spaces (projects) and assign teams and leads.</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleCreateSpace} className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Space Name *</label>
                  <input name="name" required placeholder="e.g. Website Redesign" className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Space Key *</label>
                  <input name="key" required placeholder="e.g. WEB" className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Assigned Team</label>
                  <select name="teamId" className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                    <option value="">No Team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Project Lead</label>
                  <select name="leadId" className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                    <option value="">No Lead</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90">Create Space</button>
            </form>

            <h3 className="font-semibold text-sm mb-3">Existing Spaces</h3>
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-textMuted border-b border-border">
                  <tr>
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Key</th>
                    <th className="p-3 font-medium">Team</th>
                    <th className="p-3 font-medium">Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {spaces.map(s => (
                    <tr key={s.id} className="hover:bg-background">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 font-mono text-xs">{s.key}</td>
                      <td className="p-3 text-textMuted">{s.team?.name || '-'}</td>
                      <td className="p-3 text-textMuted">{s.lead?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold mb-1">Notification Preferences</h2>
          <p className="text-sm text-textMuted">Choose which in-app alerts you receive.</p>
        </div>
        <div className="p-6 space-y-3">
          {[
            'Task assignments',
            'Comment mentions',
            'Status changes',
            'Approval requests',
            'Due date reminders',
          ].map(label => (
            <label key={label} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border" />
              <span className="text-sm">{label}</span>
            </label>
          ))}
          <p className="text-xs text-textMuted pt-2">Email notifications are not configured in this environment.</p>
        </div>
      </div>
    </div>
  );
}
