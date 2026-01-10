
import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, CameraOff, Mic, MicOff, CheckCircle2, Video as VideoIcon, Loader2, Star, 
  Target, Cpu, Download, Radio, Briefcase, ChevronRight, UserCircle2, Sparkles, 
  MessageSquare, PlayCircle, ShieldCheck, Clock as ClockIcon, Zap, ArrowRight, 
  Save, Plus, X as XIcon, GraduationCap, FileText, Upload, File, Trash2, 
  PauseCircle, Code2, Check, Info, BellRing, BellOff, Bell, Lightbulb, PhoneCall, PhoneOff, LogIn,
  Mail, Phone, Globe, User, Edit3
} from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { evaluateInterview } from '../services/geminiService';
import { ChatMessage, InterviewEvaluation, User as UserType, Candidate, JobTemplate, CandidateProfile, JobAlertSubscription } from '../types';

const CANDIDATE_DB_KEY = 'hirestream_candidates_db';
const JOBS_DB_KEY = 'hirestream_jobs_db';
const ALERTS_STORAGE_KEY = 'hirestream_job_alerts';

// Audio and base64 helper functions
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

interface CandidatePanelProps { user: UserType; }

const CandidatePanel: React.FC<CandidatePanelProps> = ({ user }) => {
  const [view, setView] = useState<'portal' | 'preparation' | 'interview'>('portal');
  const [activeTab, setActiveTab] = useState<'jobs' | 'interviews' | 'profile'>('jobs');
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [candidateInterviews, setCandidateInterviews] = useState<Candidate[]>([]);
  const [activeInterview, setActiveInterview] = useState<Candidate | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [availableJobs, setAvailableJobs] = useState<JobTemplate[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Meeting Logic (Zoom Integration)
  const [isMeetingInviteActive, setIsMeetingInviteActive] = useState(false);
  const [activeMeetingRoomId, setActiveMeetingRoomId] = useState<string | null>(null);

  // Profile Edit State
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [imgUploadProgress, setImgUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  
  const [editableEmail, setEditableEmail] = useState(user.email);
  const [editableName, setEditableName] = useState(user.name);

  const [profileForm, setProfileForm] = useState<CandidateProfile>({
    education: '', 
    experienceYears: 0, 
    resumeSummary: '', 
    skills: [], 
    alertKeywords: [],
    cvFileName: '', 
    cvUploadDate: '',
    mobile: '',
    portfolioUrl: '',
    imageUrl: ''
  });

  const [alertsActive, setAlertsActive] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    const load = () => {
      const db = localStorage.getItem(CANDIDATE_DB_KEY);
      if (db) {
        const list: Candidate[] = JSON.parse(db);
        // Using the editable email for filter if user changed it in local session
        const currentEmail = localStorage.getItem(`email_${user.id}`) || user.email;
        const myInterviews = list.filter(c => c.email === currentEmail);
        setCandidateInterviews(myInterviews);
        
        // Check for active meeting room invites (Zoom Features)
        const meetingInvited = myInterviews.find(c => !!c.activeMeetingRoom);
        if (meetingInvited) {
          setIsMeetingInviteActive(true);
          setActiveMeetingRoomId(meetingInvited.activeMeetingRoom!);
        } else {
          setIsMeetingInviteActive(false);
          setActiveMeetingRoomId(null);
        }

        if (activeInterview) {
          const synced = list.find(c => c.id === activeInterview.id);
          if (synced?.lastCommand?.type === 'STOP') finishInterview();
        }
      }
      const jobsDb = localStorage.getItem(JOBS_DB_KEY);
      if (jobsDb) setAvailableJobs(JSON.parse(jobsDb).filter((j: any) => j.status === 'OPEN'));
      
      const savedProfile = localStorage.getItem(`profile_${user.id}`);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfileForm(prev => ({ ...prev, ...parsed }));
      }

      const savedName = localStorage.getItem(`name_${user.id}`);
      if (savedName) setEditableName(savedName);
      
      const savedEmail = localStorage.getItem(`email_${user.id}`);
      if (savedEmail) setEditableEmail(savedEmail);

      const savedAlerts = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (savedAlerts) {
        const subs: JobAlertSubscription[] = JSON.parse(savedAlerts);
        const currentEmail = localStorage.getItem(`email_${user.id}`) || user.email;
        const mySub = subs.find(s => s.candidateEmail === currentEmail);
        if (mySub) {
          setAlertsActive(mySub.active);
          setProfileForm(prev => ({ ...prev, alertKeywords: mySub.keywords || [] }));
        }
      }
    };
    load();
    const interval = setInterval(load, 2500);
    return () => clearInterval(interval);
  }, [user.email, user.id, activeInterview?.id]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream, view]);

  const initStream = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      return s;
    } catch (e) {
      alert('Camera and Mic access required.');
      return null;
    }
  };

  const handleApply = (job: JobTemplate) => {
    const newCand: Candidate = {
      id: `cand-${Date.now()}`, 
      name: editableName, 
      email: editableEmail, 
      role: job.title,
      status: 'PENDING', 
      interviewDate: new Date().toISOString().split('T')[0], 
      profile: profileForm
    };
    const db = localStorage.getItem(CANDIDATE_DB_KEY);
    const list = db ? JSON.parse(db) : [];
    localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify([...list, newCand]));
    
    const jobsDb = localStorage.getItem(JOBS_DB_KEY);
    if (jobsDb) {
      const jobList: JobTemplate[] = JSON.parse(jobsDb);
      localStorage.setItem(JOBS_DB_KEY, JSON.stringify(jobList.map(j => j.id === job.id ? { ...j, applicantCount: (j.applicantCount || 0) + 1 } : j)));
    }
    setActiveTab('interviews');
  };

  const saveProfile = async () => {
    setIsSavingProfile(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Save identity overrides
    localStorage.setItem(`name_${user.id}`, editableName);
    localStorage.setItem(`email_${user.id}`, editableEmail);
    
    // Save profile data
    localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileForm));
    
    const savedAlerts = localStorage.getItem(ALERTS_STORAGE_KEY);
    let subs: JobAlertSubscription[] = savedAlerts ? JSON.parse(savedAlerts) : [];
    const subIndex = subs.findIndex(s => s.candidateEmail === editableEmail);
    
    const newSub: JobAlertSubscription = {
      id: subIndex >= 0 ? subs[subIndex].id : `sub-${Date.now()}`,
      candidateEmail: editableEmail,
      candidateName: editableName,
      keywords: profileForm.alertKeywords || [],
      active: alertsActive,
      createdAt: subIndex >= 0 ? subs[subIndex].createdAt : new Date().toISOString()
    };

    if (subIndex >= 0) subs[subIndex] = newSub;
    else subs.push(newSub);
    
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(subs));
    setIsSavingProfile(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress(p => {
        if (p === null || p >= 100) {
          clearInterval(interval);
          setProfileForm(prev => ({ ...prev, cvFileName: file.name, cvUploadDate: new Date().toISOString() }));
          setTimeout(() => setUploadProgress(null), 500);
          return 100;
        }
        return p + 15;
      });
    }, 200);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploadProgress(10);
    // Simulate reading file and setting image
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const interval = setInterval(() => {
        setImgUploadProgress(p => {
          if (p === null || p >= 100) {
            clearInterval(interval);
            setProfileForm(prev => ({ ...prev, imageUrl: dataUrl }));
            setTimeout(() => setImgUploadProgress(null), 500);
            return 100;
          }
          return p + 25;
        });
      }, 150);
    };
    reader.readAsDataURL(file);
  };

  const addSkill = () => {
    if (newSkill.trim() && !profileForm.skills.includes(newSkill.trim())) {
      setProfileForm(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const proceedToInterview = async () => {
    if (!activeInterview || !stream) return;
    setView('interview');
    setIsStarted(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
    outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          const processor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            if (!micActive) return;
            const data = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(data.length);
            for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
            sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
          };
          source.connect(processor);
          processor.connect(inputAudioContextRef.current!.destination);
          sessionPromise.then(s => s.send({ text: `Begin the interview for ${activeInterview.role}. The candidate is ${editableName}. Focus on their skills: ${profileForm.skills.join(', ')}.` }));
        },
        onmessage: async (msg: LiveServerMessage) => {
          const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContextRef.current) {
            const ctx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const buf = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buf.duration;
            audioSourcesRef.current.add(src);
          }
          if (msg.serverContent?.outputTranscription) {
            setIsAiTyping(true);
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'model') return [...prev.slice(0, -1), { role: 'model', text: last.text + msg.serverContent!.outputTranscription!.text }];
              return [...prev, { role: 'model', text: msg.serverContent!.outputTranscription!.text }];
            });
          }
          if (msg.serverContent?.turnComplete) setIsAiTyping(false);
        },
        onerror: (e: ErrorEvent) => console.error('Session error:', e),
        onclose: (e: CloseEvent) => console.log('Session closed:', e),
      },
      config: { responseModalities: [Modality.AUDIO], outputAudioTranscription: {}, systemInstruction: "You are Alex, a helpful AI recruiter." }
    });
    sessionRef.current = await sessionPromise;
  };

  const finishInterview = () => {
    sessionRef.current?.close();
    stream?.getTracks().forEach(t => t.stop());
    setView('portal');
  };

  const startPreparation = async (interview: Candidate) => {
    const s = await initStream();
    if (!s) return;
    setStream(s);
    setActiveInterview(interview);
    setView('preparation');
  };

  const joinMeeting = () => {
    alert(`Connecting to Zoom Bridge: ${activeMeetingRoomId}\nHiring Manager and observers have been notified of your presence.`);
    const db = localStorage.getItem(CANDIDATE_DB_KEY);
    if (db) {
       const list: Candidate[] = JSON.parse(db);
       const updated = list.map(c => c.email === editableEmail ? { ...c, meetingParticipants: [...(c.meetingParticipants || []), editableName] } : c);
       localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(updated));
    }
    setIsMeetingInviteActive(false);
  };

  if (view === 'preparation') return (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-slate-900 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl aspect-video relative">
          {cameraActive ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" /> : <div className="w-full h-full flex items-center justify-center text-slate-600"><CameraOff className="w-16 h-16"/></div>}
        </div>
        <div className="flex flex-col justify-between">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-2xl font-black text-slate-900 uppercase">Prepare for Session</h3>
              <p className="text-sm text-slate-500 font-medium">Alex is ready to evaluate your fit for the <span className="text-indigo-600 font-bold">{activeInterview?.role}</span> position.</p>
              <div className="flex gap-4">
                 <button onClick={() => setMicActive(!micActive)} className={`p-4 rounded-xl transition-all ${micActive ? 'bg-indigo-50 text-indigo-600' : 'bg-red-500 text-white'}`}><Mic /></button>
                 <button onClick={() => setCameraActive(!cameraActive)} className={`p-4 rounded-xl transition-all ${cameraActive ? 'bg-indigo-50 text-indigo-600' : 'bg-red-500 text-white'}`}><Camera /></button>
              </div>
           </div>
           <button onClick={proceedToInterview} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Launch AI Session</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="relative overflow-hidden bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl border-8 border-white">
        <div className="absolute top-0 right-0 p-12 opacity-5"><Zap className="w-48 h-48" /></div>
        <div className="flex items-center gap-6 relative z-10">
           {profileForm.imageUrl ? (
             <img src={profileForm.imageUrl} className="w-24 h-24 rounded-3xl object-cover border-4 border-white/20 shadow-xl" alt="Profile" />
           ) : (
             <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl">{editableName.charAt(0)}</div>
           )}
           <div>
              <h2 className="text-5xl font-black text-white tracking-tight">Portal Alpha, {editableName.split(' ')[0]}.</h2>
              <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" /> Identity Verified & Encrypted
              </p>
           </div>
        </div>
        <div className="flex gap-4 mt-10 relative z-10">
          {[{ id: 'jobs', label: 'Roles', icon: Briefcase }, { id: 'interviews', label: 'Pipeline', icon: PlayCircle }, { id: 'profile', label: 'Identity', icon: UserCircle2 }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-xl' : 'bg-white/5 text-white hover:bg-white/10'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'jobs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {availableJobs.map(job => (
            <div key={job.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col justify-between hover:shadow-xl transition-all group">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{job.title}</h4>
                  <span className="px-3 py-1 bg-slate-50 text-[8px] font-black text-slate-400 uppercase rounded-lg">New</span>
                </div>
                <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed">{job.description || "Leading-edge role for modern professionals."}</p>
              </div>
              <button onClick={() => handleApply(job)} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">Apply Now</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'interviews' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {candidateInterviews.map(i => (
            <div key={i.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 border-t-8 border-t-indigo-600 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-black text-slate-900 text-lg">{i.role}</h4>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${i.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>{i.status}</span>
              </div>
              {i.status !== 'COMPLETED' ? (
                <button onClick={() => startPreparation(i)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg">Start Screening</button>
              ) : (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3"><CheckCircle2 className="text-emerald-600" /><div><p className="text-[10px] font-black text-emerald-700 uppercase">Assessment Complete</p></div></div>
              )}
            </div>
          ))}
          {candidateInterviews.length === 0 && (
             <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                <PlayCircle className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">No active screening pipeline</p>
             </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-12 animate-in slide-in-from-bottom-4 duration-500">
           <div className="flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="flex items-center gap-6">
                  <div className="relative group/avatar">
                    {profileForm.imageUrl ? (
                      <img src={profileForm.imageUrl} className="w-20 h-20 rounded-[2rem] object-cover shadow-xl" alt="Avatar" />
                    ) : (
                      <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-indigo-600/20"><UserCircle2 className="w-10 h-10" /></div>
                    )}
                    <button 
                      onClick={() => imgInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all hover:scale-110"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input type="file" ref={imgInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    {imgUploadProgress !== null && (
                      <div className="absolute inset-0 bg-white/80 rounded-[2rem] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      Universal Profile <Edit3 className="w-5 h-5 text-slate-200" />
                    </h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">AI Credentials & Identity Management</p>
                  </div>
               </div>
               {saveSuccess && <div className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-2 animate-bounce"><Check className="w-4 h-4" /> Profile Synced</div>}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-7 space-y-10">
                 {/* Basic Identity Section */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><User className="w-3.5 h-3.5" /> Full Name</label>
                      <input 
                        type="text" 
                        value={editableName} 
                        onChange={e => setEditableName(e.target.value)} 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Work Email</label>
                      <input 
                        type="email" 
                        value={editableEmail} 
                        onChange={e => setEditableEmail(e.target.value)} 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Mobile Number</label>
                      <input 
                        type="tel" 
                        value={profileForm.mobile || ''} 
                        onChange={e => setProfileForm({...profileForm, mobile: e.target.value})} 
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Portfolio URL</label>
                      <input 
                        type="url" 
                        value={profileForm.portfolioUrl || ''} 
                        onChange={e => setProfileForm({...profileForm, portfolioUrl: e.target.value})} 
                        placeholder="https://portfolio.me"
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                      />
                    </div>
                 </div>

                 {/* Professional Details Section */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" /> Experience (Years)</label>
                       <input 
                        type="number" 
                        value={profileForm.experienceYears} 
                        onChange={e => setProfileForm({...profileForm, experienceYears: parseInt(e.target.value) || 0})} 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> Highest Education</label>
                       <input 
                        type="text" 
                        value={profileForm.education} 
                        onChange={e => setProfileForm({...profileForm, education: e.target.value})} 
                        placeholder="e.g. Master's in CS" 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                       />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Professional Skills (Press Enter to Add)</label>
                    <div className="flex gap-2 flex-wrap min-h-[60px] p-4 bg-slate-50 rounded-[1.5rem]">
                      {profileForm.skills.map(s => (
                        <span key={s} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-indigo-600/10 animate-in zoom-in-90">
                          {s}
                          <XIcon className="w-3 h-3 cursor-pointer hover:scale-125 transition-transform" onClick={() => setProfileForm({...profileForm, skills: profileForm.skills.filter(sk => sk !== s)})} />
                        </span>
                      ))}
                      <input 
                        type="text" 
                        value={newSkill} 
                        onChange={e => setNewSkill(e.target.value)} 
                        onKeyPress={e => e.key === 'Enter' && addSkill()} 
                        placeholder="Add skill..." 
                        className="bg-transparent border-none rounded-xl px-2 py-2 text-xs font-bold outline-none flex-1 min-w-[120px]" 
                      />
                    </div>
                 </div>

                 <div className="space-y-6 pt-6 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Upload className="w-3.5 h-3.5" /> Career Document (CV)</label>
                    <div className={`p-8 rounded-[2rem] border-4 border-dashed transition-all ${uploadProgress !== null ? 'bg-indigo-50 border-indigo-200' : profileForm.cvFileName ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                        {uploadProgress !== null ? (
                          <div className="space-y-4">
                            <p className="text-xs font-black text-indigo-600 uppercase">Analyzing Document... {uploadProgress}%</p>
                            <div className="w-full h-3 bg-indigo-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} /></div>
                          </div>
                        ) : profileForm.cvFileName ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4"><File className="w-8 h-8 text-emerald-600" /><div><p className="text-sm font-black text-slate-900">{profileForm.cvFileName}</p><p className="text-[9px] text-slate-400 uppercase">Last Synced: {new Date(profileForm.cvUploadDate!).toLocaleDateString()}</p></div></div>
                            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Replace</button>
                          </div>
                        ) : (
                          <div className="text-center py-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-400 uppercase">Upload PDF Resume for AI Extraction</p>
                          </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
                    </div>
                 </div>

                 <button onClick={saveProfile} disabled={isSavingProfile} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                    {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSavingProfile ? 'Synchronizing Intelligence...' : 'Finalize Profile Changes'}
                 </button>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-8">
                 <div className="bg-slate-900 p-10 rounded-[3rem] border-8 border-white shadow-2xl flex-1 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><FileText className="w-32 h-32" /></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                       <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Info className="w-5 h-5" /></div>
                       <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Executive Summary</h4>
                    </div>
                    <textarea 
                      value={profileForm.resumeSummary} 
                      onChange={e => setProfileForm({...profileForm, resumeSummary: e.target.value})} 
                      className="w-full flex-1 min-h-[400px] bg-white/5 border-none rounded-[1.5rem] p-6 text-sm font-medium leading-relaxed text-slate-300 outline-none focus:bg-white/10 transition-all shadow-inner" 
                      placeholder="Synthesize your professional narrative for AI review..." 
                    />
                 </div>
                 
                 <div className="bg-indigo-50 p-8 rounded-[3rem] border border-indigo-100 flex items-start gap-4">
                    <Sparkles className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
                    <p className="text-[10px] font-medium text-indigo-900 leading-relaxed uppercase tracking-tight">
                       This profile data is utilized by Alex during screening sessions to provide high-fidelity context for evaluation.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* FLOATING ZOOM INVITE - BOTTOM RIGHT */}
      {isMeetingInviteActive && (
        <div className="fixed bottom-6 right-6 w-80 bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 border-blue-500 z-[999] p-6 text-white animate-in slide-in-from-bottom-8">
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                 <VideoIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                 <h4 className="text-xs font-black uppercase tracking-widest text-blue-400">Zoom Call Invite</h4>
                 <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">Hiring Manager has initiated a direct Zoom bridge for your interview.</p>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => setIsMeetingInviteActive(false)}
                className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2"
              >
                 <PhoneOff className="w-3.5 h-3.5" /> Decline
              </button>
              <button 
                onClick={joinMeeting}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase transition-all shadow-lg flex items-center justify-center gap-2"
              >
                 <LogIn className="w-3.5 h-3.5" /> Join Bridge
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CandidatePanel;
