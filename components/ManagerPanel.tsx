
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Users, ArrowUpRight, X, Brain, Radio, Cpu, 
  BarChart3, Briefcase, RefreshCw, 
  Trash2, Copy, PlayCircle, PauseCircle, StopCircle, 
  Signal, Target, Zap, Activity, Plus, Save, AlertCircle, PlusCircle, LayoutGrid, Layers, ListChecks,
  ShieldCheck, UserPlus, UserMinus, CheckCircle2, UserCheck, Video as VideoIcon, DoorOpen, LogIn, Phone, PhoneOff, Mic, MicOff, Camera, CameraOff, Send, Mail, SortAsc, CalendarDays, ExternalLink,
  Clock as ClockIcon, CalendarPlus, Check, Loader2, Video, Edit3, Eye, EyeOff, UserX
} from 'lucide-react';
import { INITIAL_CANDIDATES, INITIAL_JOBS } from '../constants';
import { Candidate, LiveCommand, JobTemplate } from '../types';
import ReportingSystem from './ReportingSystem';
import { processJobAlerts, sendEmailNotification } from '../services/notificationService';

const CANDIDATE_DB_KEY = 'hirestream_candidates_db';
const JOBS_DB_KEY = 'hirestream_jobs_db';

const AVAILABLE_BOARD_MEMBERS = [
  { id: 'bm-1', name: 'Marcus Board Member', email: 'board@hirestream.ai' },
  { id: 'bm-2', name: 'Elena Strategy', email: 'elena@hirestream.ai' },
  { id: 'bm-3', name: 'David Technical', email: 'david@hirestream.ai' },
  { id: 'bm-4', name: 'Sarah Executive', email: 'sarah@hirestream.ai' }
];

type ViewType = 'pipeline' | 'jobs' | 'reports' | 'meetings';
type SortOption = 'name' | 'status' | 'matchScore' | 'score' | 'date';

const ManagerPanel: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('pipeline');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobTemplate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [detailTab, setDetailTab] = useState<'assessment' | 'live' | 'oversight'>('assessment');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  
  // Meeting State
  const [activeMeetingCandId, setActiveMeetingCandId] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [meetingStream, setMeetingStream] = useState<MediaStream | null>(null);

  // Scheduling State
  const [candidateToSchedule, setCandidateToSchedule] = useState<Candidate | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isSchedulingLoading, setIsSchedulingLoading] = useState(false);

  // Job Creation/Edit State
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [newJob, setNewJob] = useState<Omit<JobTemplate, 'id' | 'createdAt'>>({
    title: '', description: '', systemPrompt: '', questions: ['', '', ''], requirements: [],
    minExperience: 1, requiredSkills: [], educationRequirement: '', status: 'OPEN'
  });
  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = () => {
      // Candidates Load
      const savedCand = localStorage.getItem(CANDIDATE_DB_KEY);
      if (savedCand) {
        setCandidates(JSON.parse(savedCand));
      } else {
        setCandidates(INITIAL_CANDIDATES);
        localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(INITIAL_CANDIDATES));
      }

      // Jobs Load
      const savedJobs = localStorage.getItem(JOBS_DB_KEY);
      if (savedJobs) {
        setJobs(JSON.parse(savedJobs));
      } else {
        setJobs(INITIAL_JOBS);
        localStorage.setItem(JOBS_DB_KEY, JSON.stringify(INITIAL_JOBS));
      }
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  const validateJob = () => {
    const e: Record<string, string> = {};
    if (!newJob.title.trim() || newJob.title.length < 5) e.title = 'Title min 5 chars.';
    if (!newJob.systemPrompt.trim() || newJob.systemPrompt.length < 50) e.systemPrompt = 'Prompt min 50 chars.';
    if (newJob.requiredSkills.length === 0) e.requiredSkills = 'Add at least one skill.';
    if (newJob.requirements.length === 0) e.requirements = 'Add at least one requirement.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveJob = async () => {
    if (!validateJob()) return;

    let updatedJobs: JobTemplate[];

    if (editingJobId) {
      updatedJobs = jobs.map(j => j.id === editingJobId ? {
        ...j,
        ...newJob,
        questions: newJob.questions.filter(q => q.trim() !== ''),
        requirements: newJob.requirements.filter(r => r.trim() !== '')
      } : j);
    } else {
      const template: JobTemplate = {
        ...newJob,
        id: `tmpl-${Date.now()}`,
        createdAt: new Date().toISOString(),
        applicantCount: 0,
        questions: newJob.questions.filter(q => q.trim() !== ''),
        requirements: newJob.requirements.filter(r => r.trim() !== '')
      } as JobTemplate;
      updatedJobs = [...jobs, template];
      await processJobAlerts(template);
    }
    
    setJobs(updatedJobs);
    localStorage.setItem(JOBS_DB_KEY, JSON.stringify(updatedJobs));
    
    setIsAddingJob(false);
    setEditingJobId(null);
    setIsCloning(false);
    setNewJob({ 
      title: '', description: '', systemPrompt: '', questions: ['', '', ''], requirements: [],
      minExperience: 1, requiredSkills: [], educationRequirement: '', status: 'OPEN'
    });
    setErrors({});
  };

  const handleEditJob = (job: JobTemplate) => {
    setNewJob({
      title: job.title,
      description: job.description,
      systemPrompt: job.systemPrompt,
      questions: job.questions.length > 0 ? [...job.questions] : ['', '', ''],
      requirements: [...job.requirements],
      minExperience: job.minExperience,
      requiredSkills: [...job.requiredSkills],
      educationRequirement: job.educationRequirement,
      status: job.status
    });
    setEditingJobId(job.id);
    setIsAddingJob(true);
    setIsCloning(false);
  };

  const handleCloneJob = (job: JobTemplate) => {
    setNewJob({
      title: `${job.title} (Clone)`,
      description: job.description,
      systemPrompt: job.systemPrompt,
      questions: [...job.questions],
      requirements: [...job.requirements],
      minExperience: job.minExperience,
      requiredSkills: [...job.requiredSkills],
      educationRequirement: job.educationRequirement,
      status: 'DRAFT'
    });
    setEditingJobId(null);
    setIsAddingJob(true);
    setIsCloning(true);
  };

  const startNewVacancy = () => {
    setNewJob({ 
      title: '', description: '', systemPrompt: '', questions: ['', '', ''], requirements: [],
      minExperience: 1, requiredSkills: [], educationRequirement: '', status: 'OPEN'
    });
    setEditingJobId(null);
    setIsAddingJob(true);
    setIsCloning(false);
    setErrors({});
  };

  const toggleJobStatus = (job: JobTemplate) => {
    const newStatus = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    const updated = jobs.map(j => j.id === job.id ? { ...j, status: newStatus } : j);
    setJobs(updated as JobTemplate[]);
    localStorage.setItem(JOBS_DB_KEY, JSON.stringify(updated));
  };

  const deleteJob = (id: string) => {
    if (window.confirm('Delete this vacancy? This will remove all associated applicant metrics.')) {
      const updated = jobs.filter(j => j.id !== id);
      setJobs(updated);
      localStorage.setItem(JOBS_DB_KEY, JSON.stringify(updated));
    }
  };

  const handleLiveCommand = (type: LiveCommand['type'], payload?: string) => {
    if (!selectedCandidate) return;
    const updated: Candidate = {
      ...selectedCandidate,
      lastCommand: { type, payload, timestamp: new Date().toISOString() },
      status: type === 'START' ? 'INTERVIEWING' : type === 'STOP' ? 'COMPLETED' : type === 'PAUSE' ? 'PAUSED' : type === 'RESUME' ? 'INTERVIEWING' : selectedCandidate.status
    };
    saveCandidate(updated);
  };

  const admitBoardMember = (name: string) => {
    if (!selectedCandidate) return;
    const currentAdmitted = selectedCandidate.boardMembers || [];
    const currentRequested = selectedCandidate.requestedBoardMembers || [];
    
    const updated: Candidate = {
      ...selectedCandidate,
      requestedBoardMembers: currentRequested.filter(n => n !== name),
      boardMembers: Array.from(new Set([...currentAdmitted, name]))
    };
    saveCandidate(updated);
  };

  const denyBoardMember = (name: string) => {
    if (!selectedCandidate) return;
    const currentRequested = selectedCandidate.requestedBoardMembers || [];
    const updated: Candidate = {
      ...selectedCandidate,
      requestedBoardMembers: currentRequested.filter(n => n !== name)
    };
    saveCandidate(updated);
  };

  const toggleManagerJoin = () => {
    if (!selectedCandidate) return;
    const updated: Candidate = {
      ...selectedCandidate,
      isManagerJoined: !selectedCandidate.isManagerJoined
    };
    saveCandidate(updated);
  };

  // Video Call Features (Simulated Zoom)
  const startMeeting = async (candidate: Candidate) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMeetingStream(stream);
      setTimeout(() => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }, 150);
      
      const zoomId = Math.floor(Math.random() * 1000000000).toString().replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
      const updated: Candidate = {
        ...candidate,
        activeMeetingRoom: `zoom-room-${zoomId}`,
        meetingParticipants: ['Hiring Manager (Host)']
      };
      saveCandidate(updated);
      setActiveMeetingCandId(candidate.id);
      
      const subj = `Instant Zoom Invitation: ${candidate.role} Interview`;
      const msg = `Hello ${candidate.name}, the Hiring Manager has initiated a live video session. Join the Zoom bridge now via your HireStream portal dashboard.`;
      await sendEmailNotification(candidate.email, subj, msg);
    } catch (err) {
      alert("Microphone and Camera access is required to use the video bridge features.");
    }
  };

  const endMeeting = () => {
    if (meetingStream) {
      meetingStream.getTracks().forEach(track => track.stop());
      setMeetingStream(null);
    }
    if (activeMeetingCandId) {
      const cand = candidates.find(c => c.id === activeMeetingCandId);
      if (cand) {
        const updated: Candidate = { ...cand, activeMeetingRoom: undefined, meetingParticipants: [] };
        saveCandidate(updated);
      }
    }
    setActiveMeetingCandId(null);
  };

  const handleConfirmSchedule = async () => {
    if (!candidateToSchedule || !scheduleDate || !scheduleTime) return;
    setIsSchedulingLoading(true);

    const updated: Candidate = {
      ...candidateToSchedule,
      interviewDate: scheduleDate,
      interviewTime: scheduleTime,
      status: 'PENDING'
    };

    saveCandidate(updated);

    const subject = `Confirmed: Zoom Interview - ${updated.role}`;
    const body = `Hi ${updated.name},\n\nYour interview has been scheduled for ${scheduleDate} at ${scheduleTime} (GMT-5).\n\nBest,\nHiring Team`;
    await sendEmailNotification(updated.email, subject, body);

    setIsSchedulingLoading(false);
    setCandidateToSchedule(null);
    setScheduleDate('');
    setScheduleTime('');
  };

  const saveCandidate = (updated: Candidate) => {
    const newList = candidates.map(c => c.id === updated.id ? updated : c);
    setCandidates(newList);
    localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(newList));
    if (selectedCandidate?.id === updated.id) setSelectedCandidate(updated);
  };

  const getSortedCandidates = () => {
    return [...candidates].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'status': return a.status.localeCompare(b.status);
        case 'matchScore': return (b.matchScore || 0) - (a.matchScore || 0);
        case 'score': return (b.score || 0) - (a.score || 0);
        case 'date': return new Date(b.interviewDate).getTime() - new Date(a.interviewDate).getTime();
        default: return 0;
      }
    });
  };

  const filteredCandidates = getSortedCandidates().filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCandidatesCount = candidates.length || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32">
      {/* View Selector Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Operations Desk</h2>
          <p className="text-slate-500 font-medium mt-2">Real-time pipeline monitoring & role scaling</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto">
          {[
            { id: 'pipeline', label: 'Pipeline', icon: Users },
            { id: 'meetings', label: 'Zoom Center', icon: VideoIcon },
            { id: 'jobs', label: 'Job Board', icon: Briefcase },
            { id: 'reports', label: 'Analytics', icon: BarChart3 }
          ].map(view => (
            <button 
              key={view.id} 
              onClick={() => setActiveView(view.id as ViewType)} 
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeView === view.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <view.icon className="w-4 h-4" /> {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Zoom Center View */}
      {activeView === 'meetings' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                 <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                       <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                          <VideoIcon className="w-4 h-4 text-blue-500" /> Active & Planned Zoom Sessions
                       </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                       {candidates.filter(c => c.status !== 'REJECTED' && c.status !== 'COMPLETED').map(c => (
                          <div key={c.id} className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50/30 transition-all group">
                             <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                                   {c.name.charAt(0)}
                                </div>
                                <div>
                                   <h4 className="font-black text-slate-900 text-sm leading-none">{c.name}</h4>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{c.role}</p>
                                   <div className="flex items-center gap-3 mt-3">
                                      <div className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3 text-indigo-500" /><span className="text-[9px] font-black text-slate-500 uppercase">{c.interviewDate}</span></div>
                                      <div className="flex items-center gap-1.5"><ClockIcon className="w-3 h-3 text-slate-300" /><span className="text-[9px] font-bold text-slate-400 uppercase">{c.interviewTime || 'TBD'}</span></div>
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => activeMeetingCandId === c.id ? endMeeting() : startMeeting(c)}
                                  className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeMeetingCandId === c.id ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700'}`}
                                >
                                   {activeMeetingCandId === c.id ? <PhoneOff className="w-3.5 h-3.5" /> : <VideoIcon className="w-3.5 h-3.5" />}
                                   {activeMeetingCandId === c.id ? 'End Session' : 'Launch Zoom'}
                                </button>
                             </div>
                          </div>
                       ))}
                       {candidates.filter(c => c.status !== 'REJECTED' && c.status !== 'COMPLETED').length === 0 && (
                         <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest flex flex-col items-center">
                            <VideoIcon className="w-12 h-12 mb-4 opacity-20" />
                            No pending sessions found
                         </div>
                       )}
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden h-fit">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><VideoIcon className="w-32 h-32" /></div>
                    <div className="relative z-10 space-y-6">
                       <h3 className="text-xl font-black uppercase tracking-tight">Zoom Health</h3>
                       <div className="space-y-4">
                          <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                             <p className="text-[9px] font-black text-blue-200 uppercase mb-1">Global Load</p>
                             <p className="text-2xl font-black">{candidates.filter(c => c.activeMeetingRoom).length} / 15</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 2. Job Board View */}
      {activeView === 'jobs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
           <div className="lg:col-span-8 space-y-6">
              {isAddingJob ? (
                <section className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-xl animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${editingJobId ? 'bg-indigo-600' : isCloning ? 'bg-amber-500' : 'bg-indigo-600'} rounded-xl flex items-center justify-center text-white transition-colors`}>
                        {editingJobId ? <Edit3 className="w-5 h-5" /> : isCloning ? <Copy className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        {editingJobId ? 'Modify Vacancy' : isCloning ? 'Clone Vacancy' : 'New Vacancy'}
                      </h3>
                    </div>
                    <button onClick={() => { setIsAddingJob(false); setEditingJobId(null); setIsCloning(false); }} className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><X /></button>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Job Title</label>
                        <input type="text" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className={`w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none ${errors.title ? 'border-red-500' : 'border-transparent focus:border-indigo-500'}`} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Min Experience (Years)</label>
                        <input type="number" value={newJob.minExperience} onChange={e => setNewJob({...newJob, minExperience: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">AI Protocol Instruction</label>
                      <textarea value={newJob.systemPrompt} onChange={e => setNewJob({...newJob, systemPrompt: e.target.value})} className={`w-full h-32 p-4 bg-slate-900 text-indigo-400 border-2 rounded-[2rem] font-mono text-xs outline-none ${errors.systemPrompt ? 'border-red-500' : 'border-transparent focus:border-indigo-500'}`} />
                    </div>
                    <button onClick={handleSaveJob} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-indigo-700">
                      <Save className="w-4 h-4" /> Save Deployment
                    </button>
                  </div>
                </section>
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Active Roles</h3>
                      <button onClick={startNewVacancy} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Plus className="w-4 h-4" /> Post Vacancy
                      </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {jobs.map(job => (
                        <div key={job.id} className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50/50 transition-all group">
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${job.status === 'OPEN' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              <Briefcase className="w-7 h-7" />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-lg leading-tight">{job.title}</h4>
                              <div className="flex items-center gap-3 mt-1.5">
                                <button 
                                  onClick={() => toggleJobStatus(job)}
                                  className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${job.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                                >
                                  {job.status === 'OPEN' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                  {job.status}
                                </button>
                                <span className="text-[9px] font-bold text-slate-300 uppercase">Since {new Date(job.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditJob(job)} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleCloneJob(job)} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"><Copy className="w-4 h-4" /></button>
                            <button onClick={() => deleteJob(job.id)} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
           </div>
           <div className="lg:col-span-4 space-y-6">
              <section className="bg-indigo-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden h-fit border-8 border-white">
                 <div className="absolute top-0 right-0 p-8 opacity-10"><Zap className="w-32 h-32" /></div>
                 <h3 className="text-xl font-black uppercase tracking-tight mb-4">Traffic</h3>
                 <div className="p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3 text-indigo-200"><span>Global Pipeline</span><span>{candidates.length}</span></div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-400 transition-all duration-1000" style={{width: `${Math.min(100, (candidates.length / totalCandidatesCount) * 100)}%`}} />
                    </div>
                 </div>
              </section>
           </div>
        </div>
      )}

      {/* 3. Pipeline View */}
      {activeView === 'pipeline' && (
        <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
           <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-4 flex-1">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-64" />
               </div>
               <div className="flex items-center bg-slate-50 rounded-xl px-3 border border-slate-100">
                 <SortAsc className="w-3.5 h-3.5 text-slate-400 mr-2" />
                 <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="bg-transparent border-none py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer">
                   <option value="date">Date</option>
                   <option value="matchScore">Match</option>
                   <option value="score">Rating</option>
                   <option value="name">Name</option>
                 </select>
               </div>
             </div>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                   <th className="px-8 py-6">Identity</th>
                   <th className="px-8 py-6 text-center">Status</th>
                   <th className="px-8 py-6 text-center">Schedule</th>
                   <th className="px-8 py-6 text-center">Fit Score</th>
                   <th className="px-8 py-6 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredCandidates.map(c => (
                   <tr key={c.id} className="hover:bg-slate-50 transition-all group">
                     <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">{c.name.charAt(0)}</div>
                           <div><p className="font-bold text-slate-900 text-sm leading-none">{c.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">{c.role}</p></div>
                        </div>
                     </td>
                     <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          c.status === 'INTERVIEWING' ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-400'
                        }`}>{c.status}</span>
                     </td>
                     <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-900">{c.interviewDate}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{c.interviewTime || 'Awaiting'}</span>
                        </div>
                     </td>
                     <td className="px-8 py-6 text-center font-black text-xs text-indigo-600">{c.matchScore ? `${c.matchScore}%` : '--'}</td>
                     <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button onClick={() => setCandidateToSchedule(c)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><CalendarPlus className="w-5 h-5" /></button>
                           <button onClick={() => { setSelectedCandidate(c); setDetailTab('assessment'); }} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><ArrowUpRight className="w-5 h-5" /></button>
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* 4. Analytics View */}
      {activeView === 'reports' && (
        <div className="animate-in slide-in-from-bottom-4">
          <ReportingSystem />
        </div>
      )}

      {/* QUICK SCHEDULE OVERLAY */}
      {candidateToSchedule && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10">
              <div className="flex justify-between items-start mb-8">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Bridge Scheduling</h3>
                 <button onClick={() => setCandidateToSchedule(null)} className="p-3 text-slate-300 hover:bg-slate-50 rounded-xl transition-all"><X /></button>
              </div>
              <div className="space-y-6">
                 <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none" />
                 <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none" />
                 <button onClick={handleConfirmSchedule} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase shadow-xl hover:bg-blue-700 disabled:opacity-50">
                    {isSchedulingLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Slot'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-6">
                   <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center text-2xl font-black">{selectedCandidate.name.charAt(0)}</div>
                   <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCandidate.name}</h3><p className="text-xs text-indigo-600 font-bold uppercase tracking-widest">{selectedCandidate.role}</p></div>
               </div>
               <button onClick={() => setSelectedCandidate(null)} className="p-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-400 hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex border-b border-slate-100 bg-white px-8">
              {[
                { id: 'assessment', label: 'Evaluation', icon: Brain }, 
                { id: 'live', label: 'Command Deck', icon: Radio },
                { id: 'oversight', label: 'Room Control', icon: ShieldCheck }
              ].map(tab => (
                <button key={tab.id} onClick={() => setDetailTab(tab.id as any)} className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest transition-all relative ${detailTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <div className="flex items-center gap-2"><tab.icon className="w-4 h-4" /> {tab.label}</div>
                  {detailTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full" />}
                </button>
              ))}
            </div>
            <div className="p-10 flex-1 overflow-y-auto min-h-[400px]">
               {detailTab === 'oversight' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><DoorOpen className="w-4 h-4 text-indigo-600" /> Requests</h4>
                       <div className="space-y-3">
                          {(selectedCandidate.requestedBoardMembers || []).length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-[9px] font-black uppercase text-slate-300">Queue Empty</div>
                          ) : (
                            selectedCandidate.requestedBoardMembers?.map(name => (
                              <div key={name} className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex items-center justify-between">
                                 <span className="text-[10px] font-black text-indigo-900 uppercase">{name}</span>
                                 <div className="flex gap-2">
                                    <button onClick={() => denyBoardMember(name)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><UserX className="w-4 h-4" /></button>
                                    <button onClick={() => admitBoardMember(name)} className="p-2 bg-indigo-600 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                                 </div>
                              </div>
                            ))
                          )}
                       </div>
                    </div>
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl">
                       <h4 className="text-xs font-black uppercase tracking-widest mb-6 text-indigo-400">Roster</h4>
                       <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                             <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${selectedCandidate.isManagerJoined ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} /><span className="text-[10px] font-black">Manager</span></div>
                             <button onClick={toggleManagerJoin} className="text-[8px] font-black uppercase bg-white/10 px-2 py-1 rounded">{selectedCandidate.isManagerJoined ? 'Leave' : 'Join'}</button>
                          </div>
                          {(selectedCandidate.boardMembers || []).map(name => (
                            <div key={name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10"><span className="text-[10px] font-black uppercase">{name}</span><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /></div>
                          ))}
                       </div>
                    </div>
                 </div>
               )}
               {detailTab === 'live' && (
                 <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative border-4 border-slate-800 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                           <div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${selectedCandidate.status === 'INTERVIEWING' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} /><h4 className="text-xs font-black uppercase tracking-widest">Protocol Stream</h4></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <button onClick={() => handleLiveCommand(selectedCandidate.status === 'INTERVIEWING' ? 'PAUSE' : 'RESUME')} className="py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[9px] uppercase hover:bg-white/10 transition-all">
                              {selectedCandidate.status === 'INTERVIEWING' ? 'Pause Agent' : 'Resume Agent'}
                           </button>
                           <button onClick={() => handleLiveCommand('STOP')} className="py-4 bg-red-500 text-white rounded-2xl font-black text-[9px] uppercase hover:bg-red-600 shadow-xl">Abort Protocol</button>
                        </div>
                        <button onClick={() => startMeeting(selectedCandidate)} className="w-full mt-4 py-6 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 flex items-center justify-center gap-2"><VideoIcon className="w-4 h-4" /> Start Direct Zoom Bridge</button>
                    </div>
                 </div>
               )}
               {detailTab === 'assessment' && (
                  <div className="space-y-8">
                    <div className="p-10 bg-indigo-50 border border-indigo-100 rounded-[3rem]">
                       <h4 className="text-xl font-black text-indigo-900 tracking-tight mb-4">Synthesis</h4>
                       <p className="text-sm text-indigo-700/80 font-medium leading-relaxed">{selectedCandidate.summary || "Pending final evaluation log..."}</p>
                    </div>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ZOOM BRIDGE */}
      {activeMeetingCandId && (
        <div className="fixed bottom-6 right-6 w-80 bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 border-slate-800 z-[999] overflow-hidden">
           <div className="p-4 border-b border-white/5 flex items-center justify-between bg-blue-600/10">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Active Bridge</span>
              <button onClick={endMeeting} className="p-1.5 text-slate-400 hover:text-white transition-all"><X className="w-4 h-4" /></button>
           </div>
           <div className="aspect-video bg-black relative">
              {isCameraOff ? <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-white font-black">Cam Off</div> : <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}
           </div>
           <div className="p-6 flex justify-center gap-4 border-t border-white/5">
              <button onClick={() => setIsMicMuted(!isMicMuted)} className={`p-3 rounded-2xl ${isMicMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>{isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>
              <button onClick={() => setIsCameraOff(!isCameraOff)} className={`p-3 rounded-2xl ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>{isCameraOff ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}</button>
              <button onClick={endMeeting} className="p-3 bg-red-500 text-white rounded-2xl"><PhoneOff className="w-4 h-4" /></button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPanel;
