import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, List, KanbanSquare, Calendar, Clock,
  CheckSquare, FileText, File, Paperclip, BarChart2, Archive,
  Users, UsersRound, Settings, Shield, Scale
} from 'lucide-react';
import clsx from 'clsx';
import { useSpace } from '../context/SpaceContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { spaces, selectedSpaceId, setSelectedSpaceId } = useSpace();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const isSupervisor = ['Admin', 'Manager', 'SuperAdmin'].includes(currentUser?.role || '');

  // Designer-focused section (personal work views)
  const personalNav = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'My Work', path: '/my-work', icon: Briefcase },
  ];

  // Project/task views
  const projectNav = [
    { name: 'List', path: '/list', icon: List },
    { name: 'Board', path: '/board', icon: KanbanSquare },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Timeline', path: '/timeline', icon: Clock },
    { name: 'Approvals', path: '/approvals', icon: CheckSquare },
  ];

  // Management / reference
  const manageNav = [
    { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Workload', path: '/workload', icon: Scale },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'People', path: '/people', icon: UsersRound },
  ];

  // Resources
  const resourceNav = [
    { name: 'Attachments', path: '/attachments', icon: Paperclip },
    { name: 'Forms', path: '/forms', icon: FileText },
    { name: 'Docs', path: '/docs', icon: File },
    { name: 'Archived', path: '/archived', icon: Archive },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const NavItem = ({ name, path, icon: Icon }: { name: string; path: string; icon: any }) => (
    <li>
      <NavLink
        to={path}
        end={path === '/'}
        className={({ isActive }) =>
          clsx(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isActive ? 'bg-primary/10 text-primary' : 'text-textMuted hover:bg-background hover:text-text'
          )
        }
      >
        <Icon className="w-4 h-4 shrink-0" />
        {name}
      </NavLink>
    </li>
  );

  const Section = ({ label, items }: { label: string; items: typeof personalNav }) => (
    <div className="mb-4">
      <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-textMuted">{label}</div>
      <ul className="space-y-0.5">
        {items.map(item => <NavItem key={item.path} {...item} />)}
      </ul>
    </div>
  );

  return (
    <aside className="w-60 bg-surface border-r border-border flex flex-col">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <div className="font-bold text-xl text-primary flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm font-bold">CD</div>
          CreativeDesk
        </div>
      </div>

      {/* Space / Project selector */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1.5">Space / Project</div>
        <select
          value={selectedSpaceId || ''}
          onChange={e => setSelectedSpaceId(e.target.value || null)}
          className="w-full p-2 bg-background border border-border rounded text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Spaces</option>
          {spaces.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}{s.team ? ` · ${s.team.name}` : ''}</option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <Section label="Personal" items={personalNav} />
        <Section label="Project Views" items={projectNav} />
        {isSupervisor && <Section label="Management" items={manageNav} />}
        {!isSupervisor && <Section label="Reports" items={[{ name: 'Reports', path: '/reports', icon: BarChart2 }]} />}
        <Section label="Resources" items={resourceNav} />
      </nav>

      {/* SuperAdmin shortcut */}
      {isSuperAdmin && (
        <div className="px-3 pb-2">
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-2.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Shield className="w-4 h-4 shrink-0" />
            Admin Panel
          </button>
        </div>
      )}

      {/* Current user footer */}
      {currentUser && (
        <div className="border-t border-border p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {currentUser.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{currentUser.name}</div>
            <div className={clsx('text-xs truncate', isSuperAdmin ? 'text-red-500 font-medium' : 'text-textMuted')}>{currentUser.role}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
