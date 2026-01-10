
import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Briefcase, GraduationCap, Calendar, 
  Target, BarChart3, Star, Clock, ArrowUpRight, Search, 
  FileText, CheckCircle2, AlertCircle, Info 
} from 'lucide-react';
import { Candidate } from '../types';
import { INITIAL_CANDIDATES } from '../constants';

const CANDIDATE_DB_KEY = 'hirestream_candidates_db';

const ReportingSystem: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [menu, setMenu] = useState<'talent' | 'outcomes'>('talent');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(CANDIDATE_DB_KEY);
    if (saved) {
      try {
        setCandidates(JSON.parse(saved));
      } catch (e) {
        setCandidates(INITIAL_CANDIDATES);
      }
    } else {
      setCandidates(INITIAL_CANDIDATES);
    }
  }, []);

  const filteredCandidates = candidates.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ScoreBadge = ({ score }: { score?: number }) => {
    if (score === undefined || score === null) return <span className="text-slate-300 font-bold">--</span>;
    const color = score >= 85 ? 'text-emerald-500' : score >= 70 ? 'text-indigo-500' : 'text-amber-500';
    return (
      <div className="flex items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-slate-100 flex items-center justify-center">
          <span className={`text-[10px] font-black ${color}`}>{score}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
          <button 
            onClick={() => setMenu('talent')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${menu === 'talent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Talent Profiles
          </button>
          <button 
            onClick={() => setMenu('outcomes')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${menu === 'outcomes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Lifecycle Analytics
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Filter candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {menu === 'talent' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-6">Identity</th>
                  <th className="px-8 py-6">Applied Post</th>
                  <th className="px-8 py-6">Education</th>
                  <th className="px-8 py-6">Core Skills</th>
                  <th className="px-8 py-6 text-center">Exp.</th>
                  <th className="px-8 py-6 text-right">Applied On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">{c.name ? c.name.charAt(0) : '?'}</div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{c.name || 'Anonymous'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-bold text-slate-700">{c.role}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-600">{c.profile?.education || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {c.profile?.skills?.slice(0, 3).map(skill => (
                          <span key={skill} className="px-2 py-0.5 bg-slate-100 text-[8px] font-black text-slate-500 rounded-md uppercase tracking-wider">{skill}</span>
                        ))}
                        {(c.profile?.skills?.length || 0) > 3 && <span className="text-[8px] text-slate-300 font-black">+{c.profile!.skills.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-xs font-black text-slate-900">{c.profile?.experienceYears || 0}y</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400 font-bold text-[10px] uppercase">
                        <Calendar className="w-3.5 h-3.5" />
                        {c.interviewDate}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-6">Candidate</th>
                  <th className="px-8 py-6">Lifecycle Status</th>
                  <th className="px-8 py-6 text-center">AI Score</th>
                  <th className="px-8 py-6 text-center">Match Fit</th>
                  <th className="px-8 py-6">Manager Assessment</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div>
                        <p className="font-black text-slate-900 text-sm">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{c.role}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        c.status === 'SHORTLISTED' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        c.status === 'COMPLETED' ? 'bg-indigo-100 text-indigo-700' :
                        c.status === 'INTERVIEWING' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <ScoreBadge score={c.score} />
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Target className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-xs font-black text-slate-900">{c.matchScore ? `${c.matchScore}%` : '--'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {c.managerAssessment ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Recommended</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300 italic">
                          <Clock className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Awaiting Review</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {filteredCandidates.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Info className="w-12 h-12 text-slate-100 mb-4" />
            <h4 className="font-black text-slate-300 uppercase tracking-[0.2em]">No Matches Found</h4>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportingSystem;
