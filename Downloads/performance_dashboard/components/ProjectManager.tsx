
import React, { useState } from 'react';
import { Project } from '../types';
import { extractSpreadsheetId } from '../services/api';

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
  const [inputSid, setInputSid] = useState('');
  const [customSheets, setCustomSheets] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInputSid, setEditInputSid] = useState('');
  const [editCustomSheets, setEditCustomSheets] = useState('');

  const isAdmin = userRole === 'desicrew';
  const filteredProjects = projects.filter(p => p.category === activeTab);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && name && inputSid) {
      const sid = extractSpreadsheetId(inputSid);
      onAdd({ 
        name, 
        spreadsheetId: sid, 
        category: activeTab, 
        customSheets: customSheets.trim() 
      });
      setName('');
      setInputSid('');
      setCustomSheets('');
      setShowAdd(false);
    }
  };

  const startEditing = (p: Project) => {
    if (!isAdmin) return;
    setEditingId(p.id);
    setEditName(p.name);
    setEditInputSid(p.spreadsheetId);
    setEditCustomSheets(p.customSheets || '');
  };

  const handleUpdate = (e: React.FormEvent, original: Project) => {
    e.preventDefault();
    if (isAdmin && editName && editInputSid) {
      const sid = extractSpreadsheetId(editInputSid);
      onUpdate({ 
        ...original, 
        name: editName, 
        spreadsheetId: sid, 
        customSheets: editCustomSheets.trim() 
      });
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        <div className="p-8 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Project Setup</h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">Add or modify project spreadsheets</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 text-2xl">✕</button>
        </div>

        <div className="px-8 mb-4">
          <div className="relative flex p-1 bg-slate-900/80 rounded-2xl border border-slate-800">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 shadow-lg ${activeTab === 'production' ? 'left-1 bg-violet-600' : 'left-[calc(50%+3px)] bg-amber-600'}`} />
            <button onClick={() => { setActiveTab('production'); setEditingId(null); setShowAdd(false); }} className={`relative z-10 flex-1 py-3 text-[11px] font-black tracking-widest ${activeTab === 'production' ? 'text-white' : 'text-slate-500'}`}>PRODUCTION</button>
            <button onClick={() => { setActiveTab('hourly'); setEditingId(null); setShowAdd(false); }} className={`relative z-10 flex-1 py-3 text-[11px] font-black tracking-widest ${activeTab === 'hourly' ? 'text-white' : 'text-slate-500'}`}>HOURLY</button>
          </div>
        </div>

        <div className="p-8 pt-2 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl mb-4">
             <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-relaxed">
               Note: Direct Sync relies on Spreadsheet IDs. Ensure your Google Spreadsheet is set to <b>"Anyone with the link can view"</b>. If auto-discovery fails, manually enter sheet names.
             </p>
          </div>

          {filteredProjects.map(project => {
            const isSelected = selectedProjectIds.includes(project.id);
            return (
              <div key={project.id} className={`p-5 rounded-[1.8rem] border transition-all ${editingId === project.id ? 'bg-slate-800/80 border-violet-500' : isSelected ? 'bg-slate-800/50 border-slate-700' : 'bg-[#1F2937]/40 border-slate-800/60'}`}>
                {editingId === project.id ? (
                  <form onSubmit={(e) => handleUpdate(e, project)} className="space-y-3">
                    <input type="text" placeholder="Project Name" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" value={editName} onChange={e => setEditName(e.target.value)} required />
                    <input type="text" placeholder="Spreadsheet ID or URL" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-400 font-mono" value={editInputSid} onChange={e => setEditInputSid(e.target.value)} required />
                    <input type="text" placeholder="Target Sheet Names (comma separated)" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-violet-300" value={editCustomSheets} onChange={e => setEditCustomSheets(e.target.value)} />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-violet-600 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-widest">Update</button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-6 py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => onSelect(project.id)}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-violet-900/30 text-violet-400 border border-violet-500/20">{project.category === 'production' ? '🏭' : '⏰'}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-lg truncate">{project.name}</h4>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <p className="text-[9px] text-slate-500 font-mono truncate">{project.spreadsheetId}</p>
                          {project.customSheets && <p className="text-[9px] text-violet-400/70 font-bold truncate">Sheets: {project.customSheets}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => onSelect(project.id)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800/60 text-slate-500 hover:text-slate-300 border border-slate-700'}`}>{isSelected ? 'SELECTED' : 'USE'}</button>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => startEditing(project)} className="p-2 text-slate-500 hover:text-orange-400" title="Edit">✎</button>
                          <button onClick={() => onDelete(project.id)} className="p-2 text-slate-500 hover:text-red-400" title="Delete">🗑</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isAdmin && !showAdd && !editingId && (
            <button onClick={() => setShowAdd(true)} className="w-full py-6 border-2 border-dashed border-slate-800 rounded-[2rem] text-slate-500 hover:text-slate-400 hover:border-slate-700 transition-all font-medium text-sm flex items-center justify-center gap-2"><span>+</span> Connect New Data Source</button>
          )}

          {isAdmin && showAdd && (
            <form onSubmit={handleSubmit} className="p-6 rounded-[2rem] bg-slate-900 border border-slate-700 space-y-4 animate-in slide-in-from-bottom-2">
              <h3 className="text-white font-bold text-[10px] uppercase tracking-widest text-center mb-2">Connect New {activeTab} Data Source</h3>
              <input type="text" placeholder="Project Name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-violet-500" value={name} onChange={e => setName(e.target.value)} required />
              <input type="text" placeholder="Spreadsheet ID or Full URL" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-400 font-mono outline-none focus:ring-2 focus:ring-violet-500" value={inputSid} onChange={e => setInputSid(e.target.value)} required />
              <input type="text" placeholder="Sheet Names (comma separated) - e.g. 15th OCT, 16th OCT" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-violet-300 outline-none focus:ring-2 focus:ring-violet-500" value={customSheets} onChange={e => setCustomSheets(e.target.value)} />
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
