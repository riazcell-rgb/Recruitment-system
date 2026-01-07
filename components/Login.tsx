
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Mail, Lock, Loader2, ShieldCheck, UserCircle, Briefcase, ChevronRight, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulated authentication logic
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Demo credentials
    const credentials: Record<string, { pass: string; user: User }> = {
      'admin@hirestream.ai': {
        pass: 'admin123',
        user: { id: 'admin-1', email: 'admin@hirestream.ai', name: 'System Admin', role: UserRole.ADMIN }
      },
      'manager@hirestream.ai': {
        pass: 'manager123',
        user: { id: 'mgr-1', email: 'manager@hirestream.ai', name: 'Sarah Manager', role: UserRole.MANAGER }
      },
      'candidate@example.com': {
        pass: 'pass123',
        user: { id: 'cand-1', email: 'candidate@example.com', name: 'Alex Candidate', role: UserRole.CANDIDATE }
      }
    };

    const record = credentials[email.toLowerCase()];
    if (record && record.pass === password) {
      onLogin(record.user);
    } else {
      setError('Invalid email or password. Try: admin@hirestream.ai / admin123');
      setIsLoading(false);
    }
  };

  const quickSelect = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">HireStream AI</h1>
          <p className="text-slate-500 mt-2 font-medium">Log in to your recruiting workspace</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm animate-in shake duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Work Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hirestream.ai"
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:grayscale"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="uppercase tracking-widest text-xs">Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="uppercase tracking-widest text-xs">Sign In</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Demo Accounts</p>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => quickSelect('admin@hirestream.ai', 'admin123')} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-none">Admin Portal</p>
                  <p className="text-[10px] text-slate-400 mt-1">Full system control</p>
                </div>
              </button>

              <button onClick={() => quickSelect('manager@hirestream.ai', 'manager123')} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-none">Manager Dashboard</p>
                  <p className="text-[10px] text-slate-400 mt-1">Review candidates</p>
                </div>
              </button>

              <button onClick={() => quickSelect('candidate@example.com', 'pass123')} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                  <UserCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-none">Candidate Interface</p>
                  <p className="text-[10px] text-slate-400 mt-1">Take your interview</p>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em]">
          HireStream AI &copy; 2024 Intelligent Recruiting
        </p>
      </div>
    </div>
  );
};

export default Login;
