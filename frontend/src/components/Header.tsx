import { Search, Bell, Sun, Moon, Plus, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateTaskModal from './CreateTaskModal';
import CommandPalette from './CommandPalette';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout, hasPermission } = useAuth();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);
  
  // Apply saved theme on mount
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    if (currentUser) {
      api.get(`/notifications?userId=${currentUser.id}`).then(res => setNotifications(res.data));
    }
  }, [currentUser]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const delayFn = setTimeout(() => {
        api.get(`/search?q=${searchQuery}`).then(res => {
          setSearchResults(res.data);
          setShowSearch(true);
        });
      }, 300);
      return () => clearTimeout(delayFn);
    } else {
      setShowSearch(false);
      setSearchResults(null);
    }
  }, [searchQuery]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    await api.post(`/notifications/${id}/read`);
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  return (
    <>
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 relative z-40">
        <div className="flex items-center flex-1">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
            <button type="button" onClick={() => setPaletteOpen(true)}
              className="w-full flex items-center pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm text-textMuted hover:border-primary/50 hover:bg-background transition-colors text-left">
              Search tasks, pages…
              <span className="ml-auto flex items-center gap-1 text-[10px]">
                <kbd className="bg-surface border border-border rounded px-1.5 py-0.5">Ctrl</kbd>
                <kbd className="bg-surface border border-border rounded px-1.5 py-0.5">K</kbd>
              </span>
            </button>
            
            {/* Search Dropdown */}
            {showSearch && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-md shadow-lg overflow-hidden max-h-96 overflow-y-auto">
                {searchResults.tasks?.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-bold text-textMuted uppercase mb-1 px-2">Tasks</div>
                    {searchResults.tasks.map((t: any) => (
                      <button key={t.id} onClick={() => { navigate(`/task/${t.id}`); setShowSearch(false); }} className="w-full text-left px-2 py-1.5 hover:bg-background rounded text-sm flex justify-between">
                        <span className="truncate">{t.title}</span>
                        <span className="text-textMuted text-xs shrink-0">{t.key}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.people?.length > 0 && (
                  <div className="p-2 border-t border-border">
                    <div className="text-xs font-bold text-textMuted uppercase mb-1 px-2">People</div>
                    {searchResults.people.map((p: any) => (
                      <button key={p.id} onClick={() => { navigate(`/people`); setShowSearch(false); }} className="w-full text-left px-2 py-1.5 hover:bg-background rounded text-sm">
                        {p.name} <span className="text-textMuted text-xs ml-2">{p.jobTitle}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.teams?.length > 0 && (
                  <div className="p-2 border-t border-border">
                    <div className="text-xs font-bold text-textMuted uppercase mb-1 px-2">Teams</div>
                    {searchResults.teams.map((t: any) => (
                      <button key={t.id} onClick={() => { navigate(`/teams`); setShowSearch(false); }} className="w-full text-left px-2 py-1.5 hover:bg-background rounded text-sm">
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
                {!searchResults.tasks?.length && !searchResults.people?.length && !searchResults.teams?.length && (
                  <div className="p-4 text-center text-sm text-textMuted">No results found.</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 text-textMuted hover:text-text rounded-full hover:bg-background"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-textMuted hover:text-text rounded-full hover:bg-background relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-surface"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-surface border border-border rounded-md shadow-lg overflow-hidden flex flex-col max-h-96">
                <div className="p-3 border-b border-border font-bold flex justify-between items-center">
                  Notifications
                  {unreadCount > 0 && (
                    <button className="text-xs font-normal text-primary hover:underline" onClick={async () => {
                      if (!currentUser) return;
                      await api.post('/notifications/read-all', { userId: currentUser.id });
                      setNotifications(n => n.map(x => ({ ...x, isRead: true })));
                    }}>Mark all read</button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-textMuted">No notifications</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-3 text-sm flex gap-3 hover:bg-background transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}>
                          <div className="flex-1">
                            <div className="font-medium mb-0.5">{n.title}</div>
                            <div className="text-textMuted text-xs mb-1">{n.content}</div>
                            <div className="text-[10px] text-textMuted">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                          {!n.isRead && (
                            <button onClick={() => markAsRead(n.id)} className="text-primary hover:text-primary/80 shrink-0" title="Mark as read">
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {hasPermission('create_task') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm hover:ring-2 hover:ring-primary/50 transition-all"
              title={currentUser?.name}
            >
              {currentUser?.name?.charAt(0) || '?'}
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-surface border border-border rounded-md shadow-lg overflow-hidden flex flex-col max-h-96">
                <div className="p-3 border-b border-border bg-background">
                  <div className="font-bold">{currentUser?.name}</div>
                  <div className="text-xs text-textMuted">{currentUser?.role} - {currentUser?.jobTitle}</div>
                </div>
                <div className="p-2">
                  <button 
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                      navigate('/login');
                    }}
                    className="w-full text-left px-3 py-2 rounded text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={(task) => {
          navigate(`/task/${task.id}`);
        }}
      />
      
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Click outside search handler */}
      {showSearch && (
        <div className="fixed inset-0 z-30" onClick={() => setShowSearch(false)}></div>
      )}
      {/* Click outside notifications handler */}
      {showNotifications && (
        <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)}></div>
      )}
      {/* Click outside user menu handler */}
      {showUserMenu && (
        <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)}></div>
      )}
    </>
  );
}
