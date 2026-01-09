
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, TrendingUp, Users, CheckCircle, Clock, ArrowUpRight, X, Brain, 
  Send, Star, FileCheck, ThumbsUp, ThumbsDown, MessageSquare, Target, ChevronRight, 
  ShieldCheck, Radio, Cpu, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, BarChart3,
  Calendar, Video, FileText, Download, Play, Pause, Volume2, Maximize, UserCheck, 
  Settings2, MoreHorizontal, History, Eye, Plus, Trash2, UserPlus, Clock4, ClipboardList
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { INITIAL_CANDIDATES } from '../constants';
import { Candidate, ManagerAssessment } from '../types';
import ReportingSystem from './ReportingSystem';

const CANDIDATE_DB_KEY = 'hirestream_candidates_db';

type SortConfig = {
  key: keyof Candidate;
  direction: 'asc' | 'desc';
} | null;

const ManagerPanel: React.FC = () => {
  const [activeView, setActiveView] = useState<'pipeline' | 'reports'>('pipeline');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [detailTab, setDetailTab] = useState<'assessment' | 'logistics' | 'recording' | 'cv'>('assessment');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  
  // Recording State
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Logistics State
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [newBoardMember, setNewBoardMember] = useState('');

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

  // Sync assessment form with selected candidate
  useEffect(() => {
    if (selectedCandidate) {
      if (selectedCandidate.managerAssessment) {
        setAssessment(selectedCandidate.managerAssessment);
      } else {
        setAssessment({
          score: 80,
          comments: '',
          recommendation: 'HIRE'
        });
      }
      setEditDate(selectedCandidate.interviewDate || '');
      setEditTime(selectedCandidate.interviewTime || '09:00');
      setIsPlaying(false);
    }
  }, [selectedCandidate]);

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
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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

  const handleSaveLogistics = () => {
    if (!selectedCandidate) return;
    const updated = { 
      ...selectedCandidate, 
      interviewDate: editDate,
      interviewTime: editTime
    };
    updateCandidate(updated);
  };

  const handleAddBoardMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !newBoardMember.trim()) return;
    const currentBoard = selectedCandidate.boardMembers || [];
    if (currentBoard.includes(newBoardMember.trim())) return;
    
    const updated = {
      ...selectedCandidate,
      boardMembers: [...currentBoard, newBoardMember.trim()]
    };
    updateCandidate(updated);
    setNewBoardMember('');
  };

  const handleRemoveBoardMember = (member: string) => {
    if (!selectedCandidate) return;
    const updated = {
      ...selectedCandidate,
      boardMembers: (selectedCandidate.boardMembers || []).filter(m => m !== member)
    };
    updateCandidate(updated);
  };

  const toggleCVReviewed = () => {
    if (!selectedCandidate) return;
    const updated = { ...selectedCandidate, cvReviewed: !selectedCandidate.cvReviewed };
    updateCandidate(updated);
  };

  const submitGrading = () => {
    if (!selectedCandidate) return;
    const errors: { comments?: string; score?: string } = {};
    if (!assessment.comments?.trim()) errors.comments = 'Feedback comments are required.';
    if (assessment.score === undefined || assessment.score < 0 || assessment.score > 100) errors.score = 'Invalid score.';

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
    setGradingErrors({});
  };

  const SortIcon = ({ column }: { column: keyof Candidate }) => {
    if (!sortConfig || sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-indigo-600" /> : <ArrowDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manager Dashboard</h2>
          <p className="text-slate-500 font-medium">Coordinate talent reviews and performance tracking</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveView('pipeline')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'pipeline' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pipeline
          </button>
          <button 
            onClick={() => setActiveView('reports')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Reports
          </button>
        </div>
      </div>

      {activeView === 'reports' ? (
        <ReportingSystem />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users className="text-blue-600"/>} label="Total Pipeline" value={candidates.length.toString()} color="bg-blue-50" />
            <StatCard icon={<Clock className="text-amber-600"/>} label="Live Sessions" value={candidates.filter(c => c.status === 'INTERVIEWING').length.toString()} color="bg-amber-50" />
            <StatCard icon={<CheckCircle className="text-emerald-600"/>} label="Ready for Review" value={candidates.filter(c => c.status === 'COMPLETED').length.toString()} color="bg-emerald-50" />
            <StatCard icon={<BarChart3 className="text-indigo-600"/>} label="Conv. Rate" value="28%" color="bg-indigo-50" />
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 tracking-tight uppercase">Talent Control Center</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage Candidate Life Cycle</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-[0.15em]">
                    <th className="px-8 py-4 cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('name')}>Participant <SortIcon column="name" /></th>
                    <th className="px-8 py-4 cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('interviewDate')}>Scheduled Date <SortIcon column="interviewDate" /></th>
                    <th className="px-8 py-4 text-center cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('status')}>Status <SortIcon column="status" /></th>
                    <th className="px-8 py-4 text-center cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('score')}>AI Rating <SortIcon column="score" /></th>
                    <th className="px-8 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">{candidate.name.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{candidate.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{candidate.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-600 font-medium text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {candidate.interviewDate}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          candidate.status === 'INTERVIEWING' ? 'bg-amber-100 text-amber-700' :
                          candidate.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          candidate.status === 'SHORTLISTED' ? 'bg-indigo-100 text-indigo-700' :
                          candidate.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                        }`}>{candidate.status}</span>
                      </td>
                      <td className="px-8 py-6 text-center text-sm font-black text-slate-900">{candidate.score ? `${candidate.score}%` : '--'}</td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setDetailTab('assessment');
                          }} 
                          className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
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
        </>
      )}

      {selectedCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-600/20">{selectedCandidate.name.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCandidate.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedCandidate.role}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs text-indigo-600 font-bold uppercase tracking-widest">{selectedCandidate.email}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => { setSelectedCandidate(null); }} className="p-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-400 hover:text-indigo-600 transition-all shadow-sm"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex border-b border-slate-100 bg-white px-8">
              {[
                { id: 'assessment', label: 'Assessment', icon: Brain },
                { id: 'logistics', label: 'Logistics & Board', icon: ClipboardList },
                { id: 'recording', label: 'Interview Recording', icon: Video },
                { id: 'cv', label: 'CV & Profile', icon: FileText }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id as any)}
                  className={`flex items-center gap-2 px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                    detailTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {detailTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full" />}
                </button>
              ))}
            </div>

            <div className="p-10 max-h-[60vh] overflow-y-auto">
              {detailTab === 'assessment' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ScoreCard label="AI Match Score" value={selectedCandidate.matchScore || 0} icon={Target} color="indigo" />
                    <ScoreCard label="Interview Performance" value={selectedCandidate.score || 0} icon={Brain} color="emerald" />
                  </div>

                  {selectedCandidate.status !== 'PENDING' && selectedCandidate.status !== 'INTERVIEWING' ? (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest">Final Manager Grade</h4>
                         {selectedCandidate.managerAssessment && <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl"><UserCheck className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Graded</span></div>}
                      </div>
                      <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Overall Rating (0-100)</label>
                            <input 
                              type="number"
                              value={assessment.score}
                              onChange={(e) => setAssessment({...assessment, score: parseInt(e.target.value)})}
                              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                            {gradingErrors.score && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{gradingErrors.score}</p>}
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Recommendation</label>
                            <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
                                {['HIRE', 'FOLLOW_UP', 'REJECT'].map((rec) => (
                                  <button
                                    key={rec}
                                    onClick={() => setAssessment({...assessment, recommendation: rec as any})}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                      assessment.recommendation === rec 
                                      ? (rec === 'HIRE' ? 'bg-emerald-500 text-white shadow-lg' : rec === 'REJECT' ? 'bg-red-500 text-white shadow-lg' : 'bg-indigo-500 text-white shadow-lg')
                                      : 'text-slate-400 hover:bg-slate-50'
                                    }`}
                                  >
                                    {rec.replace('_', ' ')}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Assessment Feedback</label>
                          <textarea 
                            value={assessment.comments}
                            onChange={(e) => setAssessment({...assessment, comments: e.target.value})}
                            placeholder="Detail why you've reached this decision..."
                            className="w-full h-32 bg-white border border-slate-200 rounded-[1.5rem] px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                          {gradingErrors.comments && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{gradingErrors.comments}</p>}
                        </div>
                        <button onClick={submitGrading} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98]">Update Evaluation Report</button>
                      </div>
                    </section>
                  ) : (
                    <div className="bg-indigo-50 p-10 rounded-[2.5rem] border border-indigo-100 text-center">
                      <History className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
                      <h4 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Interview In Progress</h4>
                      <p className="text-sm text-indigo-600/80 font-medium max-w-xs mx-auto mt-2">Assessment tools will be fully available once the candidate completes their AI-led session.</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'logistics' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  {/* Interview Schedule Section */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Calendar className="w-6 h-6 text-indigo-600" />
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Interview Schedule</h4>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <Calendar className="w-3.5 h-3.5" /> Interview Date
                         </label>
                         <input 
                           type="date" 
                           value={editDate} 
                           onChange={(e) => {
                             setEditDate(e.target.value);
                             // Auto-save on change for better UX
                             const updated = { ...selectedCandidate!, interviewDate: e.target.value };
                             updateCandidate(updated);
                           }}
                           className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                         />
                       </div>
                       <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <Clock4 className="w-3.5 h-3.5" /> Interview Time
                         </label>
                         <input 
                           type="time" 
                           value={editTime} 
                           onChange={(e) => {
                             setEditTime(e.target.value);
                             const updated = { ...selectedCandidate!, interviewTime: e.target.value };
                             updateCandidate(updated);
                           }}
                           className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                         />
                       </div>
                    </div>
                  </section>

                  {/* Interview Board Management Section */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Users className="w-6 h-6 text-indigo-600" />
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Interview Board</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-8 shadow-sm">
                      <form onSubmit={handleAddBoardMember} className="flex gap-4">
                        <div className="flex-1 relative">
                          <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Add member (e.g. John Doe, Lead Engineer)"
                            value={newBoardMember}
                            onChange={(e) => setNewBoardMember(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <button 
                          type="submit"
                          className="bg-slate-900 text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Add Member
                        </button>
                      </form>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(selectedCandidate.boardMembers || []).length === 0 ? (
                          <div className="md:col-span-2 py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No board members assigned yet</p>
                          </div>
                        ) : (
                          (selectedCandidate.boardMembers || []).map((member) => (
                            <div key={member} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm font-black text-xs">
                                  {member.split(' ').map(n => n[0]).join('')}
                                </div>
                                <span className="text-sm font-bold text-slate-900">{member}</span>
                              </div>
                              <button 
                                onClick={() => handleRemoveBoardMember(member)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {detailTab === 'recording' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  {selectedCandidate.transcript ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      <div className="lg:col-span-5 space-y-6">
                        <div className="aspect-video bg-slate-950 rounded-[2.5rem] relative overflow-hidden group border-8 border-slate-900 shadow-2xl">
                          <img 
                            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" 
                            className={`w-full h-full object-cover transition-opacity duration-500 ${isPlaying ? 'opacity-80 grayscale-0' : 'opacity-60 grayscale'}`} 
                            alt="Recording Preview"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                             <button 
                               onClick={() => setIsPlaying(!isPlaying)}
                               className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 cursor-pointer hover:scale-110 transition-transform"
                             >
                                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                             </button>
                          </div>
                          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black to-transparent">
                             <div className="flex items-center justify-between text-white mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest">{isPlaying ? '05:42' : '04:12'} / 12:45</span>
                                <div className="flex gap-4">
                                   <Volume2 className="w-4 h-4" />
                                   <Maximize className="w-4 h-4" />
                                </div>
                             </div>
                             <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: isPlaying ? '45%' : '35%' }} />
                             </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Metadata</h5>
                           <div className="space-y-4">
                              <MetaItem label="Connection Quality" value="Excellent (HD)" />
                              <MetaItem label="Agent Intelligence" value="Alex v2.5" />
                              <MetaItem label="Sentiment Analysis" value="Positive/Professional" />
                              <MetaItem label="Duration" value="12:45" />
                           </div>
                        </div>
                      </div>

                      <div className="lg:col-span-7 flex flex-col h-[500px] bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Full Session Transcript</span>
                           <div className="flex gap-3">
                              <button className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                                 <Download className="w-3.5 h-3.5" /> Export PDF
                              </button>
                           </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                           {selectedCandidate.transcript.split('\n\n').map((block, i) => {
                             const isAlex = block.startsWith('Interviewer:');
                             return (
                               <div key={i} className={`flex ${isAlex ? 'justify-start' : 'justify-end'}`}>
                                 <div className={`max-w-[85%] p-5 rounded-3xl text-sm font-medium leading-relaxed ${
                                   isAlex ? 'bg-slate-50 text-slate-700 rounded-bl-none border border-slate-100' : 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-600/20'
                                 }`}>
                                   <span className={`text-[8px] font-black uppercase block mb-1 opacity-50`}>{isAlex ? 'Alex (AI)' : 'Candidate'}</span>
                                   {block.replace('Interviewer:', '').replace('Candidate:', '')}
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center flex flex-col items-center">
                       <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6">
                          <Video className="w-10 h-10" />
                       </div>
                       <h4 className="font-black text-slate-300 uppercase tracking-widest">No recordings available yet</h4>
                       <p className="text-xs text-slate-400 font-medium max-w-xs mt-2">Recordings and transcripts appear once the candidate completes their AI interview.</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'cv' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    <div className="md:col-span-4 space-y-6">
                      <div className="bg-slate-950 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-8 opacity-5"><FileText className="w-32 h-32" /></div>
                         <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Candidate Resume</h5>
                         <div className="space-y-6 relative z-10">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4 group-hover:bg-white/10 transition-all cursor-pointer">
                               <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center"><Download className="w-5 h-5 text-white" /></div>
                               <div>
                                  <p className="text-xs font-black">Main_Resume.pdf</p>
                                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Added {selectedCandidate.interviewDate}</p>
                               </div>
                            </div>
                         </div>
                         <button 
                           onClick={toggleCVReviewed}
                           className={`w-full mt-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                             selectedCandidate.cvReviewed ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                           }`}
                         >
                           {selectedCandidate.cvReviewed ? <><CheckCircle className="w-4 h-4" /> Marked as Reviewed</> : <><Eye className="w-4 h-4" /> Mark as Reviewed</>}
                         </button>
                      </div>
                      <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Education History</h5>
                         <div className="flex gap-4">
                            <GraduationCap className="w-10 h-10 text-indigo-600 bg-white p-2 rounded-xl shadow-sm border border-slate-100" />
                            <div>
                               <p className="text-sm font-black text-slate-900 leading-none">{selectedCandidate.profile?.education || 'High School'}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Certified Graduate</p>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="md:col-span-8 space-y-8">
                      <section>
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Target className="w-4 h-4" /> Professional Summary</h5>
                         <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm leading-relaxed text-slate-600 font-medium text-sm italic">
                            "{selectedCandidate.profile?.resumeSummary || 'No professional summary provided.'}"
                         </div>
                      </section>

                      <section>
                         <div className="flex justify-between items-center mb-4">
                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Brain className="w-4 h-4" /> Core Competencies</h5>
                           <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{selectedCandidate.profile?.skills.length || 0} Skills</span>
                         </div>
                         <div className="flex flex-wrap gap-3">
                            {selectedCandidate.profile?.skills.map((skill, i) => (
                              <div key={skill} className="bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-2 group hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-default">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{skill}</span>
                              </div>
                            ))}
                         </div>
                      </section>
                      
                      <section className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center"><Settings2 className="w-6 h-6" /></div>
                            <div>
                               <h5 className="text-lg font-black tracking-tight leading-none">Experience Assessment</h5>
                               <p className="text-xs text-indigo-100 font-medium mt-1">Validated career timeline and tenure fit.</p>
                            </div>
                            <div className="ml-auto text-right">
                               <p className="text-3xl font-black">{selectedCandidate.profile?.experienceYears || 0}<span className="text-sm uppercase tracking-widest ml-1">yrs</span></p>
                            </div>
                         </div>
                      </section>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center space-x-4 shadow-sm">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none mt-1">{value}</p>
    </div>
  </div>
);

const ScoreCard: React.FC<{ label: string; value: number; icon: any; color: 'indigo' | 'emerald' | 'amber' }> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <Icon className={`w-4 h-4 text-${color}-500`} />
    </div>
    <div className="flex items-baseline gap-2">
      <span className={`text-3xl font-black text-${color}-600`}>{value}</span>
      <span className="text-[10px] font-black text-slate-300 uppercase">/ 100</span>
    </div>
    <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full bg-${color}-500 rounded-full transition-all duration-1000`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const MetaItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-[10px] font-black">
    <span className="text-slate-400 uppercase tracking-widest">{label}</span>
    <span className="text-slate-900 uppercase tracking-widest text-right">{value}</span>
  </div>
);

const GraduationCap = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
);

export default ManagerPanel;
