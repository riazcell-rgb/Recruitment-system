
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Mail, Lock, Loader2, ShieldCheck, UserCircle, Briefcase, ChevronRight, AlertCircle, Award, Users, Cpu } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Simulate network latency for a professional feel
    await new Promise(resolve => setTimeout(resolve, 800));

    // Hardened credential mapping for the demo environment
    const credentials: Record<string, { pass: string; user: User }> = {
      'admin@hirestream.ai': {
        pass: 'admin123',
        user: { id: 'sys-admin', email: 'admin@hirestream.ai', name: 'Jordan Admin', role: UserRole.ADMIN }
      },
      'manager@hirestream.ai': {
        pass: 'manager123',
        user: { id: 'mgr-beta', email: 'manager@hirestream.ai', name: 'Sarah Hiring Manager', role: UserRole.MANAGER }
      },
      'board@hirestream.ai': {
        pass: 'board123',
        user: { id: 'board-01', email: 'board@hirestream.ai', name: 'Marcus Board Member', role: UserRole.BOARD_MEMBER }
      },
      'candidate@example.com': {
        pass: 'pass123',
        user: { id: 'cand-user', email: 'candidate@example.com', name: 'Alex Candidate', role: UserRole.CANDIDATE }
      }
    };

    const record = credentials[email.toLowerCase()];
    if (record && record.pass === password) {
      onLogin(record.user);
    } else {
      setError('The credentials provided do not match our records or you lack authorization for this portal.');
      setIsLoading(false);
    }
  };

  const quickSelect = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[120px] opacity-50" />

      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[2rem] shadow-2xl shadow-indigo-600/30 mb-6 transition-transform hover:scale-105">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">HireStream AI</h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">Intelligent Role-Based Recruitment Access</p>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/40">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs font-bold animate-in shake duration-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hirestream.ai"
                  required
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-3 group"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs">Authorize Access</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">Development Portal Selector</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RoleSelectButton 
                onClick={() => quickSelect('admin@hirestream.ai', 'admin123')}
                icon={ShieldCheck} 
                label="Admin" 
                desc="System Config"
                color="bg-slate-900"
              />
              <RoleSelectButton 
                onClick={() => quickSelect('manager@hirestream.ai', 'manager123')}
                icon={Briefcase} 
                label="Manager" 
                desc="Hiring Desk"
                color="bg-emerald-600"
              />
              <RoleSelectButton 
                onClick={() => quickSelect('board@hirestream.ai', 'board123')}
                icon={Award} 
                label="Board" 
                desc="Oversight"
                color="bg-indigo-600"
              />
              <RoleSelectButton 
                onClick={() => quickSelect('candidate@example.com', 'pass123')}
                icon={UserCircle} 
                label="Candidate" 
                desc="Interview Bot"
                color="bg-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoleSelectButton: React.FC<{ onClick: () => void; icon: any; label: string; desc: string; color: string }> = ({ onClick, icon: Icon, label, desc, color }) => (
  <button 
    onClick={onClick} 
    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all text-left border border-transparent hover:border-slate-200 group"
  >
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}><Icon className="w-5 h-5" /></div>
    <div>
      <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight block leading-none mb-1">{label}</span>
      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{desc}</span>
    </div>
  </button>
);

export default Login;
