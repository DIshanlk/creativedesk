import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123'); // Default for demo
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, users } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-2xl mb-4">
            CD
          </div>
          <h1 className="text-2xl font-bold">Welcome to CreativeDesk</h1>
          <p className="text-textMuted text-sm mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-2.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="admin@creativedesk.local"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-2.5 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="text-xs text-textMuted font-bold uppercase mb-3">Demo Accounts (Password: password123)</div>
          <div className="grid grid-cols-2 gap-2">
            {users?.slice(0, 4).map((u: any) => (
              <button 
                key={u.id}
                onClick={() => setEmail(u.email)}
                className="text-left text-xs p-2 rounded border border-border hover:bg-background hover:border-primary transition-colors"
              >
                <div className="font-medium text-text">{u.role}</div>
                <div className="text-textMuted truncate">{u.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
