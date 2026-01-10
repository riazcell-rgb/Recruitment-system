
import React, { useState, useEffect } from 'react';
import { 
  Plus, Save, X, Trash2, LayoutList, BarChart3, 
  Sliders, Cpu, Loader2, Terminal, PlusCircle, CheckCircle2, AlertCircle,
  Bell, History, Mail, UserCheck, RefreshCcw, Send, Copy, ShieldAlert,
  Radio, Zap, ListChecks
} from 'lucide-react';
import { JobTemplate, Candidate, JobAlertSubscription, JobAlertLog } from '../types';
import ReportingSystem from './ReportingSystem';
import { processJobAlerts, sendEmailNotification } from '../services/notificationService';

const ALERTS_STORAGE_KEY = 'hirestream_job_alerts';
const ALERTS_LOG_KEY = 'hirestream_job_alerts_log';
const CANDIDATE_DB_KEY = 'hirestream_candidates_db';
const JOBS_DB_KEY = 'hirestream_jobs_db';

const AdminPanel: React.FC = () => {
  const [activeView, setActiveView] = useState<'templates' | 'reports' | 'alerts'>('templates');
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [alertLogs, setAlertLogs] = useState<JobAlertLog[]>([]);
  const [subscriptions, setSubscriptions] = useState<JobAlertSubscription[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.your-instance.com/webhook/recruit-sync');
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessingAlerts, setIsProcessingAlerts] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  
  // New Template Form State
  const [newTemplate, setNewTemplate] = useState<Omit<JobTemplate, 'id' | 'createdAt'>>({
    title: '',
    description: '',
    systemPrompt: '',
    questions: ['', '', ''],
    requirements: [],
    minExperience: 1,
    requiredSkills: [],
    educationRequirement: '',
    status: 'OPEN'
  });
  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = () => {
      const savedJobs = localStorage.getItem(JOBS_DB_KEY);
      if (savedJobs) setTemplates(JSON.parse(savedJobs));
      
      const savedCandidates = localStorage.getItem(CANDIDATE_DB_KEY);
      if (savedCandidates) setCandidates(JSON.parse(savedCandidates));

      const savedLogs = localStorage.getItem(ALERTS_LOG_KEY);
      if (savedLogs) setAlertLogs(JSON.parse(savedLogs));

      const savedSubs = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (savedSubs) setSubscriptions(JSON.parse(savedSubs));
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [activeView]);

  const saveTemplates = (newJobs: JobTemplate[]) => {
    setTemplates(newJobs);
    localStorage.setItem(JOBS_DB_KEY, JSON.stringify(newJobs));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newTemplate.title.trim() || newTemplate.title.length < 5) newErrors.title = 'Title must be at least 5 characters.';
    if (!newTemplate.description.trim() || newTemplate.description.length < 30) newErrors.description = 'Provide a detailed description (min 30 chars).';
    if (!newTemplate.systemPrompt.trim() || newTemplate.systemPrompt.length < 50) newErrors.systemPrompt = 'AI core instructions are too brief (min 50 chars).';
    if (newTemplate.minExperience < 0) newErrors.minExperience = 'Experience cannot be negative.';
    if (!newTemplate.educationRequirement.trim()) newErrors.educationRequirement = 'Education requirement is mandatory.';
    if (newTemplate.requiredSkills.length === 0) newErrors.requiredSkills = 'At least one skill is required.';
    if (newTemplate.requirements.length === 0) newErrors.requirements = 'At least one job requirement is required.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const template: JobTemplate = {
      ...newTemplate,
      id: `tmpl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      applicantCount: 0,
      questions: newTemplate.questions.filter(q => q.trim() !== ''),
      requirements: newTemplate.requirements.filter(r => r.trim() !== '')
    } as JobTemplate;
    const updatedTemplates = [...templates, template];
    saveTemplates(updatedTemplates);
    setIsProcessingAlerts(true);
    await processJobAlerts(template);
    setIsProcessingAlerts(false);
    setIsAdding(false);
    setNewTemplate({ 
      title: '', description: '', systemPrompt: '', questions: ['', '', ''], requirements: [],
      minExperience: 1, requiredSkills: [], educationRequirement: '', status: 'OPEN'
    });
    setErrors({});
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('Archive this vacancy template?')) {
      const updated = templates.filter(t => t.id !== id);
      saveTemplates(updated);
    }
  };

  const handleClone = (tmpl: JobTemplate) => {
    setNewTemplate({
      title: `${tmpl.title} (Clone)`,
      description: tmpl.description,
      systemPrompt: tmpl.systemPrompt,
      questions: [...tmpl.questions],
      requirements: [...tmpl.requirements],
      minExperience: tmpl.minExperience,
      requiredSkills: [...tmpl.requiredSkills],
      educationRequirement: tmpl.educationRequirement,
      status: 'DRAFT'
    });
    setIsAdding(true);
  };

  const addSkill = () => {
    if (skillInput.trim() && !newTemplate.requiredSkills.includes(skillInput.trim())) {
      setNewTemplate(prev => ({ ...prev, requiredSkills: [...prev.requiredSkills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const addRequirement = () => {
    if (requirementInput.trim() && !newTemplate.requirements.includes(requirementInput.trim())) {
      setNewTemplate(prev => ({ ...prev, requirements: [...prev.requirements, requirementInput.trim()] }));
      setRequirementInput('');
    }
  };

  const removeRequirement = (req: string) => {
    setNewTemplate(prev => ({ ...prev, requirements: prev.requirements.filter(r => r !== req) }));
  };

  const removeSkill = (skill: string) => {
    setNewTemplate(prev => ({ ...prev, requiredSkills: prev.requiredSkills.filter(s => s !== skill) }));
  };

  const purgeLogs = () => {
    if (window.confirm('Clear all notification history?')) {
      localStorage.removeItem(ALERTS_LOG_KEY);
      setAlertLogs([]);
    }
  };

  const handleManualResend = async (log: JobAlertLog) => {
    setResendingId(log.id);
    const subject = `Resend: New Job Opportunity: ${log.jobTitle}`;
    const body = `Hello candidate,\n\nWe wanted to make sure you saw this matching opportunity: ${log.jobTitle}.\n\nApply via your HireStream portal.`;
    await sendEmailNotification(log.candidateEmail, subject, body);
    setResendingId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Architecture</h2>
          <p className="text-slate-500 font-medium text-sm">Automated recruiting infrastructure</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          {[
            { id: 'templates', label: 'Architect', icon: LayoutList },
            { id: 'reports', label: 'Reports', icon: BarChart3 },
            { id: 'alerts', label: 'Alerts', icon: Bell }
          ].map(view => (
            <button 
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === view.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <view.icon className="w-4 h-4" />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            {isAdding ? (
              <section className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Role Construction</h3>
                  <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"><X /></button>
                </div>
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Job Title</label>
                      <input type="text" value={newTemplate.title} onChange={e => setNewTemplate(p => ({...p, title: e.target.value}))} className={`w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all ${errors.title ? 'border-red-500' : 'border-transparent focus:border-indigo-500'}`} />
                      {errors.title && <p className="text-[9px] text-red-500 font-black uppercase px-1">{errors.title}</p>}
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Min Experience (Years)</label>
                      <input type="number" value={newTemplate.minExperience} onChange={e => setNewTemplate(p => ({...p, minExperience: parseInt(e.target.value) || 0}))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Public Description</label>
                    <textarea value={newTemplate.description} onChange={e => setNewTemplate(p => ({...p, description: e.target.value}))} className={`w-full h-24 p-4 bg-slate-50 border-2 rounded-2xl outline-none text-sm font-medium transition-all ${errors.description ? 'border-red-500' : 'border-transparent focus:border-indigo-500'}`} />
                    {errors.description && <p className="text-[9px] text-red-500 font-black uppercase px-1">{errors.description}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Skills Management */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Required Core Skills</label>
                      <div className="flex gap-2">
                        <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && addSkill()} placeholder="e.g. React, Python" className="flex-1 p-3 bg-slate-50 border-none rounded-xl text-xs font-bold" />
                        <button onClick={addSkill} className="p-3 bg-indigo-600 text-white rounded-xl"><Plus className="w-4 h-4" /></button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newTemplate.requiredSkills.map(skill => (
                          <span key={skill} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
                            {skill}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                          </span>
                        ))}
                      </div>
                      {errors.requiredSkills && <p className="text-[9px] text-red-500 font-black uppercase px-1">{errors.requiredSkills}</p>}
                    </div>

                    {/* Requirements Management */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                        <ListChecks className="w-3.5 h-3.5" /> Specific Job Requirements
                      </label>
                      <div className="flex gap-2">
                        <input type="text" value={requirementInput} onChange={e => setRequirementInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && addRequirement()} placeholder="e.g. Available for GMT-5 shift" className="flex-1 p-3 bg-slate-50 border-none rounded-xl text-xs font-bold" />
                        <button onClick={addRequirement} className="p-3 bg-slate-900 text-white rounded-xl"><Plus className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-2 mt-2">
                        {newTemplate.requirements.map((req, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between group">
                            <span className="text-[10px] font-bold text-slate-600">{req}</span>
                            <X className="w-3.5 h-3.5 text-slate-300 hover:text-red-500 cursor-pointer" onClick={() => removeRequirement(req)} />
                          </div>
                        ))}
                      </div>
                      {errors.requirements && <p className="text-[9px] text-red-500 font-black uppercase px-1">{errors.requirements}</p>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Education Requirement</label>
                    <input type="text" value={newTemplate.educationRequirement} onChange={e => setNewTemplate(p => ({...p, educationRequirement: e.target.value}))} className={`w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all ${errors.educationRequirement ? 'border-red-500' : 'border-transparent focus:border-indigo-500'}`} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">AI Agent Core Protocol</label>
                    <textarea value={newTemplate.systemPrompt} onChange={e => setNewTemplate(p => ({...p, systemPrompt: e.target.value}))} className={`w-full h-40 p-5 bg-slate-900 text-indigo-400 border-2 rounded-[2rem] outline-none text-xs font-mono transition-all ${errors.systemPrompt ? 'border-red-500' : 'border-transparent focus:border-indigo-500'}`} />
                    {errors.systemPrompt && <p className="text-[9px] text-red-500 font-black uppercase px-1">{errors.systemPrompt}</p>}
                  </div>

                  <button onClick={handleSave} disabled={isProcessingAlerts} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                    {isProcessingAlerts ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Deploy System Template
                  </button>
                </div>
              </section>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button onClick={() => setIsAdding(true)} className="bg-white p-12 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-indigo-300 hover:text-indigo-600 transition-all hover:bg-slate-50">
                  <Plus className="w-10 h-10 mb-4" />
                  <span className="font-black uppercase tracking-widest text-[10px]">Architect New Role</span>
                </button>
                {templates.map(tmpl => (
                  <div key={tmpl.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:shadow-xl transition-all">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleClone(tmpl)} className="p-2 text-slate-300 hover:text-indigo-600 bg-slate-50 rounded-xl" title="Clone Template"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteTemplate(tmpl.id)} className="p-2 text-slate-300 hover:text-red-500 bg-slate-50 rounded-xl" title="Delete Template"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <h4 className="font-black text-slate-900 text-lg mb-2">{tmpl.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 line-clamp-2">{tmpl.description || "No description provided."}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                       <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{tmpl.applicantCount || 0} Applicants</span>
                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${tmpl.status === 'OPEN' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{tmpl.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><Terminal className="w-32 h-32" /></div>
              <h3 className="text-xs font-black uppercase tracking-widest mb-6">Integration Protocols</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Webhook Endpoint</label>
                  <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-[10px] font-mono text-emerald-400 outline-none" />
                </div>
                <button className="w-full py-4 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">Update Hook Sync</button>
              </div>
            </section>

            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Broadcast Service</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Active</span>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-500 uppercase">Subscribers</span>
                     <span className="text-xs font-black text-slate-900">{subscriptions.length}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-500 uppercase">Alerts Sent</span>
                     <span className="text-xs font-black text-slate-900">{alertLogs.length}</span>
                  </div>
               </div>
            </section>
          </div>
        </div>
      )}

      {activeView === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
           <div className="lg:col-span-4 space-y-6">
              <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 text-indigo-600">
                      <UserCheck className="w-5 h-5" />
                      <h3 className="text-sm font-black uppercase tracking-widest">Active Subscribers</h3>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {subscriptions.map(sub => (
                        <div key={sub.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100">
                           <div className="flex justify-between items-start mb-2">
                              <p className="text-xs font-black text-slate-900">{sub.candidateName}</p>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${sub.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                {sub.active ? 'Opted-In' : 'Paused'}
                              </span>
                           </div>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">{sub.candidateEmail}</p>
                           <div className="flex flex-wrap gap-1">
                              {sub.keywords.map(kw => <span key={kw} className="px-2 py-0.5 bg-white border border-slate-200 text-[8px] font-black text-slate-500 rounded-md uppercase">{kw}</span>)}
                              {sub.keywords.length === 0 && <span className="text-[8px] text-slate-300 italic">No Keywords</span>}
                           </div>
                        </div>
                      ))}
                      {subscriptions.length === 0 && <p className="text-[10px] text-slate-400 text-center py-10 uppercase font-black">No active alert configurations</p>}
                  </div>
              </section>
           </div>
           <div className="lg:col-span-8">
              <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                     <div className="flex items-center gap-3 text-indigo-600">
                        <History className="w-5 h-5" />
                        <h3 className="text-sm font-black uppercase tracking-widest">Notification History</h3>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase">{alertLogs.length} Total Alerts</span>
                        <button onClick={purgeLogs} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead>
                             <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                                <th className="px-8 py-4">Recipient</th>
                                <th className="px-8 py-4">Job Match</th>
                                <th className="px-8 py-4">Keyword Trigger</th>
                                <th className="px-8 py-4 text-right">Actions</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {alertLogs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()).map(log => (
                               <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="px-8 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black uppercase">{log.candidateEmail.charAt(0)}</div>
                                        <span className="text-xs font-bold text-slate-700">{log.candidateEmail}</span>
                                     </div>
                                  </td>
                                  <td className="px-8 py-4"><span className="text-xs font-black text-indigo-600">{log.jobTitle}</span></td>
                                  <td className="px-8 py-4"><span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase">{log.matchKeyword}</span></td>
                                  <td className="px-8 py-4 text-right">
                                     <button 
                                      onClick={() => handleManualResend(log)} 
                                      disabled={resendingId === log.id}
                                      className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                      title="Resend Manual Notification"
                                     >
                                        {resendingId === log.id ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                     </button>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                      </table>
                      {alertLogs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 opacity-20">
                          <Zap className="w-12 h-12 mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Waiting for alert matches...</p>
                        </div>
                      )}
                  </div>
              </section>
           </div>
        </div>
      )}

      {activeView === 'reports' && <ReportingSystem />}
    </div>
  );
};

export default AdminPanel;
