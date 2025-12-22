import React, { useState } from 'react';
import { Project } from '../types';
import { COLORS } from '../constants';

interface ProjectManagerProps {
  projects: Project[];
  activeProjectId: string;
  onAdd: (project: Omit<Project, 'id' | 'color'>) => void;
  onUpdate: (project: Project) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, activeProjectId, onAdd, onUpdate, onDelete, onSelect, onClose }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<'production' | 'hourly'>('production');
  const [showAdd, setShowAdd] = useState(false);
  
  // States for handling inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState<'production' | 'hourly'>('production');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && url) {
      onAdd({ name, url, category });
      setName('');
      setUrl('');
      setCategory('production');
      setShowAdd(false);
    }
  };

  const startEditing = (p: Project) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditUrl(p.url);
    setEditCategory(p.category);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdate = (e: React.FormEvent, original: Project) => {
    e.preventDefault();
    if (editName && editUrl) {
      onUpdate({ ...original, name: editName, url: editUrl, category: editCategory });
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Manage Spreadsheets</h2>
            <p className="text-slate-400 text-sm">Switch between different projects or add new ones</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl font-bold transition-transform hover:rotate-90">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {projects.map(project => (
              <div 
                key={project.id}
                className={`group p-4 rounded-2xl border transition-all flex flex-col ${
                  editingId === project.id 
                    ? 'bg-violet-600/5 border-violet-500 shadow-lg ring-1 ring-violet-500/20' 
                    : activeProjectId === project.id 
                      ? 'bg-violet-600/10 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
              >
                {editingId === project.id ? (
                  /* Edit Mode UI */
                  <form onSubmit={(e) => handleUpdate(e, project)} className="space-y-4">
                    <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setEditCategory('production')}
                        className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${editCategory === 'production' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}
                      >
                        PRODUCTION
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditCategory('hourly')}
                        className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${editCategory === 'hourly' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}
                      >
                        HOURLY
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-violet-500 outline-none"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Project Name"
                        required
                      />
                      <input
                        type="url"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-400 focus:ring-1 focus:ring-violet-500 outline-none font-mono"
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
                        placeholder="Google App Script URL"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg transition-all">
                        SAVE CHANGES
                      </button>
                      <button type="button" onClick={cancelEditing} className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition-all">
                        CANCEL
                      </button>
                    </div>
                  </form>
                ) : (
                  /* View Mode UI */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => onSelect(project.id)}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner" style={{ backgroundColor: project.color + '33', color: project.color }}>
                        {project.category === 'production' ? '🏭' : '⏰'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white flex items-center gap-2">
                          <span className="truncate">{project.name}</span>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-tighter flex-shrink-0 ${
                            project.category === 'production' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {project.category}
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate max-w-[240px] font-mono">{project.url}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <button 
                        onClick={() => onSelect(project.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest ${
                          activeProjectId === project.id ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 bg-slate-800/50'
                        }`}
                      >
                        {activeProjectId === project.id ? 'Selected' : 'Use'}
                      </button>
                      
                      <button 
                        onClick={() => startEditing(project)}
                        className="p-2 text-slate-500 hover:text-violet-400 transition-colors"
                        title="Edit Spreadsheet Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>

                      {projects.length > 1 && (
                        <button 
                          onClick={() => onDelete(project.id)}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete Project"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!showAdd && !editingId && (
            <button 
              onClick={() => setShowAdd(true)}
              className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all font-semibold flex items-center justify-center gap-2"
            >
              <span>+</span> Add New Spreadsheet Project
            </button>
          )}

          {showAdd && (
            <form onSubmit={handleSubmit} className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest">New Project Configuration</h3>
              <div className="space-y-4">
                <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCategory('production')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${category === 'production' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    PRODUCTION
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('hourly')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${category === 'hourly' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    HOURLY
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Project Name (e.g. Q4 Road Dataset)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
                <input
                  type="url"
                  placeholder="Google App Script Web App URL"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded-xl transition-all shadow-lg uppercase tracking-widest text-xs">
                  Save Project
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2 text-slate-400 hover:text-white font-semibold text-xs">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;