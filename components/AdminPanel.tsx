
import React, { useState, useEffect } from 'react';
import { 
  Settings, Plus, Save, Terminal, ExternalLink, X, Trash2, LayoutList, PieChart, 
  FileText, BarChart3, Users, Bell, Mail, Search, CheckCircle2, History, 
  AlertCircle, Play, Pause, Clock
} from 'lucide-react';
import { JOB_TEMPLATES as INITIAL_TEMPLATES } from '../constants';
import { JobTemplate, Candidate, JobAlertSubscription, JobAlertLog } from '../types';
import ReportingSystem from './ReportingSystem';

const ALERTS_STORAGE_KEY = 'hirestream_job_alerts';
const ALERTS_LOG_KEY = 'hirestream_job_alerts_log';

const AdminPanel: React.FC = () => {
  const [activeView, setActiveView] = useState<'templates' | 'reports' | 'alerts'>('templates');
  const [templates, setTemplates] = useState<JobTemplate[]>(INITIAL_TEMPLATES);
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.your-instance.com/webhook/recruit-sync');
  const [isAdding, setIsAdding] = useState(false);
  
  // Alerts State
  const [subscriptions, setSubscriptions] = useState<JobAlertSubscription[]>([]);
  const [alertLogs, setAlertLogs] = useState<JobAlertLog[]>([]);

  // New Template Form State
  const [newTemplate, setNewTemplate] = useState<Omit<JobTemplate, 'id'>>({
    title: '',
    description: '',
    systemPrompt: '',
    questions: [''],
    requirements: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load subscriptions and logs
    const savedSubs = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (savedSubs) setSubscriptions(JSON.parse(savedSubs));
    
    const savedLogs = localStorage.getItem(ALERTS_LOG_KEY);
    if (savedLogs) setAlertLogs(JSON.parse(savedLogs));
  }, []);

  const handleSaveSub = (updatedSubs: JobAlertSubscription[]) => {
    setSubscriptions(updatedSubs);
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updatedSubs));
  };

  const handleRemoveSub = (id: string) => {
    handleSaveSub(subscriptions.filter(s => s.id !== id));
  };

  const handleToggleSubStatus = (id: string) => {
    const updated = subscriptions.map(s => 
      s.id === id ? { ...s, active: !s.active } : s
    );
    handleSaveSub(updated);
  };

  const handleClearLogs = () => {
    setAlertLogs([]);
    localStorage.removeItem(ALERTS_LOG_KEY);
  };

  const handleAddQuestion = () => {
    setNewTemplate(prev => ({ ...prev, questions: [...prev.questions, ''] }));
  };

  const handleRemoveQuestion = (index: number) => {
    setNewTemplate(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleQuestionChange = (index: number, value: string) => {
    const updatedQuestions = [...newTemplate.questions];
    updatedQuestions[index] = value;
    setNewTemplate(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!newTemplate.title.trim()) newErrors.title = 'Title is required';
    if (!newTemplate.description.trim()) newErrors.description = 'Description is required';
    if (!newTemplate.systemPrompt.trim()) newErrors.systemPrompt = 'System prompt is required';
    if (newTemplate.questions.some(q => !q.trim())) newErrors.questions = 'All questions must be filled';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const triggerAlerts = (job: JobTemplate) => {
    const newLogs: JobAlertLog[] = [];
    subscriptions.forEach(sub => {
      if (!sub.active) return;
      
      const matchedKeyword = sub.keywords.find(kw => 
        job.title.toLowerCase().includes(kw.toLowerCase()) || 
        job.description.toLowerCase().includes(kw.toLowerCase())
      );

      if (matchedKeyword) {
        newLogs.push({
          id: `log-${Date.now()}-${sub.id}`,
          candidateEmail: sub.candidateEmail,
          jobTitle: job.title,
          matchKeyword: matchedKeyword,
          sentAt: new Date().toISOString()
        });
      }
    });

    if (newLogs.length > 0) {
      const updatedLogs = [...newLogs, ...alertLogs].slice(0, 50); // Keep last 50
      setAlertLogs(updatedLogs);
      localStorage.setItem(ALERTS_LOG_KEY, JSON.stringify(updatedLogs));
    }
  };

  const handleSave = () => {
    if (!validate()) return;

    const template: JobTemplate = {
      ...newTemplate,
      id: `tmpl-${Date.now()}`
    };

    setTemplates(prev => [...prev, template]);
    setIsAdding(false);
    setNewTemplate({ title: '', description: '', systemPrompt: '', questions: [''], requirements: [] });
    
    // Simulate Alert Notifications
    triggerAlerts(template);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Administration</h2>
          <p className="text-slate-500 font-medium">Manage recruitment logic and system intelligence</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          {[
            { id: 'templates', label: 'Templates', icon: LayoutList },
            { id: 'reports', label: 'Reports Hub', icon: BarChart3 },
            { id: 'alerts', label: 'Job Alerts', icon: Bell }
          ].map(view => (
            <button 
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === view.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <view.icon className="w-3.5 h-3.5" />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'reports' && <ReportingSystem />}

      {activeView === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Alert Subscriptions</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage candidate notification preferences</p>
                </div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{subscriptions.length} Candidates</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                      <th className="px-8 py-4">Candidate</th>
                      <th className="px-8 py-4">Keywords</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No active alert subscriptions</p>
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-6">
                            <div>
                              <p className="font-black text-slate-900 text-sm">{sub.candidateName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{sub.candidateEmail}</p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-wrap gap-2">
                              {sub.keywords.map(kw => (
                                <span key={kw} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded-md border border-indigo-100">{kw}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${sub.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                              <div className={`w-1 h-1 rounded-full ${sub.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {sub.active ? 'Active' : 'Paused'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleToggleSubStatus(sub.id)}
                                className={`p-2 rounded-xl transition-all ${sub.active ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                title={sub.active ? "Pause Subscription" : "Resume Subscription"}
                              >
                                {sub.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => handleRemoveSub(sub.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Remove Subscription"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[600px]">
               <div className="absolute top-0 right-0 p-8 opacity-5"><Mail className="w-32 h-32" /></div>
               <div className="relative z-10 flex flex-col h-full">
                 <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                       <History className="w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="text-sm font-black uppercase tracking-widest">Trigger History</h3>
                       <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Real-time alert tracking</p>
                     </div>
                   </div>
                   {alertLogs.length > 0 && (
                     <button onClick={handleClearLogs} className="p-2 hover:bg-white/10 rounded-lg text-slate-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   )}
                 </div>
                 
                 <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[500px] scrollbar-hide">
                    {alertLogs.length === 0 ? (
                      <div className="py-20 text-center opacity-40">
                         <Mail className="w-10 h-10 mx-auto mb-4 text-slate-600" />
                         <p className="text-[10px] font-black uppercase tracking-[0.2em]">No alerts triggered yet</p>
                      </div>
                    ) : (
                      alertLogs.map(log => (
                        <div key={log.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl space-y-3 group hover:bg-white/10 transition-all">
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                               <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Notification Sent</p>
                             </div>
                             <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1">
                               <Clock className="w-2.5 h-2.5" />
                               {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </div>
                          <div>
                            <p className="text-xs font-black text-white leading-tight mb-1">New Match: {log.jobTitle}</p>
                            <p className="text-[10px] text-slate-400 font-medium">To: {log.candidateEmail}</p>
                          </div>
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-1.5">
                               <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Match Reason:</span>
                               <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[8px] font-black uppercase rounded border border-indigo-500/30">
                                 {log.matchKeyword}
                               </span>
                             </div>
                             <ExternalLink className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                          </div>
                        </div>
                      ))
                    )}
                 </div>
                 
                 <div className="mt-6 pt-6 border-t border-white/5">
                   <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-4 flex items-center gap-3">
                     <AlertCircle className="w-5 h-5 text-indigo-400" />
                     <p className="text-[9px] font-medium text-indigo-200 leading-relaxed">
                       System matches new job templates against all active candidate keywords in real-time.
                     </p>
                   </div>
                 </div>
               </div>
            </section>
          </div>
        </div>
      )}

      {activeView === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {isAdding ? (
              <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">New Interview Template</h3>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Job Title</label>
                    <input 
                      type="text"
                      value={newTemplate.title}
                      onChange={e => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                      placeholder="e.g. Senior Backend Engineer"
                    />
                    {errors.title && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Job Description</label>
                    <textarea 
                      value={newTemplate.description}
                      onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full h-24 p-4 bg-slate-50 border-none rounded-2xl outline-none text-sm transition-all focus:ring-2 focus:ring-indigo-500"
                      placeholder="Briefly describe the role..."
                    />
                    {errors.description && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Instructions for AI Agent</label>
                    <textarea 
                      value={newTemplate.systemPrompt}
                      onChange={e => setNewTemplate(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      className="w-full h-32 p-4 bg-slate-50 border-none rounded-2xl outline-none text-sm font-mono transition-all focus:ring-2 focus:ring-indigo-500"
                      placeholder="You are an expert technical recruiter..."
                    />
                    {errors.systemPrompt && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.systemPrompt}</p>}
                  </div>

                  <div className="pt-6 flex gap-3">
                    <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 uppercase text-xs tracking-[0.2em]">Save Template & Notify</button>
                    <button onClick={() => setIsAdding(false)} className="px-10 bg-slate-100 text-slate-600 font-black py-5 rounded-2xl hover:bg-slate-200 transition-all uppercase text-xs tracking-widest">Cancel</button>
                  </div>
                </div>
              </section>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center group border-dashed hover:border-indigo-300 transition-all cursor-pointer" onClick={() => setIsAdding(true)}>
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">Add New Role Template</h4>
                  <p className="text-slate-400 text-xs mt-1 font-medium">Define custom questions and AI personality for new job openings.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {templates.map(tmpl => (
                    <div key={tmpl.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:shadow-xl transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white"><LayoutList className="w-5 h-5" /></div>
                        <Settings className="w-4 h-4 text-slate-300 hover:text-indigo-600 cursor-pointer" />
                      </div>
                      <h4 className="font-black text-slate-900 text-lg leading-tight mb-2">{tmpl.title}</h4>
                      <p className="text-xs text-slate-400 font-medium mb-6 line-clamp-2">{tmpl.description}</p>
                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{tmpl.questions.length} Questions</span>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">v1.2</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><Terminal className="w-32 h-32" /></div>
              <div className="relative z-10">
                <h3 className="text-lg font-black uppercase tracking-widest mb-4">Integrations</h3>
                <p className="text-slate-400 text-xs font-medium mb-8 leading-relaxed">Connect your recruitment data with Google Sheets or n8n webhooks.</p>
                <div className="space-y-4">
                  <input 
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[10px] font-mono text-emerald-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button className="w-full py-4 bg-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20">Update Sync</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
