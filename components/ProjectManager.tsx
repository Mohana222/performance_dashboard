
import React, { useState } from 'react';
import { Project } from '../types';

interface ProjectManagerProps {
  projects: Project[];
  activeProjectId: string;
  userRole: 'desicrew' | 'user';
  onAdd: (project: Omit<Project, 'id' | 'color'>) => void;
  onUpdate: (project: Project) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, activeProjectId, userRole, onAdd, onUpdate, onDelete, onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState<'production' | 'hourly'>('production');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<'production' | 'hourly'>('production');
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
      onAdd({ name, url, category });
      setName('');
      setUrl('');
      setCategory(activeTab); // Reset to current tab
      setShowAdd(false);
    }
  };

  const handleOpenAdd = () => {
    setCategory(activeTab);
    setShowAdd(true);
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
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Project Setup</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">
              {isAdmin ? 'Manage and organize your data sources' : 'Select active projects (View Only)'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all hover:bg-red-500/20"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-8 pt-6 pb-2">
          <div className="flex p-1.5 bg-slate-950/50 rounded-2xl border border-slate-800 shadow-inner">
            <button 
              onClick={() => setActiveTab('production')}
              className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'production' 
                  ? 'bg-violet-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              🏭 PRODUCTION TRACKERS
              <span className={`px-2 py-0.5 rounded-md text-[9px] ${activeTab === 'production' ? 'bg-white/20' : 'bg-slate-800'}`}>
                {projects.filter(p => p.category === 'production').length}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('hourly')}
              className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'hourly' 
                  ? 'bg-amber-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              ⏰ HOURLY TRACKERS
              <span className={`px-2 py-0.5 rounded-md text-[9px] ${activeTab === 'hourly' ? 'bg-white/20' : 'bg-slate-800'}`}>
                {projects.filter(p => p.category === 'hourly').length}
              </span>
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="p-8 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {filteredProjects.length > 0 ? (
            filteredProjects.map(project => (
              <div 
                key={project.id}
                className={`group p-5 rounded-[2rem] border transition-all flex flex-col ${
                  editingId === project.id 
                    ? 'bg-violet-600/5 border-violet-500 shadow-lg ring-1 ring-violet-500/20' 
                    : activeProjectId === project.id 
                      ? 'bg-slate-800/80 border-slate-600' 
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                {editingId === project.id ? (
                  <form onSubmit={(e) => handleUpdate(e, project)} className="space-y-4">
                    <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-700">
                      <button type="button" onClick={() => setEditCategory('production')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${editCategory === 'production' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>PRODUCTION</button>
                      <button type="button" onClick={() => setEditCategory('hourly')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${editCategory === 'hourly' ? 'bg-amber-600 text-white' : 'text-slate-500'}`}>HOURLY</button>
                    </div>
                    <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50" value={editName} onChange={e => setEditName(e.target.value)} required />
                    <input type="url" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 text-xs text-slate-400 font-mono outline-none focus:ring-2 focus:ring-violet-500/50" value={editUrl} onChange={e => setEditUrl(e.target.value)} required />
                    <div className="flex gap-3">
                      <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95">SAVE CHANGES</button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-6 py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">CANCEL</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5 cursor-pointer flex-1 min-w-0" onClick={() => onSelect(project.id)}>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:scale-110`} style={{ backgroundColor: project.color + '22', color: project.color, border: `1px solid ${project.color}33` }}>
                        {project.category === 'production' ? '🏭' : '⏰'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          <span className="truncate">{project.name}</span>
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest ${project.category === 'production' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {project.category}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">{project.url.substring(0, 40)}...</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 ml-4">
                      {isAdmin && (
                        <div className="flex items-center mr-2 bg-slate-900/50 rounded-xl border border-slate-800 px-1 py-1">
                          <button onClick={() => startEditing(project)} className="p-2.5 text-slate-500 hover:text-white transition-colors" title="Edit Project">✏️</button>
                          {projects.length > 1 && (
                            <button onClick={() => onDelete(project.id)} className="p-2.5 text-slate-500 hover:text-red-400 transition-colors" title="Delete Project">🗑️</button>
                          )}
                        </div>
                      )}
                      
                      <button 
                        onClick={() => onSelect(project.id)} 
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                          activeProjectId === project.id 
                            ? (activeTab === 'production' ? 'bg-violet-600 text-white' : 'bg-amber-600 text-white')
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }`}
                      >
                        {activeProjectId === project.id ? 'SELECTED' : 'USE'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-900/20">
              <span className="text-5xl mb-4 opacity-20">{activeTab === 'production' ? '🏭' : '⏰'}</span>
              <h3 className="text-slate-400 font-bold text-lg">No {activeTab} projects found</h3>
              <p className="text-slate-600 text-sm mt-2">Connect a spreadsheet to start tracking performance.</p>
            </div>
          )}

          {isAdmin && !showAdd && !editingId && (
            <button 
              onClick={handleOpenAdd} 
              className="w-full py-5 border-2 border-dashed border-slate-800 rounded-[2rem] text-slate-500 hover:text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all font-bold flex items-center justify-center gap-3 group"
            >
              <span className="text-xl group-hover:scale-125 transition-transform">+</span>
              <span className="text-sm uppercase tracking-widest">Add New {activeTab} Project</span>
            </button>
          )}

          {isAdmin && showAdd && (
            <form onSubmit={handleSubmit} className="bg-slate-800/40 p-8 rounded-[2rem] border border-violet-500/30 space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
                  New Project Configuration
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex p-1.5 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                  <button 
                    type="button" 
                    onClick={() => setCategory('production')} 
                    className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${category === 'production' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-500'}`}
                  >
                    PRODUCTION
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setCategory('hourly')} 
                    className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${category === 'hourly' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500'}`}
                  >
                    HOURLY
                  </button>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-widest">Project Display Name</label>
                  <input type="text" placeholder="e.g. Ramp Production Tracker" className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-5 py-4 text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 shadow-inner" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-widest">Apps Script Endpoint</label>
                  <input type="url" placeholder="https://script.google.com/..." className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-5 py-4 text-slate-200 font-mono text-sm outline-none focus:ring-2 focus:ring-violet-500/50 shadow-inner" value={url} onChange={e => setUrl(e.target.value)} required />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95">SAVE PROJECT</button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-8 py-4 bg-slate-800 text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-700 transition-all">CANCEL</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
