
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import AdminPanel from './components/AdminPanel';
import ManagerPanel from './components/ManagerPanel';
import CandidatePanel from './components/CandidatePanel';
import BoardMemberPanel from './components/BoardMemberPanel';
import Login from './components/Login';
import { LogOut, AlertTriangle, ShieldAlert } from 'lucide-react';

const AUTH_KEY = 'hirestream_auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_KEY);
    if (savedAuth) {
      try {
        const parsedUser = JSON.parse(savedAuth);
        // Basic validation of stored role
        if (Object.values(UserRole).includes(parsedUser.role)) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem(AUTH_KEY);
        }
      } catch (e) {
        console.error("Failed to restore auth session", e);
        localStorage.removeItem(AUTH_KEY);
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
    localStorage.removeItem('hirestream_interview_state');
  };

  if (isInitializing) return null;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Refined Role-Based Access Control Dispatcher
  const renderDashboard = () => {
    switch (user.role) {
      case UserRole.ADMIN:
        // Only ADMINs can access the master template and system logs
        return <AdminPanel />;
      case UserRole.MANAGER:
        // Only MANAGERs can access the pipeline, scheduling, and evaluation tools
        return <ManagerPanel />;
      case UserRole.CANDIDATE:
        // Candidates are strictly limited to their application portal and the AI interview agent
        return <CandidatePanel user={user} />;
      case UserRole.BOARD_MEMBER:
        // Board members can only access high-level insights and live session observation
        return <BoardMemberPanel />;
      default:
        // Fail-safe for unauthorized or corrupted role states
        return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[4rem] border border-red-100 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-red-500 mb-8 shadow-inner">
              <ShieldAlert className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Access Denied</h2>
            <p className="text-slate-500 font-medium max-w-sm mx-auto mt-4 leading-relaxed">
              Your current account role (<span className="text-red-600 font-black">{user.role}</span>) is not authorized to view any dashboard. Please contact your system administrator.
            </p>
            <button 
              onClick={handleLogout}
              className="mt-10 px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-2xl active:scale-95"
            >
              Secure Sign Out
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-600/20 group">
                <div className="w-5 h-5 bg-white rounded-md rotate-45 group-hover:rotate-90 transition-transform duration-500" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-black text-slate-900 tracking-tighter block leading-none">HireStream</span>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Intelligence Layer</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 md:space-x-8">
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-black text-slate-900">{user.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    user.role === UserRole.ADMIN ? 'bg-indigo-500 animate-pulse' : 
                    user.role === UserRole.MANAGER ? 'bg-emerald-500' : 
                    user.role === UserRole.CANDIDATE ? 'bg-blue-500' : 'bg-indigo-600'
                  }`} />
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                    user.role === UserRole.ADMIN ? 'text-indigo-600' : 
                    user.role === UserRole.MANAGER ? 'text-emerald-600' : 
                    user.role === UserRole.CANDIDATE ? 'text-blue-600' : 'text-indigo-600'
                  }`}>
                    {user.role} WORKSPACE
                  </span>
                </div>
              </div>
              
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all border border-slate-100 font-black text-[10px] uppercase tracking-widest group"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full animate-in fade-in duration-700">
        {renderDashboard()}
      </main>
      
      <footer className="py-8 px-4 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">© 2024 HireStream AI Systems. Secure Session Active.</p>
           <div className="flex gap-6">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> API Connection Native</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Privacy Protocol v4.2</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
