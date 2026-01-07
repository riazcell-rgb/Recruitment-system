
import React, { useState } from 'react';
import { Settings, Plus, Save, Terminal, ExternalLink, X, Trash2, LayoutList } from 'lucide-react';
import { JOB_TEMPLATES as INITIAL_TEMPLATES } from '../constants';
import { JobTemplate } from '../types';

const AdminPanel: React.FC = () => {
  const [templates, setTemplates] = useState<JobTemplate[]>(INITIAL_TEMPLATES);
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.your-instance.com/webhook/recruit-sync');
  const [isAdding, setIsAdding] = useState(false);

  // New Template Form State
  const [newTemplate, setNewTemplate] = useState<Omit<JobTemplate, 'id'>>({
    title: '',
    description: '',
    systemPrompt: '',
    questions: ['']
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
    setNewTemplate({ title: '', description: '', systemPrompt: '', questions: [''] });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Administration</h2>
          <p className="text-slate-500">Manage recruitment logic and automation triggers</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold">New Template</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {isAdding ? (
            <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Create Interview Template</h3>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Job Title</label>
                  <input 
                    type="text"
                    value={newTemplate.title}
                    onChange={e => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full p-3 bg-slate-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${errors.title ? 'border-red-500' : 'border-slate-200'}`}
                    placeholder="e.g. Senior Backend Engineer"
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                  <textarea 
                    value={newTemplate.description}
                    onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full h-24 p-3 bg-slate-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${errors.description ? 'border-red-500' : 'border-slate-200'}`}
                    placeholder="Briefly describe the role requirements..."
                  />
                  {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                    AI Agent System Prompt
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Instructions for the AI</span>
                  </label>
                  <textarea 
                    value={newTemplate.systemPrompt}
                    onChange={e => setNewTemplate(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    className={`w-full h-32 p-3 bg-slate-50 border rounded-xl outline-none text-sm font-mono transition-all focus:ring-2 focus:ring-indigo-500 ${errors.systemPrompt ? 'border-red-500' : 'border-slate-200'}`}
                    placeholder="You are an expert technical interviewer..."
                  />
                  {errors.systemPrompt && <p className="text-xs text-red-500 mt-1">{errors.systemPrompt}</p>}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">Interview Questions (Sequential)</label>
                    <button 
                      onClick={handleAddQuestion}
                      className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Add Question
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newTemplate.questions.map((q, idx) => (
                      <div key={idx} className="flex gap-2">
                        <div className="flex-1">
                          <input 
                            type="text"
                            value={q}
                            onChange={e => handleQuestionChange(idx, e.target.value)}
                            className={`w-full p-3 bg-slate-50 border rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-indigo-500 ${errors.questions ? 'border-red-500' : 'border-slate-200'}`}
                            placeholder={`Question ${idx + 1}`}
                          />
                        </div>
                        {newTemplate.questions.length > 1 && (
                          <button 
                            onClick={() => handleRemoveQuestion(idx)}
                            className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {errors.questions && <p className="text-xs text-red-500 mt-1">{errors.questions}</p>}
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button 
                    onClick={handleSave}
                    className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Save Template
                  </button>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-6 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900">
                  <LayoutList className="w-5 h-5 text-indigo-500" />
                  Interview Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(tmpl => (
                    <div key={tmpl.id} className="p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-indigo-100 transition-all cursor-pointer group relative">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-slate-900 leading-tight">{tmpl.title}</h4>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Settings className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">{tmpl.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-full">
                          {tmpl.questions.length} QUESTIONS
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Updated 1d ago</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-slate-900">System Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Active Syncing</p>
                      <p className="text-xs text-emerald-700">Webhook connected and receiving payloads.</p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="space-y-6">
          <section className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Terminal className="w-20 h-20" />
            </div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">n8n Integration</h3>
              <ExternalLink className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Automate your entire workflow. Sync results to Google Sheets, Notion, or Slack instantly.
            </p>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Webhook Destination</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs font-mono text-emerald-400 outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <button className="w-full py-4 bg-indigo-600 rounded-2xl text-sm font-bold hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                <Save className="w-4 h-4" />
                Update Webhook
              </button>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Recent Executions</h3>
            <div className="space-y-5">
              {[
                { status: 'Success', time: '2m ago', color: 'bg-emerald-500' },
                { status: 'Success', time: '14m ago', color: 'bg-emerald-500' },
                { status: 'Retrying', time: '1h ago', color: 'bg-amber-500' },
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className={`w-2 h-2 ${log.color} rounded-full mt-1.5`} />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{log.status}</p>
                      <p className="text-xs text-slate-400">{log.time}</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold text-indigo-600 hover:underline">LOGS</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
