
import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, CameraOff, Mic, MicOff, Send, CheckCircle2, Video, Loader2, Star, 
  Target, Cpu, Download, AlertCircle, Radio, RotateCcw, Disc, StopCircle, 
  Briefcase, ChevronRight, UserCircle2, Headphones, Sparkles, History, Info, 
  User, MessageSquare, PlayCircle, ShieldCheck, LayoutGrid, Search, MapPin, 
  Clock as ClockIcon, Zap, ArrowRight, Bookmark, Building2, Pencil, Save, Plus, X as XIcon, GraduationCap, BriefcaseIcon, FileText, Settings, Heart, Upload, File
} from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { evaluateInterview } from '../services/geminiService';
import { JOB_TEMPLATES } from '../constants';
import { ChatMessage, InterviewEvaluation, User as UserType, Candidate, JobTemplate, CandidateProfile } from '../types';

const STORAGE_KEY = 'hirestream_interview_state';
const CANDIDATE_DB_KEY = 'hirestream_candidates_db';

// --- Base64 & Audio Helpers ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface CandidatePanelProps {
  user: UserType;
}

const CandidatePanel: React.FC<CandidatePanelProps> = ({ user }) => {
  const [view, setView] = useState<'portal' | 'interview'>('portal');
  const [activeTab, setActiveTab] = useState<'jobs' | 'interviews' | 'profile'>('jobs');
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [candidateInterviews, setCandidateInterviews] = useState<Candidate[]>([]);
  const [activeInterview, setActiveInterview] = useState<Candidate | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasResumeData, setHasResumeData] = useState(false);
  
  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Profile State
  const [profileForm, setProfileForm] = useState<CandidateProfile>({
    education: '',
    experienceYears: 0,
    resumeSummary: '',
    skills: []
  });
  const [newSkill, setNewSkill] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [uploadedResumeName, setUploadedResumeName] = useState<string | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // Transcription Buffers
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  const lastActiveTranscript = useRef('');

  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Video & Session Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persistence and candidate data
  useEffect(() => {
    loadCandidateData();
    
    // Restore interview state from localStorage
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.messages) setMessages(state.messages);
        // We always start at portal on initial load to give the user a choice, 
        // unless they click "Resume"
        if (state.activeInterview) {
          setActiveInterview(state.activeInterview);
          // If messages exist and it's not finished, show the resume button
          if (state.messages && state.messages.length > 0 && !state.isFinished) {
            setHasResumeData(true);
          }
        }
        if (state.isFinished) setIsFinished(state.isFinished);
        if (state.evaluation) setEvaluation(state.evaluation);
        if (state.feedbackSubmitted) setFeedbackSubmitted(state.feedbackSubmitted);
      } catch (e) {
        console.error("Failed to restore interview state", e);
      }
    }
  }, [user.email]);

  // Save state to localStorage on any change
  useEffect(() => {
    const stateToSave = {
      messages,
      view,
      activeTab,
      activeInterview,
      isFinished,
      evaluation,
      feedbackSubmitted
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    
    // Update hasResumeData based on state
    if (messages.length > 0 && activeInterview && !isFinished) {
      setHasResumeData(true);
    } else {
      setHasResumeData(false);
    }
  }, [messages, view, activeTab, activeInterview, isFinished, evaluation, feedbackSubmitted]);

  const loadCandidateData = () => {
    const db = localStorage.getItem(CANDIDATE_DB_KEY);
    if (db) {
      const candidates: Candidate[] = JSON.parse(db);
      const userInterviews = candidates.filter(c => c.email === user.email);
      setCandidateInterviews(userInterviews);
      
      // Load current profile from the first interview or set defaults
      if (userInterviews.length > 0 && userInterviews[0].profile) {
        setProfileForm(userInterviews[0].profile);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  // Self-view stream management
  useEffect(() => {
    const video = videoRef.current;
    if (isStarted && video && stream && cameraActive) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch(err => console.error("Error playing video:", err));
      }
    } else if (video && (!cameraActive || !isStarted)) {
      video.srcObject = null;
    }
  }, [isStarted, stream, cameraActive, view]);

  const initStream = async () => {
    try {
      // If there's an existing stream, try to reuse it or stop it
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      setStream(s);
      return s;
    } catch (err) {
      console.error("Media access denied", err);
      return null;
    }
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  }

  const connectToLiveAPI = async (micStream: MediaStream, systemPrompt: string, roleTitle: string, isResume: boolean = false) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
    outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = inputAudioContextRef.current!.createMediaStreamSource(micStream);
          const processor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            if (!micActive) return;
            const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
            sessionPromise.then(s => sessionRef.current && s.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(processor);
          processor.connect(inputAudioContextRef.current!.destination);
          
          sessionPromise.then(s => {
            if (isResume) {
              s.send({ text: `We are resuming an interview for ${roleTitle}. Here is the transcript so far: ${messages.map(m => m.text).join('\n')}. Please pick up where we left off.` });
            } else {
              s.send({ text: `Starting interview for ${roleTitle}. Introduce yourself as Alex and ask the first question.` });
            }
          });
        },
        onmessage: async (msg: LiveServerMessage) => {
          if (msg.serverContent?.inputTranscription) {
            currentInputTranscription.current += msg.serverContent.inputTranscription.text;
            lastActiveTranscript.current = currentInputTranscription.current;
          }
          if (msg.serverContent?.outputTranscription) {
            currentOutputTranscription.current += msg.serverContent.outputTranscription.text;
            lastActiveTranscript.current = currentOutputTranscription.current;
            setIsAiTyping(true);
          }
          if (msg.serverContent?.turnComplete) {
            if (currentInputTranscription.current) setMessages(p => [...p, { role: 'user', text: currentInputTranscription.current }]);
            if (currentOutputTranscription.current) setMessages(p => [...p, { role: 'model', text: currentOutputTranscription.current }]);
            currentInputTranscription.current = ''; 
            currentOutputTranscription.current = ''; 
            setIsAiTyping(false);
          }
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
            src.onended = () => audioSourcesRef.current.delete(src);
          }
          if (msg.serverContent?.interrupted) {
            audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
            audioSourcesRef.current.clear(); 
            nextStartTimeRef.current = 0; 
            setIsAiTyping(false);
          }
        }
      },
      config: { 
        responseModalities: [Modality.AUDIO], 
        inputAudioTranscription: {}, 
        outputAudioTranscription: {}, 
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }, 
        systemInstruction: systemPrompt 
      }
    });
    sessionRef.current = await sessionPromise;
  };

  const startInterview = async (interview: Candidate, isResume: boolean = false) => {
    const s = await initStream();
    if (!s) {
      alert("Please allow camera and microphone access to start.");
      return;
    }
    const template = JOB_TEMPLATES.find(t => t.title === interview.role) || JOB_TEMPLATES[0];
    setView('interview');
    setIsStarted(true);
    setActiveInterview(interview);
    await connectToLiveAPI(s, template.systemPrompt, template.title, isResume);
  };

  const finishInterview = async () => {
    if (!activeInterview) return;
    sessionRef.current?.close();
    stream?.getTracks().forEach(t => t.stop());
    setIsFinished(true); 
    setIsEvaluating(true);
    const transcriptText = messages.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`).join('\n\n');
    try {
      const result = await evaluateInterview(transcriptText);
      setEvaluation(result);
      const db = localStorage.getItem(CANDIDATE_DB_KEY);
      if (db) {
        const list: Candidate[] = JSON.parse(db);
        const updatedList = list.map(c => 
          c.id === activeInterview.id ? { ...c, status: 'COMPLETED', score: result.score, transcript: transcriptText } : c
        );
        localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(updatedList));
        loadCandidateData();
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsEvaluating(false); 
    }
  };

  const handleSendFeedback = () => {
    if (feedbackRating === 0) return;
    setFeedbackSubmitted(true);
    console.log("Feedback submitted:", { rating: feedbackRating, comments: feedbackComments });
  };

  const handleSend = () => {
    if (!inputText.trim() || !sessionRef.current) return;
    const text = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsAiTyping(true);
    sessionRef.current.send({ text });
  };

  const handleApply = (job: JobTemplate) => {
    const isAlreadyApplied = candidateInterviews.some(c => c.role === job.title);
    if (isAlreadyApplied) {
      alert("You have already applied for this position.");
      return;
    }

    const newCandidate: Candidate = {
      id: `cand-${Date.now()}`,
      name: user.name,
      email: user.email,
      role: job.title,
      status: 'PENDING',
      interviewDate: new Date().toISOString().split('T')[0],
      profile: profileForm 
    };

    const db = localStorage.getItem(CANDIDATE_DB_KEY);
    const list: Candidate[] = db ? JSON.parse(db) : [];
    const updatedList = [...list, newCandidate];
    localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(updatedList));
    loadCandidateData();
    setActiveTab('interviews');
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    await new Promise(r => setTimeout(r, 800));
    
    const db = localStorage.getItem(CANDIDATE_DB_KEY);
    if (db) {
      const list: Candidate[] = JSON.parse(db);
      const updatedList = list.map(c => 
        c.email === user.email ? { ...c, profile: profileForm } : c
      );
      localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(updatedList));
      loadCandidateData();
    }
    setIsSavingProfile(false);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !profileForm.skills.includes(newSkill.trim())) {
      setProfileForm({ ...profileForm, skills: [...profileForm.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setProfileForm({ ...profileForm, skills: profileForm.skills.filter(s => s !== skill) });
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    // Simulate upload progress
    await new Promise(r => setTimeout(r, 1500));
    setUploadedResumeName(file.name);
    setIsUploadingResume(false);
  };

  const clearInterviewState = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  const getJobImage = (title: string) => {
    const images: Record<string, string> = {
      'Senior Frontend Developer': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800',
      'Product Designer (UI/UX)': 'https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?auto=format&fit=crop&q=80&w=800'
    };
    return images[title] || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=800';
  };

  // --- Rendering ---

  if (view === 'interview') {
    if (isFinished) return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-700">
        <div className="bg-white p-12 rounded-[3rem] border border-slate-200 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-emerald-500" />
          <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Interview Successfully Completed</h2>
          <p className="text-slate-500 mb-10 font-medium max-w-lg mx-auto leading-relaxed">
            Your conversation has been securely processed. Our AI analysis is ready, and your hiring manager will be notified immediately.
          </p>
          
          {isEvaluating ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Generating Assessment Report...</p>
            </div>
          ) : evaluation && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 flex flex-col justify-center items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Interview Performance</span>
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray={364} strokeDashoffset={364 - (364 * evaluation.score) / 100}
                        className="text-indigo-600 transition-all duration-1000 ease-out" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-slate-900">{evaluation.score}</span>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm h-full">
                    <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" /> Key Strengths
                    </h4>
                    <div className="space-y-3">
                      {evaluation.keyStrengths.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex gap-3 text-sm text-slate-600 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Form */}
              <div className="border-t border-slate-100 pt-10 text-left">
                {!feedbackSubmitted ? (
                  <div className="bg-indigo-50/50 p-10 rounded-[2.5rem] border border-indigo-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                       <MessageSquare className="w-6 h-6 text-indigo-600" />
                       <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">How was Alex?</h4>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-8">We strive to make AI interviews as human and fair as possible. Tell us about your experience.</p>
                    
                    <div className="space-y-8">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience Rating</label>
                          <div className="flex gap-4">
                             {[1, 2, 3, 4, 5].map((star) => (
                                <button 
                                  key={star} 
                                  onClick={() => setFeedbackRating(star)}
                                  className={`transition-all ${feedbackRating >= star ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-indigo-200'}`}
                                >
                                   <Star className={`w-8 h-8 ${feedbackRating >= star ? 'fill-current' : ''}`} />
                                </button>
                             ))}
                          </div>
                       </div>
                       
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Comments</label>
                          <textarea 
                             value={feedbackComments}
                             onChange={(e) => setFeedbackComments(e.target.value)}
                             placeholder="Any thoughts on Alex's questions or the interview process?"
                             className="w-full h-32 bg-white border border-slate-100 rounded-3xl p-5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                       </div>

                       <button 
                         onClick={handleSendFeedback}
                         disabled={feedbackRating === 0}
                         className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:grayscale"
                       >
                          Submit Feedback
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 p-10 rounded-[2.5rem] border border-emerald-100 text-center animate-in zoom-in-95 duration-500">
                     <Heart className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-bounce" />
                     <h4 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Feedback Received!</h4>
                     <p className="text-sm text-emerald-700 font-medium mt-2">Thank you for helping us improve the HireStream experience.</p>
                  </div>
                )}
              </div>

              <div className="pt-6">
                <button onClick={clearInterviewState} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl">
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className="max-w-7xl mx-auto h-[calc(100vh-160px)] flex flex-col lg:flex-row gap-6 animate-in slide-in-from-bottom-8 duration-700">
        <div className="flex-1 flex flex-col gap-6 h-full">
          <div className="flex-1 bg-slate-900 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30">
              <div className={`relative transition-all duration-1000 ${isAiTyping ? 'scale-110' : 'scale-100'}`}>
                <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full animate-pulse" />
                <div className="relative w-40 h-40 rounded-full bg-slate-800 border-2 border-white/10 flex items-center justify-center overflow-hidden">
                  <div className={`absolute inset-0 bg-indigo-600/20 transition-opacity duration-500 ${isAiTyping ? 'opacity-100' : 'opacity-30'}`} />
                  <Cpu className={`w-16 h-16 text-indigo-400 relative z-10 ${isAiTyping ? 'animate-pulse' : ''}`} />
                  {isAiTyping && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-full border-4 border-indigo-500/30 rounded-full animate-ping" />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 text-center relative z-20">
                 <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 block">Voice Processing</span>
                 <h3 className="text-xl font-black text-white uppercase tracking-widest">Alex (AI Recruiter)</h3>
              </div>
            </div>
            
            {!isStarted && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center z-30 p-8 text-center">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-600/40 animate-bounce">
                  <Video className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Resume Session</h3>
                <p className="text-slate-300 text-sm font-medium mb-8 max-w-xs">You have an ongoing interview for <strong>{activeInterview?.role}</strong>. Ready to continue?</p>
                <button 
                  onClick={() => activeInterview && startInterview(activeInterview, true)}
                  className="px-12 py-5 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-50 transition-all active:scale-95"
                >
                  Join Live Room
                </button>
              </div>
            )}

            <div className="absolute top-6 right-6 w-52 h-36 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 bg-slate-800 group transition-all hover:scale-105">
              {cameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <CameraOff className="w-8 h-8 text-slate-600" />
                </div>
              )}
            </div>
            <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-white font-black uppercase tracking-widest">Encrypted Stream Active</span>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setMicActive(!micActive)} className={`p-4 rounded-2xl transition-all ${micActive ? 'bg-slate-100 text-slate-600' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}><Mic className="w-5 h-5"/></button>
              <button onClick={() => setCameraActive(!cameraActive)} className={`p-4 rounded-2xl transition-all ${cameraActive ? 'bg-slate-100 text-slate-600' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}><Camera className="w-5 h-5"/></button>
            </div>
            <button onClick={finishInterview} className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">End & Submit</button>
          </div>
        </div>
        <div className="w-full lg:w-[450px] bg-white rounded-[3rem] border border-slate-200 shadow-2xl flex flex-col overflow-hidden h-full">
          <div className="p-8 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20"><Headphones className="w-6 h-6" /></div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Transcription</h4>
              <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase tracking-widest">Real-time Enabled</p>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] px-5 py-4 rounded-[1.5rem] text-sm leading-relaxed font-medium shadow-sm border ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none border-indigo-600' : 'bg-white text-slate-700 rounded-bl-none border-slate-100'}`}>{m.text}</div>
              </div>
            ))}
            {isAiTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-50 px-5 py-4 rounded-[1.5rem] rounded-bl-none border border-slate-100 flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"/><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"/><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"/>
                </div>
              </div>
            )}
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <div className="flex gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
              <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Type a message instead..." className="flex-1 bg-transparent border-none px-4 py-3 text-sm font-medium outline-none" />
              <button onClick={handleSend} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20" disabled={!inputText.trim()}><Send className="w-5 h-5"/></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PORTAL VIEW
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Portal Header */}
      <div className="relative overflow-hidden bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl border-8 border-white group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -mr-48 -mt-48 animate-pulse" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Candidate Hub</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Hi, {user.name.split(' ')[0]}. <br />
                <span className="text-slate-400">Ready for your next big break?</span>
              </h2>
            </div>
            
            {hasResumeData && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2.5rem] flex flex-col items-center text-center max-w-sm animate-in zoom-in-95 duration-500 shadow-2xl">
                <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white mb-3">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest">Interview in Progress</h4>
                <p className="text-xs text-slate-400 font-medium mt-1 mb-4">You have an active session for <strong>{activeInterview?.role}</strong>.</p>
                <button 
                  onClick={() => setView('interview')}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 group/resume"
                >
                  Resume Interview <ArrowRight className="w-4 h-4 group-hover/resume:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mt-10">
            <button 
              onClick={() => setActiveTab('jobs')}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'jobs' ? 'bg-white text-slate-900 shadow-xl' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
              Explore Jobs
            </button>
            <button 
              onClick={() => setActiveTab('interviews')}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'interviews' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
              My Interviews ({candidateInterviews.length})
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
              My Profile
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'jobs' ? (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Open Positions</h3>
              <p className="text-slate-500 font-medium">Discover roles that match your background</p>
            </div>
            <div className="flex w-full md:w-auto gap-4">
               <div className="relative flex-1 md:w-64">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input type="text" placeholder="Search roles..." className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
               </div>
               <button className="bg-slate-900 text-white p-3 rounded-2xl"><LayoutGrid className="w-5 h-5"/></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {JOB_TEMPLATES.map((job) => (
              <div key={job.id} className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="relative h-64 overflow-hidden">
                  <img src={getJobImage(job.title)} alt={job.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Actively Hiring</span>
                    </div>
                    <h4 className="text-2xl font-black text-white leading-none">{job.title}</h4>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"><MapPin className="w-3 h-3" /> Remote</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"><ClockIcon className="w-3 h-3" /> Full-time</div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-3">{job.description}</p>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <button 
                      onClick={() => handleApply(job)}
                      className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      Apply Now <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'interviews' ? (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Active Interviews</h3>
              <p className="text-slate-500 font-medium">Monitor your status and prepare for sessions</p>
            </div>
          </div>
          {candidateInterviews.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-6" />
              <h4 className="text-xl font-black text-slate-900">No interviews found</h4>
              <p className="text-slate-500 max-w-xs mx-auto mt-2">Browse the job board to find a role and start your AI interview journey.</p>
              <button onClick={() => setActiveTab('jobs')} className="mt-8 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20">Go to Job Board</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {candidateInterviews.map((interview) => (
                <div key={interview.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Building2 className="w-6 h-6" /></div>
                      <div>
                        <h4 className="font-black text-slate-900 text-lg leading-none">{interview.role}</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Operations</span>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      interview.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 
                      interview.status === 'INTERVIEWING' ? 'bg-indigo-100 text-indigo-600 animate-pulse' :
                      interview.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-500'
                    }`}>{interview.status}</span>
                  </div>
                  <div className="space-y-4 mb-10 flex-1">
                    <div className="flex items-center gap-3 text-sm text-slate-600 font-medium"><ClockIcon className="w-4 h-4 text-slate-400" />Scheduled: {interview.interviewDate}</div>
                  </div>
                  {interview.status === 'PENDING' ? (
                    <button onClick={() => startInterview(interview)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"><PlayCircle className="w-5 h-5" /> Enter Interview Room</button>
                  ) : <div className="text-center py-5 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Under Review</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* MY PROFILE TAB */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Sidebar Info */}
           <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm text-center relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
                 <div className="w-32 h-32 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black mx-auto mb-6 shadow-2xl relative">
                    {user.name.charAt(0)}
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-white flex items-center justify-center text-white">
                       <CheckCircle2 className="w-5 h-5" />
                    </div>
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">{user.name}</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{user.email}</p>
                 
                 <div className="mt-10 pt-10 border-t border-slate-50 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                       <p className="text-xs font-black text-emerald-600 uppercase mt-1">Verified</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activity</p>
                       <p className="text-xs font-black text-slate-900 uppercase mt-1">Active</p>
                    </div>
                 </div>
              </div>

              <div className="bg-indigo-900 text-white p-8 rounded-[3rem] shadow-2xl shadow-indigo-900/20">
                 <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Smart Matching</h4>
                 </div>
                 <p className="text-xs text-indigo-100 font-medium leading-relaxed mb-6 opacity-80">
                    Complete your profile to help Alex (our AI recruiter) better understand your background and match you with more relevant roles.
                 </p>
                 <div className="space-y-3">
                    <div className="h-1.5 w-full bg-indigo-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, (profileForm.skills.length * 10) + (profileForm.education ? 20 : 0) + (profileForm.resumeSummary ? 30 : 0))}%` }} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Profile Completion</p>
                 </div>
              </div>
           </div>

           {/* Editor Panel */}
           <div className="lg:col-span-8 bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                       <Settings className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">Profile Details</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update your professional identity</p>
                    </div>
                 </div>
                 <button 
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                 >
                    {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                 </button>
              </div>

              <div className="p-10 space-y-10 overflow-y-auto">
                 {/* Education & Experience */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5" /> Highest Education
                       </label>
                       <input 
                          type="text" 
                          value={profileForm.education}
                          onChange={(e) => setProfileForm({ ...profileForm, education: e.target.value })}
                          placeholder="e.g. M.S. Computer Science"
                          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <BriefcaseIcon className="w-3.5 h-3.5" /> Years of Experience
                       </label>
                       <input 
                          type="number" 
                          value={profileForm.experienceYears}
                          onChange={(e) => setProfileForm({ ...profileForm, experienceYears: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                       />
                    </div>
                 </div>

                 {/* Professional Summary */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText className="w-3.5 h-3.5" /> Professional Summary
                    </label>
                    <textarea 
                       value={profileForm.resumeSummary}
                       onChange={(e) => setProfileForm({ ...profileForm, resumeSummary: e.target.value })}
                       placeholder="Write a brief summary of your expertise and goals..."
                       className="w-full h-40 bg-slate-50 border-none rounded-3xl px-6 py-5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all leading-relaxed"
                    />
                 </div>

                 {/* Resume Upload */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <File className="w-3.5 h-3.5" /> Resume / CV
                    </label>
                    <div 
                      className={`relative border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all cursor-pointer group ${
                        uploadedResumeName ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf,.doc,.docx" 
                        onChange={handleResumeUpload}
                      />
                      
                      {isUploadingResume ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Processing File...</p>
                        </div>
                      ) : uploadedResumeName ? (
                        <div className="flex flex-col items-center gap-3 animate-in zoom-in-95">
                          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-slate-900">{uploadedResumeName}</p>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Upload Successful</p>
                          </div>
                          <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors mt-2" onClick={(e) => {
                            e.stopPropagation();
                            setUploadedResumeName(null);
                          }}>Remove</button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 group-hover:scale-110 group-hover:text-indigo-500 transition-all mb-4">
                            <Upload className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-black text-slate-900">Upload your Resume</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">PDF, DOCX up to 10MB</p>
                        </>
                      )}
                    </div>
                 </div>

                 {/* Skills Editor */}
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Sparkles className="w-3.5 h-3.5" /> Core Competencies
                    </label>
                    <form onSubmit={handleAddSkill} className="flex gap-3">
                       <input 
                          type="text" 
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          placeholder="Add a skill (e.g. React, Docker...)"
                          className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                       />
                       <button 
                          type="submit"
                          className="bg-slate-900 text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                       >
                          <Plus className="w-4 h-4" /> Add
                       </button>
                    </form>
                    <div className="flex flex-wrap gap-2 pt-2">
                       {profileForm.skills.length === 0 && (
                          <p className="text-xs text-slate-300 italic font-medium py-4">No skills added yet.</p>
                       )}
                       {profileForm.skills.map((skill) => (
                          <div key={skill} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl border border-indigo-100 group transition-all hover:bg-indigo-100">
                             <span className="text-[10px] font-black uppercase tracking-widest">{skill}</span>
                             <button 
                                onClick={() => handleRemoveSkill(skill)}
                                className="text-indigo-300 hover:text-indigo-600 transition-colors"
                             >
                                <XIcon className="w-3 h-3" />
                             </button>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CandidatePanel;
