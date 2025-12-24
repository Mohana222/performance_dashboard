
import React, { useState } from 'react';
import { Project } from '../types';

interface ProjectManagerProps {
  projects: Project[];
  selectedProjectIds: string[];
  userRole: 'desicrew' | 'user';
  onAdd: (project: Omit<Project, 'id' | 'color'>) => void;
  onUpdate: (project: Project) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, selectedProjectIds, userRole, onAdd, onUpdate, onDelete, onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState<'production' | 'hourly'>('production');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState<'production' | 'hourly'>('production');

  const isAdmin = userRole === 'desicrew';
  const filteredProjects = projects.filter(p => p.category === activeTab);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && name && url) {
      onAdd({ name, url, category: activeTab });
      setName('');
      setUrl('');
      setShowAdd(false);
    }
  };

  const startEditing = (p: Project) => {
    if (!isAdmin) return;
    setEditingId(p.id);
    setEditName(p.name);
    setEditUrl(p.url);
    setEditCategory(p.category);
  };

  const handleUpdate = (e: React.FormEvent, original: Project) => {
    e.preventDefault();
    if (isAdmin && editName && editUrl) {
      onUpdate({ ...original, name: editName, url: editUrl, category: editCategory });
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-800 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Project Setup</h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">Add or modify project spreadsheets</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-white transition-colors p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Sliding Tab Controller */}
        <div className="px-8 mb-4">
          <div className="relative flex p-1 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-inner">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-out shadow-lg ${
                activeTab === 'production' ? 'left-1 bg-violet-600' : 'left-[calc(50%+3px)] bg-amber-600'
              }`}
            />
            <button 
              onClick={() => { setActiveTab('production'); setEditingId(null); setShowAdd(false); }}
              className={`relative z-10 flex-1 py-3 text-[11px] font-black tracking-widest transition-colors duration-200 ${activeTab === 'production' ? 'text-white' : 'text-slate-500 hover:text-slate-400'}`}
            >
              PRODUCTION
            </button>
            <button 
              onClick={() => { setActiveTab('hourly'); setEditingId(null); setShowAdd(false); }}
              className={`relative z-10 flex-1 py-3 text-[11px] font-black tracking-widest transition-colors duration-200 ${activeTab === 'hourly' ? 'text-white' : 'text-slate-500 hover:text-slate-400'}`}
            >
              HOURLY
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 pt-2 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {filteredProjects.map(project => (
            <div 
              key={project.id}
              className={`p-5 rounded-[1.5rem] border transition-all ${
                editingId === project.id 
                  ? 'bg-slate-800/80 border-violet-500' 
                  : 'bg-[#1F2937]/40 border-slate-800/60 hover:border-slate-700'
              }`}
            >
              {editingId === project.id ? (
                <form onSubmit={(e) => handleUpdate(e, project)} className="space-y-4">
                  <input 
                    type="text" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    required 
                  />
                  <input 
                    type="url" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-400 font-mono outline-none focus:ring-2 focus:ring-violet-500" 
                    value={editUrl} 
                    onChange={e => setEditUrl(e.target.value)} 
                    required 
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-violet-600 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-widest">Update</button>
                    <button type="button" onClick={() => setEditingId(null)} className="px-6 py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-violet-900/30 text-violet-400 border border-violet-500/20">
                      {project.category === 'production' ? '🏭' : '⏰'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-lg truncate">{project.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-tight ${
                          project.category === 'production' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {project.category.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => onSelect(project.id)}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        selectedProjectIds.includes(project.id)
                          ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                          : 'bg-slate-800/60 text-slate-500 hover:text-slate-300 border border-slate-700'
                      }`}
                    >
                      {selectedProjectIds.includes(project.id) ? 'SELECTED' : 'USE'}
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => startEditing(project)} className="p-2 text-slate-500 hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onClick={() => onDelete(project.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isAdmin && !showAdd && !editingId && (
            <button 
              onClick={() => setShowAdd(true)} 
              className="w-full py-6 border-2 border-dashed border-slate-800 rounded-[1.5rem] text-slate-500 hover:text-slate-400 hover:border-slate-700 transition-all font-medium text-sm flex items-center justify-center gap-2"
            >
              <span>+</span> Add New Spreadsheet Project
            </button>
          )}

          {isAdmin && showAdd && (
            <form onSubmit={handleSubmit} className="p-6 rounded-[1.5rem] bg-slate-900 border border-slate-700 space-y-4 animate-in slide-in-from-bottom-2">
              <h3 className="text-white font-bold text-xs uppercase tracking-widest text-center mb-2">Connect New {activeTab} Data Source</h3>
              <input 
                type="text" 
                placeholder="Project Name (e.g. Dec Tracker)" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-violet-500" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
              <input 
                type="url" 
                placeholder="Google Script URL" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-400 font-mono outline-none focus:ring-2 focus:ring-violet-500" 
                value={url} 
                onChange={e => setUrl(e.target.value)} 
                required 
              />
              <div className="flex gap-2">
                <button type="submit" className={`flex-1 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-widest shadow-lg ${activeTab === 'production' ? 'bg-violet-600' : 'bg-amber-600'}`}>Connect</button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-3 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
