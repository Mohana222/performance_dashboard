import React, { useState } from 'react';
import { Project } from '../types';
import { COLORS } from '../constants';

interface ProjectManagerProps {
  projects: Project[];
  activeProjectId: string;
  onAdd: (project: Omit<Project, 'id' | 'color'>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, activeProjectId, onAdd, onDelete, onSelect, onClose }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<'production' | 'hourly'>('production');
  const [showAdd, setShowAdd] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Manage Spreadsheets</h2>
            <p className="text-slate-400 text-sm">Switch between different projects or add new ones</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {projects.map(project => (
              <div 
                key={project.id}
                className={`group p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  activeProjectId === project.id 
                    ? 'bg-violet-600/10 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.2)]' 
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => onSelect(project.id)}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner" style={{ backgroundColor: project.color + '33', color: project.color }}>
                    {project.category === 'production' ? '🏭' : '⏰'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                      {project.name}
                      <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                        project.category === 'production' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {project.category}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{project.url}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onSelect(project.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      activeProjectId === project.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {activeProjectId === project.id ? 'Selected' : 'Switch To'}
                  </button>
                  {projects.length > 1 && (
                    <button 
                      onClick={() => onDelete(project.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete Project"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!showAdd ? (
            <button 
              onClick={() => setShowAdd(true)}
              className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all font-semibold flex items-center justify-center gap-2"
            >
              <span>+</span> Add New Spreadsheet Project
            </button>
          ) : (
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded-xl transition-all shadow-lg">
                  Save Project
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2 text-slate-400 hover:text-white font-semibold">
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