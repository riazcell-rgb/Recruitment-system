
import React, { useState } from 'react';
import { Search, Filter, TrendingUp, Users, CheckCircle, Clock, MoreVertical, FileText, Target, Brain, ArrowUpRight, ChevronRight, X, Info, AlertTriangle, Check, ShieldCheck, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { INITIAL_CANDIDATES } from '../constants';
import { Candidate } from '../types';

const ManagerPanel: React.FC = () => {
  const [candidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const statsData = [
    { name: 'Mon', count: 12 },
    { name: 'Tue', count: 19 },
    { name: 'Wed', count: 15 },
    { name: 'Thu', count: 22 },
    { name: 'Fri', count: 30 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="text-blue-600"/>} label="Total Candidates" value="128" color="bg-blue-50" />
        <StatCard icon={<Clock className="text-amber-600"/>} label="Pending Reviews" value="14" color="bg-amber-50" />
        <StatCard icon={<CheckCircle className="text-emerald-600"/>} label="Hired" value="8" color="bg-emerald-50" />
        <StatCard icon={<Target className="text-indigo-600"/>} label="High Match Rate" value="32%" color="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Candidate Table */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-black text-slate-900 tracking-tight">AI MATCHING WORKSPACE</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Evaluating profile & interview performance</p>
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter pool..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <button className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-[0.15em]">
                  <th className="px-6 py-4">Candidate Profile</th>
                  <th className="px-6 py-4 text-center">Interview</th>
                  <th className="px-6 py-4 text-center">Match Score</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-slate-900/10">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{candidate.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">{candidate.role}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{candidate.profile?.experienceYears}y Exp</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center">
                        {candidate.score ? (
                          <div className="flex items-center gap-2">
                             <span className={`text-sm font-black ${candidate.score > 85 ? 'text-emerald-600' : 'text-slate-900'}`}>{candidate.score}</span>
                             <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${candidate.score > 85 ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                  style={{ width: `${candidate.score}%` }}
                                />
                             </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Pending</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center">
                        <div className={`px-3 py-1.5 rounded-xl font-black text-xs border-2 transition-all ${
                          candidate.matchScore && candidate.matchScore > 90 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                          : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                        }`}>
                          {candidate.matchScore}%
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Algorithm Rank</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => setSelectedCandidate(candidate)}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar Charts */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-6 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Recruitment Velocity
            </h3>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={20}>
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === statsData.length - 1 ? '#4f46e5' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prediction</p>
                  <p className="text-xs font-bold text-indigo-900">High hiring week expected</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </div>
          </section>

          <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-900/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700" />
            <h3 className="font-black text-lg tracking-tight mb-2">Automated Sync</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">Your n8n workflow is automatically pushing matched candidates to the Global Hiring Sheet.</p>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
              View External Dashboard
            </button>
          </section>
        </div>
      </div>

      {/* Candidate Analysis Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-xl shadow-indigo-600/20">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedCandidate.name}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedCandidate.role}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-10">
              {/* Top Level Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-50 p-6 rounded-[2rem] text-center border border-indigo-100/50">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Algorithm Match</span>
                  <span className="text-4xl font-black text-indigo-900 leading-none">{selectedCandidate.matchScore}%</span>
                </div>
                <div className="bg-emerald-50 p-6 rounded-[2rem] text-center border border-emerald-100/50">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2">Skill Alignment</span>
                  <span className="text-4xl font-black text-emerald-900 leading-none">{selectedCandidate.matchAnalysis?.skillAlignment}%</span>
                </div>
                <div className="bg-amber-50 p-6 rounded-[2rem] text-center border border-amber-100/50">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-2">Experience Fit</span>
                  <span className="text-4xl font-black text-amber-900 leading-none">{selectedCandidate.matchAnalysis?.experienceFit}%</span>
                </div>
              </div>

              {/* Requirement Checklist */}
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200/60">
                <h4 className="flex items-center gap-2 font-black text-slate-900 mb-6 text-xs tracking-widest uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Requirement Checklist Analysis
                </h4>
                <div className="space-y-4">
                  {selectedCandidate.matchAnalysis?.requirementAnalysis?.map((req, i) => (
                    <div key={i} className="flex items-start gap-4 group">
                      <div className={`mt-1 p-1 rounded-full ${
                        req.status === 'MET' ? 'bg-emerald-100 text-emerald-600' : 
                        req.status === 'PARTIAL' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {req.status === 'MET' ? <Check className="w-3 h-3 stroke-[3]" /> : 
                         req.status === 'PARTIAL' ? <Zap className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-none mb-1">{req.requirement}</p>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{req.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specific Skill Alignment Scores */}
              <div>
                <h4 className="flex items-center gap-2 font-black text-slate-900 mb-6 text-xs tracking-widest uppercase">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  Specific Skill Alignment Scores
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                  {selectedCandidate.matchAnalysis?.skillMatches?.map((skill, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-slate-700">{skill.skill}</span>
                        <span className="text-xs font-black text-indigo-600">{skill.score}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                          style={{ width: `${skill.score}%` }}
                        />
                      </div>
                      {skill.gap && (
                        <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          {skill.gap}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <h4 className="flex items-center gap-2 font-black text-white mb-4 text-xs tracking-widest uppercase">
                  <Brain className="w-4 h-4" />
                  AI Synthesis & Match Reasoning
                </h4>
                <p className="text-lg font-medium leading-relaxed italic opacity-95">
                  "{selectedCandidate.matchAnalysis?.reasoning}"
                </p>
              </div>

              {/* Profile Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                <div>
                  <h4 className="font-black text-slate-900 mb-4 text-[10px] tracking-[0.2em] uppercase">Core Skills Map</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.profile?.skills.map(skill => (
                      <span key={skill} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 mb-4 text-[10px] tracking-[0.2em] uppercase">Resume Summary</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {selectedCandidate.profile?.resumeSummary}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Data points verified via Gemini Evaluation Engine
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="flex-1 sm:flex-none px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Close
                </button>
                <button className="flex-1 sm:flex-none px-10 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
                  Request Full Technical Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow cursor-default">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform hover:scale-110 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">{value}</p>
    </div>
  </div>
);

export default ManagerPanel;
