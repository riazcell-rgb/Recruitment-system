
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Save, Terminal, ExternalLink, X, Trash2, LayoutList, PieChart, FileText, BarChart3, Users } from 'lucide-react';
import { JOB_TEMPLATES as INITIAL_TEMPLATES } from '../constants';
import { JobTemplate, Candidate } from '../types';
import ReportingSystem from './ReportingSystem';

const AdminPanel: React.FC = () => {
  const [activeView, setActiveView] = useState<'templates' | 'reports'>('templates');
  const [templates, setTemplates] = useState<JobTemplate[]>(INITIAL_TEMPLATES);
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.your-instance.com/webhook/recruit-sync');
  const [isAdding, setIsAdding] = useState(false);

  // New Template Form State
  const [newTemplate, setNewTemplate] = useState<Omit<JobTemplate, 'id'>>({
    title: '',
    description: '',
    systemPrompt: '',
    questions: [''],
    requirements: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSave = () => {
    if (!validate()) return;

    const template: JobTemplate = {
      ...newTemplate,
      id: `tmpl-${Date.now()}`
    };

    setTemplates(prev => [...prev, template]);
    setIsAdding(false);
    setNewTemplate({ title: '', description: '', systemPrompt: '', questions: [''], requirements: [] });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Administration</h2>
          <p className="text-slate-500 font-medium">Manage recruitment logic and system intelligence</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveView('templates')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'templates' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Templates
          </button>
          <button 
            onClick={() => setActiveView('reports')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Reports Hub
          </button>
        </div>
      </div>

      {activeView === 'reports' ? (
        <ReportingSystem />
      ) : (
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
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Instructions for AI Agent</label>
                    <textarea 
                      value={newTemplate.systemPrompt}
                      onChange={e => setNewTemplate(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      className="w-full h-32 p-4 bg-slate-50 border-none rounded-2xl outline-none text-sm font-mono transition-all focus:ring-2 focus:ring-indigo-500"
                      placeholder="You are an expert technical recruiter..."
                    />
                  </div>

                  <div className="pt-6 flex gap-3">
                    <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 uppercase text-xs tracking-[0.2em]">Save Template</button>
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
