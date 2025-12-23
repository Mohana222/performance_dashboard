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
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<'production' | 'hourly'>('production');
  const [showAdd, setShowAdd] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState<'production' | 'hourly'>('production');

  const isAdmin = userRole === 'desicrew';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && name && url) {
      onAdd({ name, url, category });
      setName('');
      setUrl('');
      setCategory('production');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Project Setup</h2>
            <p className="text-slate-400 text-sm">
              {isAdmin ? 'Add or modify project spreadsheets' : 'Select active projects (View Only)'}
            </p>
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
                      ? 'bg-violet-600/10 border-violet-500' 
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
              >
                {editingId === project.id ? (
                  <form onSubmit={(e) => handleUpdate(e, project)} className="space-y-4">
                    <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-700">
                      <button type="button" onClick={() => setEditCategory('production')} className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${editCategory === 'production' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>PRODUCTION</button>
                      <button type="button" onClick={() => setEditCategory('hourly')} className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${editCategory === 'hourly' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>HOURLY</button>
                    </div>
                    <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200" value={editName} onChange={e => setEditName(e.target.value)} required />
                    <input type="url" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-400 font-mono" value={editUrl} onChange={e => setEditUrl(e.target.value)} required />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs">SAVE</button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs">CANCEL</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => onSelect(project.id)}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: project.color + '33', color: project.color }}>
                        {project.category === 'production' ? '🏭' : '⏰'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white flex items-center gap-2">
                          <span className="truncate">{project.name}</span>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase ${project.category === 'production' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{project.category}</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate font-mono">{project.url}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => onSelect(project.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${activeProjectId === project.id ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 bg-slate-800/50'}`}>
                        {activeProjectId === project.id ? 'Selected' : 'Use'}
                      </button>
                      
                      {isAdmin && (
                        <>
                          <button onClick={() => startEditing(project)} className="p-2 text-slate-500 hover:text-violet-400">✏️</button>
                          {projects.length > 1 && (
                            <button onClick={() => onDelete(project.id)} className="p-2 text-slate-500 hover:text-red-400">🗑️</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAdmin && !showAdd && !editingId && (
            <button onClick={() => setShowAdd(true)} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:text-violet-400 hover:border-violet-500/50 transition-all font-semibold flex items-center justify-center gap-2">
              <span>+</span> Add New Spreadsheet Project
            </button>
          )}

          {isAdmin && showAdd && (
            <form onSubmit={handleSubmit} className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-white font-bold text-sm uppercase">New Project Configuration</h3>
              <div className="space-y-4">
                <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-700">
                  <button type="button" onClick={() => setCategory('production')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${category === 'production' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>PRODUCTION</button>
                  <button type="button" onClick={() => setCategory('hourly')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${category === 'hourly' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>HOURLY</button>
                </div>
                <input type="text" placeholder="Project Name" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-200" value={name} onChange={e => setName(e.target.value)} required />
                <input type="url" placeholder="Apps Script Web App URL" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 font-mono text-sm" value={url} onChange={e => setUrl(e.target.value)} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-violet-600 text-white font-bold py-2 rounded-xl text-xs">SAVE</button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2 text-slate-400 font-semibold text-xs">CANCEL</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;