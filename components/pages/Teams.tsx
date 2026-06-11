"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

export default function Teams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('manage_users');
  const { confirm, confirmProps } = useConfirm();

  useEffect(() => {
    fetchTeams();
    if (isAdmin) {
      api.get('/people').then(res => setUsers(res.data));
    }
  }, [isAdmin]);

  const fetchTeams = () => {
    api.get('/teams').then(res => setTeams(res.data));
  };

  const handleCreateTeam = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    await api.post('/teams', data);
    fetchTeams();
    e.target.reset();
  };

  const handleAddMember = async (teamId: string, e: any) => {
    e.preventDefault();
    const userId = e.target.userId.value;
    const isLead = e.target.isLead.checked;
    if (!userId) return;
    
    await api.post(`/teams/${teamId}/members`, { userId, isLead });
    fetchTeams();
    e.target.reset();
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    const ok = await confirm({
      title: 'Remove Team Member',
      message: 'This person will be removed from the team. Their tasks will remain assigned.',
      confirmLabel: 'Remove',
      variant: 'warning'
    });
    if (ok) {
      await api.delete(`/teams/${teamId}/members/${userId}`);
      fetchTeams();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Teams</h1>
      </div>

      {isAdmin && (
        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Team</h2>
          <form onSubmit={handleCreateTeam} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium">Team Name</label>
              <input type="text" name="name" required placeholder="e.g. Video Editors" className="w-full p-2 bg-background border border-border rounded text-sm" />
            </div>
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium">Team Type</label>
              <select name="type" required className="w-full p-2 bg-background border border-border rounded text-sm">
                <option value="Official">Official</option>
                <option value="Local">Local</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 h-[38px]">
              Create Team
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-surface border border-border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{team.name}</h3>
                <div className="text-sm text-textMuted">{team.type} Team</div>
              </div>
              <div className="bg-background px-2 py-1 rounded text-xs font-medium border border-border">
                {team.memberCount} members
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-textMuted mb-1">Team Lead</div>
                <div className="text-sm font-medium">{team.lead?.name || 'No Lead'}</div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-textMuted">Workload</span>
                  <span className={team.workloadPercentage > 80 ? 'text-red-500 font-bold' : 'font-medium'}>
                    {team.workloadPercentage}%
                  </span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                  <div 
                    className={`h-full ${team.workloadPercentage > 80 ? 'bg-red-500' : 'bg-primary'}`} 
                    style={{ width: `${team.workloadPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border">
                <div>
                  <div className="text-xl font-bold text-primary">{team.activeTasks}</div>
                  <div className="text-xs text-textMuted">Active Tasks</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-500">{team.completedTasks}</div>
                  <div className="text-xs text-textMuted">Completed</div>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="text-xs font-bold text-textMuted uppercase">Manage Members</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {team.members?.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center text-sm bg-background p-1.5 rounded border border-border">
                        <span className="truncate flex-1">{m.user.name} {m.isLead && <span className="text-xs text-primary ml-1">(Lead)</span>}</span>
                        <button onClick={() => handleRemoveMember(team.id, m.user.id)} className="text-red-500 hover:underline text-xs ml-2 shrink-0">Remove</button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleAddMember(team.id, e)} className="flex gap-2 items-center mt-2">
                    <select name="userId" className="flex-1 p-1.5 bg-background border border-border rounded text-xs">
                      <option value="">Add user...</option>
                      {users.filter(u => !team.members?.find((m: any) => m.user.id === u.id)).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs shrink-0">
                      <input type="checkbox" name="isLead" className="rounded border-border" /> Lead
                    </label>
                    <button type="submit" className="px-2 py-1.5 bg-primary text-white rounded text-xs hover:bg-primary/90 shrink-0">Add</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}




