
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, TrendingUp, Users, CheckCircle, Clock, ArrowUpRight, X, Brain, Send, Star, FileCheck, ThumbsUp, ThumbsDown, MessageSquare, Target, ChevronRight, ShieldCheck, Radio, Cpu, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { INITIAL_CANDIDATES } from '../constants';
import { Candidate, ManagerAssessment } from '../types';

const CANDIDATE_DB_KEY = 'hirestream_candidates_db';

type SortConfig = {
  key: keyof Candidate;
  direction: 'asc' | 'desc';
} | null;

const ManagerPanel: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepMessage, setPrepMessage] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [assessment, setAssessment] = useState<Partial<ManagerAssessment>>({
    score: 80,
    comments: '',
    recommendation: 'HIRE'
  });
  const [gradingErrors, setGradingErrors] = useState<{ comments?: string; score?: string }>({});

  useEffect(() => {
    const saved = localStorage.getItem(CANDIDATE_DB_KEY);
    if (saved) {
      setCandidates(JSON.parse(saved));
    } else {
      setCandidates(INITIAL_CANDIDATES);
      localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(INITIAL_CANDIDATES));
    }
  }, []);

  const handleSort = (key: keyof Candidate) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedCandidates = useMemo(() => {
    let sortableCandidates = [...candidates];
    if (sortConfig !== null) {
      sortableCandidates.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Handle undefined/null values
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableCandidates;
  }, [candidates, sortConfig]);

  const updateCandidate = (updated: Candidate) => {
    const newList = candidates.map(c => c.id === updated.id ? updated : c);
    setCandidates(newList);
    localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(newList));
    setSelectedCandidate(updated);
  };

  const initiateInterview = () => {
    if (!selectedCandidate) return;
    const updated = {
      ...selectedCandidate,
      status: 'INTERVIEWING' as const,
      preparationMessage: prepMessage
    };
    updateCandidate(updated);
    setIsPreparing(false);
    setPrepMessage('');
  };

  const submitGrading = () => {
    if (!selectedCandidate) return;
    
    // Validation
    const errors: { comments?: string; score?: string } = {};
    if (!assessment.comments?.trim()) {
      errors.comments = 'Feedback comments are required for final assessment.';
    }
    if (assessment.score === undefined || assessment.score < 0 || assessment.score > 100) {
      errors.score = 'Score must be between 0 and 100.';
    }

    if (Object.keys(errors).length > 0) {
      setGradingErrors(errors);
      return;
    }

    const updated = {
      ...selectedCandidate,
      status: (assessment.recommendation === 'HIRE' ? 'SHORTLISTED' : assessment.recommendation === 'REJECT' ? 'REJECTED' : 'COMPLETED') as any,
      managerAssessment: assessment as ManagerAssessment
    };
    updateCandidate(updated);
    setIsGrading(false);
    setGradingErrors({});
  };

  const statsData = [
    { name: 'Mon', count: 12 },
    { name: 'Tue', count: 19 },
    { name: 'Wed', count: 15 },
    { name: 'Thu', count: 22 },
    { name: 'Fri', count: 30 },
  ];

  const SortIcon = ({ column }: { column: keyof Candidate }) => {
    if (!sortConfig || sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-3 h-3 ml-1 text-indigo-600" /> : 
      <ArrowDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="text-blue-600"/>} label="Total Pipeline" value={candidates.length.toString()} color="bg-blue-50" />
        <StatCard icon={<Clock className="text-amber-600"/>} label="Live Interviews" value={candidates.filter(c => c.status === 'INTERVIEWING').length.toString()} color="bg-amber-50" />
        <StatCard icon={<CheckCircle className="text-emerald-600"/>} label="Ready for Review" value={candidates.filter(c => c.status === 'COMPLETED').length.toString()} color="bg-emerald-50" />
        <StatCard icon={<Target className="text-indigo-600"/>} label="Conversion Rate" value="28%" color="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-900 tracking-tight uppercase">Talent Control Center</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage Candidate Life Cycle</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-[0.15em]">
                  <th 
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 transition-colors group"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Participant
                      <SortIcon column="name" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100/50 transition-colors group"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100/50 transition-colors group"
                    onClick={() => handleSort('score')}
                  >
                    <div className="flex items-center justify-center">
                      AI Rating
                      <SortIcon column="score" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{candidate.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{candidate.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          candidate.status === 'INTERVIEWING' ? 'bg-amber-100 text-amber-700' :
                          candidate.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          candidate.status === 'SHORTLISTED' ? 'bg-indigo-100 text-indigo-700' :
                          candidate.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {candidate.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-black text-slate-900">{candidate.score ? `${candidate.score}%` : '--'}</span>
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

        <div className="lg:col-span-4 space-y-6">
           <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-6 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Interview Volume
            </h3>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                  <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={20} fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
             <div className="flex items-center gap-3 mb-4">
                <Cpu className="w-6 h-6 text-indigo-400" />
                <h4 className="font-black text-sm uppercase tracking-widest">Managerial Insights</h4>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed font-medium">
               Select a candidate from the roster to provide preparation guidance or finalize their assessment marks.
             </p>
          </div>
        </div>
      </div>

      {selectedCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedCandidate.name}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedCandidate.role}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedCandidate(null); setIsPreparing(false); setIsGrading(false); setGradingErrors({}); }}
                className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Candidate Specs</h4>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                       <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Education</p>
                          <p className="text-sm font-bold text-slate-800">{selectedCandidate.profile?.education}</p>
                       </div>
                       <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Key Proficiencies</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedCandidate.profile?.skills.map(s => (
                              <span key={s} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-wider">{s}</span>
                            ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 {selectedCandidate.matchAnalysis && (
                   <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-black text-indigo-900 uppercase">Automated Fit Analysis</span>
                      </div>
                      <p className="text-sm text-indigo-800 font-medium leading-relaxed italic">
                        "{selectedCandidate.matchAnalysis.reasoning}"
                      </p>
                   </div>
                 )}
              </div>

              <div className="space-y-6">
                {!isPreparing && !isGrading ? (
                  <div className="space-y-4">
                     {selectedCandidate.status === 'PENDING' && (
                       <button 
                        onClick={() => setIsPreparing(true)}
                        className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                       >
                         <MessageSquare className="w-5 h-5" />
                         Set Preparation Instructions
                       </button>
                     )}
                     
                     {selectedCandidate.status === 'INTERVIEWING' && (
                       <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-200 text-center">
                          <Radio className="w-8 h-8 text-amber-500 mx-auto mb-4 animate-pulse" />
                          <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-2">Interview Live</h4>
                          <p className="text-xs text-amber-700 font-medium">Session is active. Candidate is currently engaged with AI recruiter.</p>
                       </div>
                     )}

                     {selectedCandidate.status === 'COMPLETED' && (
                       <button 
                        onClick={() => { setIsGrading(true); setGradingErrors({}); }}
                        className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                       >
                         <Star className="w-5 h-5" />
                         Submit Manager Assessment
                       </button>
                     )}

                     {selectedCandidate.managerAssessment && (
                        <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Rating</span>
                              <span className="text-2xl font-black text-indigo-600">{selectedCandidate.managerAssessment.score}/100</span>
                           </div>
                           <div className={`p-4 rounded-2xl flex items-center gap-3 ${
                             selectedCandidate.managerAssessment.recommendation === 'HIRE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                           }`}>
                             {selectedCandidate.managerAssessment.recommendation === 'HIRE' ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
                             <span className="text-xs font-black uppercase tracking-widest">{selectedCandidate.managerAssessment.recommendation} Decision</span>
                           </div>
                           <p className="text-xs text-slate-600 font-medium italic">"{selectedCandidate.managerAssessment.comments}"</p>
                        </div>
                     )}
                  </div>
                ) : isPreparing ? (
                   <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Send className="w-4 h-4 text-indigo-500" />
                        Candidate Instructions
                      </h4>
                      <textarea 
                        value={prepMessage}
                        onChange={(e) => setPrepMessage(e.target.value)}
                        placeholder="Type any specific areas you want the candidate to focus on..."
                        className="w-full h-40 p-5 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
                      />
                      <div className="flex gap-3">
                        <button onClick={initiateInterview} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Send & Invite</button>
                        <button onClick={() => setIsPreparing(false)} className="px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase">Back</button>
                      </div>
                   </div>
                ) : (
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-100">
                     <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-indigo-500" />
                        Manual Assessment
                      </h4>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                             <label className={`text-[10px] font-black uppercase tracking-widest ${gradingErrors.score ? 'text-red-500' : 'text-slate-400'}`}>Final Score</label>
                             <span className="text-xs font-black text-indigo-600">{assessment.score}</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" max="100" 
                            value={assessment.score} 
                            onChange={(e) => {
                              setAssessment({...assessment, score: parseInt(e.target.value)});
                              if (gradingErrors.score) setGradingErrors(prev => ({ ...prev, score: undefined }));
                            }} 
                            className="w-full h-2 bg-slate-100 rounded-full appearance-none accent-indigo-600" 
                          />
                          {gradingErrors.score && <p className="text-[10px] text-red-500 mt-1 font-bold">{gradingErrors.score}</p>}
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Decision</label>
                          <div className="grid grid-cols-3 gap-2">
                             {['HIRE', 'REJECT', 'FOLLOW_UP'].map(type => (
                               <button 
                                key={type}
                                onClick={() => setAssessment({...assessment, recommendation: type as any})}
                                className={`py-2 px-1 rounded-xl text-[8px] font-black uppercase tracking-tighter border-2 ${
                                  assessment.recommendation === type ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'
                                }`}
                               >
                                 {type}
                               </button>
                             ))}
                          </div>
                        </div>
                        <div>
                          <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${gradingErrors.comments ? 'text-red-500' : 'text-slate-400'}`}>Internal Feedback</label>
                          <textarea 
                            value={assessment.comments} 
                            onChange={(e) => {
                              setAssessment({...assessment, comments: e.target.value});
                              if (gradingErrors.comments) setGradingErrors(prev => ({ ...prev, comments: undefined }));
                            }} 
                            placeholder="Notes for HR..." 
                            className={`w-full h-24 p-4 bg-slate-50 border-none rounded-2xl text-xs font-medium focus:ring-2 transition-all outline-none ${gradingErrors.comments ? 'ring-2 ring-red-500/50 bg-red-50/10' : 'focus:ring-indigo-500'}`} 
                          />
                          {gradingErrors.comments && (
                            <div className="flex items-center gap-1 mt-2 text-red-500">
                              <AlertCircle className="w-3 h-3" />
                              <p className="text-[10px] font-bold">{gradingErrors.comments}</p>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={submitGrading} 
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                          Finalize Grading
                        </button>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center space-x-4 shadow-sm">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none mt-1">{value}</p>
    </div>
  </div>
);

export default ManagerPanel;
