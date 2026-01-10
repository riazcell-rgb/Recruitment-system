
import React, { useState, useEffect } from 'react';
import { 
  Award, Brain, Radio, MessageSquare, Zap, Cpu, Sparkles, ChevronRight, 
  Monitor, Signal, History, Target, ShieldCheck, Play, ArrowRight, 
  Info, Search, Filter, Volume2, Star, UserCheck2, Loader2, Plus, Send, DoorOpen, LogIn
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Candidate, LiveCommand } from '../types';

const CANDIDATE_DB_KEY = 'hirestream_candidates_db';
const BOARD_MEMBER_NAME = 'Marcus Board Member';

const BoardMemberPanel: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeTab, setActiveTab] = useState<'invites' | 'lab' | 'insights'>('invites');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  
  // Question Lab State
  const [labTopic, setLabTopic] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPushing, setIsPushing] = useState<number | null>(null);

  useEffect(() => {
    const load = () => {
      const saved = localStorage.getItem(CANDIDATE_DB_KEY);
      if (saved) setCandidates(JSON.parse(saved));
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  const liveSessions = candidates.filter(c => 
    c.status === 'INTERVIEWING' || (c.requestedBoardMembers && c.requestedBoardMembers.length > 0)
  );

  const requestAdmission = (candidate: Candidate) => {
    const currentRequested = candidate.requestedBoardMembers || [];
    const isAlreadyRequested = currentRequested.includes(BOARD_MEMBER_NAME);
    const isAdmitted = (candidate.boardMembers || []).includes(BOARD_MEMBER_NAME);
    
    if (isAdmitted) {
      alert("You already have room clearance.");
      return;
    }
    if (isAlreadyRequested) {
      alert("Admission request pending authorization.");
      return;
    }

    const updated: Candidate = {
      ...candidate,
      requestedBoardMembers: [...currentRequested, BOARD_MEMBER_NAME]
    };
    
    const newList = candidates.map(c => c.id === updated.id ? updated : c);
    setCandidates(newList);
    localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(newList));
  };

  const leaveSession = (candidate: Candidate) => {
    const updated: Candidate = {
      ...candidate,
      boardMembers: (candidate.boardMembers || []).filter(m => m !== BOARD_MEMBER_NAME)
    };
    const newList = candidates.map(c => c.id === updated.id ? updated : c);
    setCandidates(newList);
    localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(newList));
  };

  const generateSmartQuestions = async () => {
    if (!labTopic.trim()) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Elite board member questions for: ${labTopic}. Tricky and senior level.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      });
      setGeneratedQuestions(JSON.parse(response.text || '[]'));
    } catch (e) {
      setGeneratedQuestions(['Advanced scaling strategy?', 'Deep architectural trade-offs?', 'Pivot decision logic?']);
    } finally {
      setIsGenerating(false);
    }
  };

  const pushToAgent = (question: string, index: number) => {
    if (!selectedCandidate || selectedCandidate.status !== 'INTERVIEWING') return;
    setIsPushing(index);
    const updated: Candidate = {
      ...selectedCandidate,
      lastCommand: { type: 'PUSH_PROMPT', payload: `[BOARD]: ${question}`, timestamp: new Date().toISOString() }
    };
    const newList = candidates.map(c => c.id === updated.id ? updated : c);
    localStorage.setItem(CANDIDATE_DB_KEY, JSON.stringify(newList));
    setTimeout(() => setIsPushing(null), 1500);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Intelligence Hub</h2>
          <p className="text-slate-500 font-medium mt-2">Board oversight and protocol management</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
           {[{ id: 'invites', label: 'Sessions', icon: Radio }, { id: 'lab', label: 'Lab', icon: Brain }, { id: 'insights', label: 'Deck', icon: Target }].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}>
               <tab.icon className="w-3.5 h-3.5" /> {tab.label}
             </button>
           ))}
        </div>
      </div>

      {activeTab === 'invites' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                 <h3 className="text-sm font-black text-slate-900 uppercase">Channels</h3>
              </div>
              <div className="p-8 space-y-6">
                 {liveSessions.map(c => {
                   const isAdmitted = (c.boardMembers || []).includes(BOARD_MEMBER_NAME);
                   const isRequested = (c.requestedBoardMembers || []).includes(BOARD_MEMBER_NAME);
                   return (
                     <div key={c.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                           <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 text-white flex items-center justify-center text-2xl font-black">{c.name.charAt(0)}</div>
                           <div>
                              <h4 className="text-lg font-black text-slate-900">{c.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{c.role}</p>
                           </div>
                        </div>
                        <div className="flex gap-3">
                           {isAdmitted ? (
                             <button onClick={() => leaveSession(c)} className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase">Leave Room</button>
                           ) : (
                             <button onClick={() => requestAdmission(c)} disabled={isRequested} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all ${isRequested ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                {isRequested ? 'Awaiting...' : 'Request Admission'}
                             </button>
                           )}
                        </div>
                     </div>
                   );
                 })}
                 {liveSessions.length === 0 && <div className="text-center py-20 grayscale opacity-40"><ShieldCheck className="w-16 h-16 mx-auto mb-4" /><p className="text-xs font-black uppercase text-slate-400">No active streams</p></div>}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'lab' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Topic</label>
                 <input type="text" value={labTopic} onChange={(e) => setLabTopic(e.target.value)} placeholder="Subject..." className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
              </div>
              <button onClick={generateSmartQuestions} disabled={isGenerating || !labTopic.trim()} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-3">
                 {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                 {isGenerating ? 'Synthesizing...' : 'Generate Questions'}
              </button>
           </div>
           <div className="lg:col-span-8 space-y-6">
              {generatedQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm border-l-8 border-l-indigo-600">
                   <p className="text-lg font-black text-slate-900 leading-relaxed italic mb-6">"{q}"</p>
                   <button onClick={() => pushToAgent(q, idx)} disabled={isPushing !== null} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isPushing === idx ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white shadow-lg'}`}>
                      {isPushing === idx ? 'Sent' : 'Push to Live Session'}
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {candidates.map(c => (
             <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all relative">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-6">{c.name.charAt(0)}</div>
                <h4 className="font-black text-slate-900 text-lg">{c.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">{c.role}</p>
                <div className="flex items-center gap-2 text-indigo-600"><Star className="w-4 h-4 fill-current" /><span className="text-xs font-black">{c.matchScore || 0}% Fit</span></div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default BoardMemberPanel;
