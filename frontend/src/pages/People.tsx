import { useEffect, useState } from 'react';
import api from '../api';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Edit2 } from 'lucide-react';

export default function People() {
  const [people, setPeople] = useState<any[]>([]);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterAvail, setFilterAvail] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('manage_users');

  useEffect(() => { fetchPeople(); }, []);

  const fetchPeople = () => { api.get('/people').then(res => setPeople(res.data)); };

  const getAvailabilityColor = (s: string) => {
    switch (s) {
      case 'Available': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Busy': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Overloaded': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'On Leave': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const allTeams = [...new Set(people.flatMap(p => p.teamMembers?.map((m: any) => m.team?.name) || []))].filter(Boolean);

  const filtered = people.filter(p => {
    if (filterAvail && p.availability !== filterAvail) return false;
    if (filterRole && p.role !== filterRole) return false;
    if (filterTeam && !p.teamMembers?.some((m: any) => m.team?.name === filterTeam)) return false;
    return true;
  });

  const handleSave = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    try {
      if (editUser) {
        await api.patch(`/people/${editUser.id}`, data);
      } else {
        await api.post('/people', data);
      }
      fetchPeople();
      setShowModal(false);
      setEditUser(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold">People</h1>
        <div className="flex gap-2 flex-wrap">
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="p-2 text-sm bg-surface border border-border rounded focus:ring-1 focus:ring-primary outline-none">
            <option value="">All Roles</option>
            {['Admin','Manager','Designer','Viewer'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterAvail} onChange={e => setFilterAvail(e.target.value)} className="p-2 text-sm bg-surface border border-border rounded focus:ring-1 focus:ring-primary outline-none">
            <option value="">All Availability</option>
            {['Available','Busy','Overloaded','On Leave'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="p-2 text-sm bg-surface border border-border rounded focus:ring-1 focus:ring-primary outline-none">
            <option value="">All Teams</option>
            {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {isAdmin && (
            <button onClick={() => { setEditUser(null); setShowModal(true); }} className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Invite User
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map(person => (
          <div key={person.id} className="bg-surface border border-border rounded-lg p-5 flex flex-col items-center text-center relative group">
            {isAdmin && (
              <button
                onClick={() => { setEditUser(person); setShowModal(true); }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-textMuted hover:text-primary"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold mb-3">
              {person.name.charAt(0)}
            </div>
            <h3 className="text-lg font-bold leading-tight">{person.name}</h3>
            <div className="text-sm text-textMuted mb-3">{person.jobTitle || person.role}</div>
            <span className={clsx('px-3 py-1 rounded-full text-xs font-medium mb-4', getAvailabilityColor(person.availability))}>
              {person.availability}
            </span>
            <div className="w-full space-y-2 text-left text-sm pt-4 border-t border-border">
              <div className="flex justify-between">
                <span className="text-textMuted">Role</span>
                <span className="font-medium">{person.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Department</span>
                <span className="font-medium">{person.department || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Active Tasks</span>
                <span className={clsx('font-bold', person.activeTasksCount > 8 ? 'text-red-500' : 'text-text')}>
                  {person.activeTasksCount}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-textMuted">Workload</span>
                  <span className={person.workloadPercentage > 100 ? 'text-red-500 font-bold' : 'font-medium'}>
                    {person.workloadPercentage}%
                  </span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden border border-border">
                  <div className={clsx('h-full', person.workloadPercentage > 80 ? 'bg-red-500' : 'bg-primary')} style={{ width: `${Math.min(person.workloadPercentage,100)}%` }}></div>
                </div>
              </div>
              {person.teamMembers?.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-textMuted">Team</span>
                  <span className="font-medium text-xs text-right">{person.teamMembers.map((m: any) => m.team?.name).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-10 text-center text-textMuted bg-surface border border-border rounded-lg">No people match the selected filters.</div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface w-full max-w-md rounded-lg shadow-xl border border-border">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h2 className="text-lg font-bold">{editUser ? 'Edit User' : 'Invite New User'}</h2>
              <button onClick={() => { setShowModal(false); setEditUser(null); }} className="text-textMuted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Full Name *</label>
                  <input name="name" required defaultValue={editUser?.name} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Email *</label>
                  <input name="email" type="email" required defaultValue={editUser?.email} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Role *</label>
                  <select name="role" required defaultValue={editUser?.role || 'Designer'} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                    {['Admin','Manager','Designer','Viewer'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Availability</label>
                  <select name="availability" defaultValue={editUser?.availability || 'Available'} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
                    {['Available','Busy','On Leave'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Job Title</label>
                  <input name="jobTitle" defaultValue={editUser?.jobTitle} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Department</label>
                  <input name="department" defaultValue={editUser?.department} className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                {!editUser && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="block text-sm font-medium">Password</label>
                    <input name="password" type="password" defaultValue="password123" className="w-full p-2 bg-background border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                    <p className="text-xs text-textMuted">Default: password123</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => { setShowModal(false); setEditUser(null); }} className="px-4 py-2 text-sm border border-border rounded hover:bg-background">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90">{editUser ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
