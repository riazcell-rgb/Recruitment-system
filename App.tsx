
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import AdminPanel from './components/AdminPanel';
import ManagerPanel from './components/ManagerPanel';
import CandidatePanel from './components/CandidatePanel';
import Login from './components/Login';
import { Users, Shield, Briefcase, LogOut, User as UserIcon } from 'lucide-react';

const AUTH_KEY = 'hirestream_auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_KEY);
    if (savedAuth) {
      try {
        setUser(JSON.parse(savedAuth));
      } catch (e) {
        console.error("Failed to restore auth", e);
      }
    }
    setIsInitializing(false);
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    // Optional: Clear interview state if candidate logs out
    localStorage.removeItem('hirestream_interview_state');
  };

  if (isInitializing) return null;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <div className="w-5 h-5 bg-white rounded-md rotate-45" />
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 tracking-tight">HireStream</span>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest -mt-1">AI Agent</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="hidden md:flex flex-col items-right text-right">
                <span className="text-sm font-black text-slate-900">{user.name}</span>
                <div className="flex items-center justify-end gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    user.role === UserRole.ADMIN ? 'bg-indigo-500' : 
                    user.role === UserRole.MANAGER ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {user.role} ACCESS
                  </span>
                </div>
              </div>
              
              <div className="h-8 w-px bg-slate-200 hidden md:block" />

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all border border-slate-100 font-bold text-xs uppercase tracking-widest"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        {user.role === UserRole.ADMIN && <AdminPanel />}
        {user.role === UserRole.MANAGER && <ManagerPanel />}
        {user.role === UserRole.CANDIDATE && <CandidatePanel user={user} />}
      </main>
    </div>
  );
};

export default App;
