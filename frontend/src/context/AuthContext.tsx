import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all users for reference (like assignees, reporters)
    api.get('/people').then(res => setUsers(res.data)).catch(() => {});

    // Check for existing session
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => setCurrentUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string = 'password123') => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setCurrentUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const hasPermission = (action: string) => {
    if (!currentUser) return false;
    
    // Admins can do everything
    if (currentUser.role === 'Admin') return true;
    
    switch (action) {
      case 'create_space': 
        return false; // Only Admin
      case 'manage_users': 
        return false; // Only Admin
      case 'create_task': 
        return ['Manager', 'Designer'].includes(currentUser.role);
      case 'edit_task': 
        return ['Manager', 'Designer'].includes(currentUser.role);
      case 'approve_task': 
        return currentUser.role === 'Manager';
      default: 
        return false;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, hasPermission, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
