
import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Mic, MicOff, Send, MessageSquare, CheckCircle2, Video, Loader2, Star, Target, Lightbulb, User as UserIcon, Cpu, Download, AlertCircle, MessageCircle, Heart, Radio, RotateCcw, Disc, StopCircle, Briefcase, ChevronRight, UserCircle2, Headphones, Sparkles, Clock, Layout, PlayCircle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { evaluateInterview } from '../services/geminiService';
import { JOB_TEMPLATES } from '../constants';
import { ChatMessage, InterviewEvaluation, User } from '../types';

const STORAGE_KEY = 'hirestream_interview_state';

// Live API Helpers
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
  user: User;
}

const CandidatePanel: React.FC<CandidatePanelProps> = ({ user }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(JOB_TEMPLATES[0].id);
  
  // Transcription Buffers
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Recording State & Refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Advanced Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const audioMixerDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const activeTemplate = JOB_TEMPLATES.find(t => t.id === selectedTemplateId) || JOB_TEMPLATES[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = micActive;
      });
    }
  }, [micActive]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = cameraActive;
      });
    }
  }, [cameraActive]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn("Camera/Mic access denied or unavailable", err);
      setCameraActive(false);
      setMicActive(false);
      return null;
    }
  };

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  const startInterview = async () => {
    setIsStarted(true);
    setIsAiTyping(true);

    const micStream = await initCamera();
    if (!micStream) return;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    // Setup Audio Mixer for Recording
    audioMixerDestinationRef.current = outputAudioContextRef.current.createMediaStreamDestination();
    
    // Connect Candidate's mic to the mixer
    const micSource = outputAudioContextRef.current.createMediaStreamSource(micStream);
    micSource.connect(audioMixerDestinationRef.current);

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          console.debug('HireStream AI Live session connected');
          const source = inputAudioContextRef.current!.createMediaStreamSource(micStream);
          const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromise.then((session) => {
              if (sessionRef.current) {
                session.sendRealtimeInput({ media: pcmBlob });
              }
            });
          };
          
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current!.destination);
          
          sessionPromise.then(session => {
             session.send({ text: `Hello. I am alex. Start the interview for the ${activeTemplate.title} role. Introduce yourself and ask the first question.` });
          });
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            currentInputTranscription.current += message.serverContent.inputTranscription.text;
          }
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            setIsAiTyping(true);
          }

          if (message.serverContent?.turnComplete) {
            if (currentInputTranscription.current) {
              setMessages(prev => [...prev, { role: 'user', text: currentInputTranscription.current }]);
              currentInputTranscription.current = '';
            }
            if (currentOutputTranscription.current) {
              setMessages(prev => [...prev, { role: 'model', text: currentOutputTranscription.current }]);
              currentOutputTranscription.current = '';
              setIsAiTyping(false);
            }
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContextRef.current) {
            const ctx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            
            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            
            // Connect to speakers
            source.connect(ctx.destination);
            // Connect to recording mixer
            if (audioMixerDestinationRef.current) {
              source.connect(audioMixerDestinationRef.current);
            }

            source.addEventListener('ended', () => {
              audioSourcesRef.current.delete(source);
            });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
          }

          if (message.serverContent?.interrupted) {
            for (const source of audioSourcesRef.current) {
              try { source.stop(); } catch(e) {}
            }
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setIsAiTyping(false);
          }
        },
        onerror: (e) => console.error('Live API Error:', e),
        onclose: () => console.debug('Live session closed'),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        systemInstruction: activeTemplate.systemPrompt
      }
    });

    sessionRef.current = await sessionPromise;
  };

  const resetInterview = () => {
    if (window.confirm("Are you sure you want to restart? This will clear your current progress.")) {
      if (sessionRef.current) sessionRef.current.close();
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const startRecording = () => {
    if (!streamRef.current || !audioMixerDestinationRef.current) return;
    
    recordingChunksRef.current = [];
    setRecordingDuration(0);
    
    // Combine Candidate Video Track + Mixed Audio Track (Candidate Mic + AI Voice)
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const mixedAudioTrack = audioMixerDestinationRef.current.stream.getAudioTracks()[0];
    
    const combinedStream = new MediaStream([videoTrack, mixedAudioTrack]);
    
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordingChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
      setRecordingBlob(blob);
    };
    
    mediaRecorder.start(1000); // Collect data in 1s chunks
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    
    // Timer
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !sessionRef.current) return;
    const userMsg = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    sessionRef.current.send({ text: userMsg });
  };

  const downloadTranscript = () => {
    const transcriptText = messages
      .map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`)
      .join('\n\n');
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hirestream-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSessionRecording = () => {
    if (!recordingBlob) return;
    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hirestream-session-${new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const finishInterview = async () => {
    if (isRecording) stopRecording();
    if (sessionRef.current) sessionRef.current.close();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsFinished(true);
    setIsEvaluating(true);

    const transcript = messages
      .map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`)
      .join('\n\n');

    try {
      const result = await evaluateInterview(transcript);
      setEvaluation(result);
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCamera = () => setCameraActive(!cameraActive);
  const toggleMic = () => setMicActive(!micActive);

  if (isFinished) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 text-center shadow-xl shadow-slate-200/50">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Interview Completed!</h2>
          <p className="text-slate-500 mb-8">Your profile has been analyzed for the <span className="text-indigo-600 font-bold">{activeTemplate.title}</span> role.</p>

          {isEvaluating ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-slate-600 animate-pulse">Generating your performance report...</p>
            </div>
          ) : evaluation ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-left">
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-indigo-50 p-8 rounded-3xl flex flex-col items-center justify-center text-center">
                  <span className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-2">AI Score</span>
                  <span className="text-7xl font-black text-indigo-900 leading-none">{evaluation.score}</span>
                </div>
                
                {recordingBlob && (
                  <button 
                    onClick={downloadSessionRecording}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Video className="w-4 h-4" /> Download Video
                  </button>
                )}

                <div className="space-y-3">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Communication</span>
                      <p className="text-xs text-slate-700 font-medium">{evaluation.communicationSkills}</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cultural Fit</span>
                      <p className="text-xs text-slate-700 font-medium">{evaluation.culturalFit}</p>
                   </div>
                </div>
              </div>
              <div className="lg:col-span-3 space-y-8">
                <div>
                  <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-3 text-lg">
                    <Target className="w-5 h-5 text-indigo-500" />
                    Technical Proficiency
                  </h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-5 rounded-2xl border border-slate-100 italic">
                    "{evaluation.technicalProficiency}"
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                    <h5 className="flex items-center gap-2 text-sm font-bold text-emerald-700 uppercase tracking-wider mb-4">
                      <Star className="w-4 h-4 text-emerald-500" /> Strengths
                    </h5>
                    <ul className="space-y-3">
                      {evaluation.keyStrengths?.map((s, i) => (
                        <li key={i} className="text-sm text-slate-700 flex gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100">
                    <h5 className="flex items-center gap-2 text-sm font-bold text-amber-700 uppercase tracking-wider mb-4">
                      <AlertCircle className="w-4 h-4 text-amber-500" /> Gaps
                    </h5>
                    <ul className="space-y-3">
                      {evaluation.areasForImprovement?.map((item, i) => (
                        <li key={i} className="text-sm text-slate-700 flex gap-2">
                          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0 mt-2" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="p-6 bg-indigo-600 text-white rounded-3xl shadow-xl">
                  <p className="text-lg font-medium leading-relaxed">{evaluation.finalRecommendation}</p>
                </div>
                <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <button onClick={downloadTranscript} className="text-sm font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export Transcript
                  </button>
                  <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg">
                    Exit Workspace
                  </button>
                </div>
              </div>
            </div>
          ) : <div className="p-8 bg-red-50 text-red-600 rounded-2xl">Analysis failed.</div>}
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white p-10 md:p-14 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50" />
          
          <div className="relative text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-600/20 mb-6 text-white">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Select Your Interview</h2>
            <p className="text-slate-500 max-w-lg mx-auto leading-relaxed font-medium">
              Choose the position you are applying for to begin your real-time conversational screening with our AI recruiter.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {JOB_TEMPLATES.map((template, index) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                className={`group relative p-8 rounded-[2.5rem] border-2 text-left transition-all duration-500 animate-in slide-in-from-bottom-4 fill-mode-both`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 rounded-[2.5rem] transition-opacity duration-500 ${selectedTemplateId === template.id ? 'opacity-100 bg-indigo-50/40 ring-4 ring-indigo-600/20' : 'opacity-0'}`} />
                <div className={`relative flex flex-col h-full ${selectedTemplateId === template.id ? 'border-indigo-600' : ''}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      selectedTemplateId === template.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 rotate-3' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}>
                      <Briefcase className="w-7 h-7" />
                    </div>
                    {selectedTemplateId === template.id && (
                      <div className="bg-indigo-600 text-white p-1.5 rounded-full shadow-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  
                  <h4 className={`font-black text-xl mb-2 transition-colors duration-300 ${selectedTemplateId === template.id ? 'text-indigo-950' : 'text-slate-900'}`}>
                    {template.title}
                  </h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">15 Mins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Voice</span>
                    </div>
                  </div>
                </div>
                {selectedTemplateId === template.id && (
                  <div className="absolute -top-3 -right-3">
                     <div className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-xl uppercase tracking-[0.2em] border-2 border-white">
                       Active
                     </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-10 border-t border-slate-100">
            <div className="flex items-center gap-6 px-8 py-5 bg-slate-50/80 rounded-[2rem] border border-slate-200/60 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-xs text-slate-600 font-black uppercase tracking-widest">Microphone Ready</span>
              </div>
              <div className="w-px h-5 bg-slate-200" />
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-xs text-slate-600 font-black uppercase tracking-widest">Camera Ready</span>
              </div>
            </div>

            <button 
              onClick={startInterview} 
              className="px-12 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all active:scale-95 shadow-2xl shadow-indigo-600/30 w-full sm:w-auto flex items-center justify-center gap-4 group"
            >
              Begin Interview
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)]">
      <div className="lg:col-span-7 flex flex-col gap-4 h-full">
        <div className="relative flex-1 bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl border-[6px] border-white/5">
          {/* Main View: AI Interviewer Presence */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/20">
            <div className="relative">
              <div className={`absolute -inset-8 bg-indigo-500/10 rounded-full blur-2xl transition-all duration-1000 ${isAiTyping ? 'scale-150 opacity-60' : 'scale-100 opacity-20'}`} />
              <div className={`relative w-48 h-48 rounded-full bg-slate-900 flex items-center justify-center border-4 border-white/5 shadow-2xl transition-transform duration-500 ${isAiTyping ? 'scale-105' : 'scale-100'}`}>
                <div className={`w-40 h-40 rounded-full flex items-center justify-center bg-indigo-600/10 border-2 border-indigo-500/20 overflow-hidden`}>
                   <div className="relative flex flex-col items-center justify-center">
                     <UserCircle2 className="w-24 h-24 text-indigo-400/30 absolute" />
                     <Cpu className={`w-14 h-14 text-indigo-400 ${isAiTyping ? 'animate-pulse' : ''}`} />
                   </div>
                </div>
                {isAiTyping && (
                  <div className="absolute bottom-2 flex gap-1 items-center justify-center">
                    <span className="w-1.5 h-4 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-7 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-4 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-10">
              <h3 className="text-2xl font-black text-white tracking-tight uppercase">HIRESTREAM AI</h3>
              <p className="text-indigo-400 text-sm font-bold uppercase tracking-[0.2em] mt-2">Principal Recruiter</p>
            </div>
            
            <div className="absolute top-8 left-8 flex flex-col gap-3 items-start">
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                  <div className="absolute inset-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                </div>
                <span className="text-[10px] text-white font-black uppercase tracking-widest">Live Audio-Link</span>
              </div>
              <div className="flex items-center gap-2.5 bg-indigo-600/20 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg">
                <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                <span className="text-[10px] text-white font-black uppercase tracking-widest">Role: {activeTemplate.title}</span>
              </div>
            </div>

            {isRecording && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-red-600 px-5 py-2 rounded-full shadow-2xl animate-in slide-in-from-top-4">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                <span className="text-[11px] text-white font-black uppercase tracking-[0.2em]">Recording Session: {formatDuration(recordingDuration)}</span>
              </div>
            )}
          </div>

          {/* PIP View: Candidate Feed - Refined Layout */}
          <div className="absolute bottom-6 right-6 w-48 h-36 sm:w-64 sm:h-48 rounded-[2rem] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-[3px] border-white/15 bg-slate-900 z-20 group transition-all hover:scale-[1.02] hover:border-white/25">
            {cameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                <CameraOff className="w-10 h-10 mb-2 opacity-50" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Video Paused</span>
              </div>
            )}
            
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                <span className="text-[8px] text-white font-black uppercase tracking-widest">{user.name}</span>
              </div>
              {!micActive && (
                <div className="bg-red-500/80 backdrop-blur-md p-1 rounded-lg text-white">
                  <MicOff className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>

          {/* Immersive Floating Controls */}
          <div className="absolute bottom-8 left-8 flex items-center space-x-3 bg-slate-900/60 backdrop-blur-2xl p-2 rounded-3xl border border-white/10 shadow-2xl z-10">
            <button onClick={toggleMic} className={`p-4 rounded-2xl transition-all ${micActive ? 'text-white hover:bg-white/10' : 'bg-red-500 text-white shadow-xl shadow-red-500/40'}`}>
              {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button onClick={toggleCamera} className={`p-4 rounded-2xl transition-all ${cameraActive ? 'text-white hover:bg-white/10' : 'bg-red-500 text-white shadow-xl shadow-red-500/40'}`}>
              {cameraActive ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>
            <div className="w-px h-8 bg-white/10 mx-2" />
            
            <button 
              onClick={isRecording ? stopRecording : startRecording} 
              className={`p-4 rounded-2xl transition-all ${isRecording ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
              title={isRecording ? "Stop Video Recording" : "Start Full Session Recording"}
            >
              {isRecording ? <StopCircle className="w-5 h-5" /> : <Disc className="w-5 h-5" />}
            </button>
            
            <button onClick={resetInterview} className="p-4 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all" title="Restart Session"><RotateCcw className="w-5 h-5" /></button>
            <button onClick={finishInterview} className="px-6 py-4 bg-white/5 hover:bg-red-500/10 text-white hover:text-red-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Finish Session</button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm tracking-tight uppercase">Live Transcription</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse`} />
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Processing audio...</p>
              </div>
            </div>
          </div>
          <button onClick={downloadTranscript} className="p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-200 transition-all shadow-sm">
            <Download className="w-5 h-5" />
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth bg-slate-50/30">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {isAiTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 p-5 rounded-3xl rounded-bl-none flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
        <div className="p-6 bg-white border-t border-slate-100">
          <div className="flex space-x-3">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Speak or type your response..."
              className="flex-1 bg-slate-100 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
            <button onClick={handleSend} className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30"><Send className="w-6 h-6" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatePanel;
