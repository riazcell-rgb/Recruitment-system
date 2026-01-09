
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Plus, Save, Terminal, ExternalLink, X, Trash2, LayoutList, PieChart as PieChartIcon, 
  FileText, BarChart3, Users, Bell, Mail, Search, CheckCircle2, History, 
  AlertCircle, Play, Pause, Clock, TrendingUp, Cpu, Award
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { JOB_TEMPLATES as INITIAL_TEMPLATES } from '../constants';
import { JobTemplate, Candidate, JobAlertSubscription, JobAlertLog } from '../types';
import ReportingSystem from './ReportingSystem';

const ALERTS_STORAGE_KEY = 'hirestream_job_alerts';
const ALERTS_LOG_KEY = 'hirestream_job_alerts_log';
const CANDIDATE_DB_KEY = 'hirestream_candidates_db';

const AdminPanel: React.FC = () => {
  const [activeView, setActiveView] = useState<'templates' | 'reports' | 'alerts' | 'analytics'>('templates');
  const [templates, setTemplates] = useState<JobTemplate[]>(INITIAL_TEMPLATES);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
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

    // Load Candidates for Analytics
    const savedCandidates = localStorage.getItem(CANDIDATE_DB_KEY);
    if (savedCandidates) setCandidates(JSON.parse(savedCandidates));
  }, []);

  // Analytics Calculations
  const analyticsData = useMemo(() => {
    const statusCounts = candidates.reduce((acc: any, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const pieData = Object.keys(statusCounts).map(status => ({
      name: status,
      value: statusCounts[status]
    }));

    const scoresByRole = candidates.reduce((acc: any, c) => {
      if (c.score) {
        if (!acc[c.role]) acc[c.role] = { total: 0, count: 0 };
        acc[c.role].total += c.score;
        acc[c.role].count += 1;
      }
      return acc;
    }, {});

    const barData = Object.keys(scoresByRole).map(role => ({
      role: role.split(' ').slice(0, 2).join(' '), // Shorten title
      avgScore: Math.round(scoresByRole[role].total / scoresByRole[role].count)
    }));

    const avgTotalScore = candidates.length > 0 
      ? Math.round(candidates.reduce((acc, c) => acc + (c.score || 0), 0) / candidates.filter(c => c.score).length)
      : 0;

    return { pieData, barData, avgTotalScore };
  }, [candidates]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!newTemplate.title.trim()) {
      newErrors.title = 'Job title is required';
    } else if (newTemplate.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!newTemplate.description.trim()) {
      newErrors.description = 'Job description is required';
    } else if (newTemplate.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!newTemplate.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required for the AI agent';
    }

    if (newTemplate.questions.length === 0) {
      newErrors.questions = 'At least one interview question is required';
    } else if (newTemplate.questions.some(q => !q.trim())) {
      newErrors.questions = 'All questions must have content';
    }
    
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Administration</h2>
          <p className="text-slate-500 font-medium">Manage recruitment logic and system intelligence</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
          {[
            { id: 'templates', label: 'Templates', icon: LayoutList },
            { id: 'reports', label: 'Reports Hub', icon: BarChart3 },
            { id: 'alerts', label: 'Job Alerts', icon: Bell },
            { id: 'analytics', label: 'Analytics', icon: PieChartIcon }
          ].map(view => (
            <button 
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeView === view.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <view.icon className="w-3.5 h-3.5" />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'reports' && <ReportingSystem />}

      {activeView === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Summary Stats */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatBox icon={LayoutList} label="Active Templates" value={templates.length.toString()} color="text-indigo-600" bg="bg-indigo-50" />
            <StatBox icon={Users} label="Total Candidates" value={candidates.length.toString()} color="text-emerald-600" bg="bg-emerald-50" />
            <StatBox icon={Award} label="Avg. Interview Score" value={`${analyticsData.avgTotalScore}%`} color="text-amber-600" bg="bg-amber-50" />
            <StatBox icon={TrendingUp} label="Conversion Rate" value="24%" color="text-blue-600" bg="bg-blue-50" />
          </div>

          {/* Charts */}
          <div className="lg:col-span-7 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Performance by Role
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="role" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="avgScore" radius={[10, 10, 0, 0]}>
                    {analyticsData.barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              Pipeline Distribution
            </h3>
            <div className="h-80 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analyticsData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900">{candidates.length}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase">Total</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {analyticsData.pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] font-black text-slate-400 uppercase truncate">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              <section className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Job Template</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure automated interview logic</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <LayoutList className="w-3.5 h-3.5" /> Job Title
                    </label>
                    <input 
                      type="text"
                      value={newTemplate.title}
                      onChange={e => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                      className={`w-full p-5 bg-slate-50 border-2 rounded-[1.5rem] outline-none transition-all font-bold ${errors.title ? 'border-red-500 ring-4 ring-red-500/10' : 'border-transparent focus:border-indigo-500'}`}
                      placeholder="e.g. Senior Backend Engineer"
                    />
                    {errors.title && <p className="text-[10px] text-red-500 font-black mt-2 uppercase tracking-widest">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> Job Description
                    </label>
                    <textarea 
                      value={newTemplate.description}
                      onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      className={`w-full h-32 p-5 bg-slate-50 border-2 rounded-[1.5rem] outline-none text-sm transition-all leading-relaxed ${errors.description ? 'border-red-500 ring-4 ring-red-500/10' : 'border-transparent focus:border-indigo-500'}`}
                      placeholder="Briefly describe the role, goals, and team context..."
                    />
                    {errors.description && <p className="text-[10px] text-red-500 font-black mt-2 uppercase tracking-widest">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5" /> Agent Instructions
                    </label>
                    <textarea 
                      value={newTemplate.systemPrompt}
                      onChange={e => setNewTemplate(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      className={`w-full h-40 p-5 bg-slate-950 text-emerald-400 border-2 rounded-[1.5rem] outline-none text-xs font-mono transition-all leading-relaxed ${errors.systemPrompt ? 'border-red-500 ring-4 ring-red-500/10' : 'border-transparent focus:border-indigo-500'}`}
                      placeholder="You are an expert technical recruiter..."
                    />
                    <div className="flex justify-between items-center mt-2">
                      {errors.systemPrompt ? (
                        <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">{errors.systemPrompt}</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-medium">Advanced: This prompt defines how Alex interacts during the session.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      onClick={handleSave} 
                      className="flex-1 bg-indigo-600 text-white font-black py-6 rounded-[1.5rem] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/30 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3"
                    >
                      <Save className="w-5 h-5" />
                      Finalize & Create Role
                    </button>
                    <button 
                      onClick={() => setIsAdding(false)} 
                      className="px-10 bg-slate-100 text-slate-600 font-black py-6 rounded-[1.5rem] hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center group border-dashed hover:border-indigo-300 transition-all cursor-pointer" onClick={() => setIsAdding(true)}>
                  <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    <Plus className="w-10 h-10" />
                  </div>
                  <h4 className="font-black text-slate-900 uppercase tracking-widest text-lg">New Role Template</h4>
                  <p className="text-slate-400 text-sm mt-1 font-medium max-w-xs">Define custom interview parameters and AI logic for a new hiring pipeline.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {templates.map(tmpl => (
                    <div key={tmpl.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:shadow-xl transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-100/50 transition-colors" />
                      <div className="flex justify-between items-start mb-6 relative">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg"><LayoutList className="w-5 h-5" /></div>
                        <div className="flex gap-2">
                          <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-black text-slate-900 text-lg leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{tmpl.title}</h4>
                      <p className="text-xs text-slate-400 font-medium mb-8 line-clamp-2 leading-relaxed">{tmpl.description}</p>
                      <div className="flex items-center justify-between pt-6 border-t border-slate-50 relative">
                        <div className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{tmpl.questions.length} Questions</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active v1.2</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <section className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border-8 border-white">
              <div className="absolute top-0 right-0 p-8 opacity-5"><Terminal className="w-32 h-32" /></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em]">Sync & Hook</h3>
                </div>
                <p className="text-slate-400 text-xs font-medium mb-10 leading-relaxed">
                  Export recruitment streams and evaluation data to your existing ERP or automation tools.
                </p>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Webhook Endpoint</label>
                    <input 
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[10px] font-mono text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                  <button className="w-full py-5 bg-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">Update Integration</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ icon: any; label: string; value: string; color: string; bg: string }> = ({ icon: Icon, label, value, color, bg }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6 transition-all hover:shadow-md group">
    <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center ${bg} ${color} shadow-sm group-hover:scale-110 transition-transform`}>
      <Icon className="w-7 h-7" />
    </div>
    <div>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black text-slate-900 leading-none`}>{value}</p>
    </div>
  </div>
);

export default AdminPanel;
