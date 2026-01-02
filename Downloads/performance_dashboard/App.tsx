
import React, { useState, useEffect, useMemo } from 'react';
import { ViewType, RawRow, Project, Birthday } from './types';
import { getSheetData, findKey, fetchGlobalProjects, saveGlobalProjects, fetchSheetList } from './services/api';
import { MENU_ITEMS, COLORS, VALID_USERS, BIRTHDAYS } from './constants';
import MultiSelect from './components/MultiSelect';
import DataTable from './components/DataTable';
import OverallPieChart from './components/OverallPieChart';
import SummaryCards from './components/SummaryCards';
import ProjectManager from './components/ProjectManager';
import SelectionModal from './components/SelectionModal';
import UserQualityChart from './components/UserQualityChart';
import InfoFooter from './components/InfoFooter';
import BirthdayNotice from './components/BirthdayNotice';

const normalizeDateValue = (val: any): string => {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  if (s === "" || s.toUpperCase() === "NIL" || s === "-" || s.toLowerCase() === "undefined") return "";
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}/${month}/${day}`;
  }
  return s;
};

const parseSheetDate = (sheetName: string): number => {
  const cleanName = sheetName.toUpperCase();
  const months: Record<string, number> = {
    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
  };
  const match = cleanName.match(/(\d+)(?:ST|ND|RD|TH)?\s+([A-Z]{3})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = months[match[2]] ?? 0;
    return new Date(2025, month, day).getTime();
  }
  return 0;
};

const StarField: React.FC = () => {
  const stars = useMemo(() => Array.from({ length: 150 }).map((_, i) => ({
    id: i, size: Math.random() * 2 + 1, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`, duration: `${3 + Math.random() * 4}s`, opacity: Math.random() * 0.7 + 0.3,
    color: i % 10 === 0 ? '#06B6D4' : i % 15 === 0 ? '#8B5CF6' : 'white'
  })), []);
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {stars.map((star) => (
        <div key={star.id} className="star animate-twinkle" style={{
          width: `${star.size}px`, height: `${star.size}px`, top: star.top, left: star.left,
          backgroundColor: star.color, boxShadow: `0 0 ${star.size * 2}px ${star.color}`,
          animationDelay: star.delay, animationDuration: star.duration, opacity: star.opacity
        }} />
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!sessionStorage.getItem('ok'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [enlargedModal, setEnlargedModal] = useState<'projects-prod' | 'projects-hourly' | 'sheets' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProdProjectIds, setSelectedProdProjectIds] = useState<string[]>([]);
  const [selectedHourlyProjectIds, setSelectedHourlyProjectIds] = useState<string[]>([]);
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [availableSheets, setAvailableSheets] = useState<{ id: string; label: string; projectId: string; sheetName: string }[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [rawData, setRawData] = useState<RawRow[]>([]);

  const combinedSelectedProjectIds = useMemo(() => [...selectedProdProjectIds, ...selectedHourlyProjectIds], [selectedProdProjectIds, selectedHourlyProjectIds]);
  const productionRawData = useMemo(() => rawData.filter(row => row['__projectCategory'] === 'production'), [rawData]);

  const todaysBirthdays = useMemo(() => {
    const today = new Date().toISOString().slice(5, 10); // MM-DD
    return BIRTHDAYS.filter(b => b.date === today);
  }, []);

  const groupedSheetsForUI = useMemo(() => {
    return combinedSelectedProjectIds.map(pid => {
      const project = projects.find(p => p.id === pid);
      const sheets = availableSheets.filter(s => s.projectId === pid).map(s => s.id);
      return { title: project?.name || 'Unknown Project', color: project?.color, options: sheets };
    }).filter(g => g.options.length > 0);
  }, [combinedSelectedProjectIds, availableSheets, projects]);

  useEffect(() => {
    if (isAuthenticated) {
      const loadProjects = async () => {
        setIsLoading(true);
        const globalProjects = await fetchGlobalProjects();
        setProjects(globalProjects);
        setIsLoading(false);
      };
      loadProjects();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && combinedSelectedProjectIds.length > 0) {
      const loadSheets = async () => {
        setIsLoading(true);
        const all: { id: string; label: string; projectId: string; sheetName: string }[] = [];
        const promises = combinedSelectedProjectIds.map(async (pid) => {
          const project = projects.find(p => p.id === pid);
          if (!project) return;
          
          const namesSet = new Set<string>();

          // 1. Priority: Use manually entered custom sheets if provided
          if (project.customSheets) {
            project.customSheets.split(',').map(s => s.trim()).filter(s => !!s).forEach(s => namesSet.add(s));
          }

          // 2. Fallback/Supplement: Auto-discover sheets based on category keyword matching
          const discoveredNames = await fetchSheetList(project.spreadsheetId, project.category);
          discoveredNames.forEach(name => namesSet.add(name));

          Array.from(namesSet).forEach(name => {
            all.push({ id: `${pid}|${name}`, label: name, projectId: pid, sheetName: name });
          });
        });
        await Promise.all(promises);
        setAvailableSheets(all);
        setIsLoading(false);
      };
      loadSheets();
    } else {
      setAvailableSheets([]);
      if (combinedSelectedProjectIds.length === 0) setRawData([]);
    }
  }, [isAuthenticated, combinedSelectedProjectIds, projects]);

  useEffect(() => {
    if (isAuthenticated && selectedSheetIds.length > 0) {
      const mergeData = async () => {
        setIsDataLoading(true);
        const merged: RawRow[] = [];
        const taskPromises = selectedSheetIds.map(async (id) => {
          const [pid, sname] = id.split('|');
          const p = projects.find(proj => proj.id === pid);
          if (p) {
            const data = await getSheetData(p.spreadsheetId, sname);
            const headers = data.length > 0 ? Object.keys(data[0]) : [];
            return data.map(row => {
              const processed: RawRow = {};
              headers.forEach(h => {
                let val = row[h];
                if (h.toLowerCase().includes('date')) val = normalizeDateValue(val);
                processed[h] = val;
              });
              return { ...processed, '__projectSource': p.name, '__projectCategory': p.category, '__sheetSource': sname };
            });
          }
          return [];
        });
        const results = await Promise.all(taskPromises);
        results.forEach(res => merged.push(...res));
        setRawData(merged);
        setIsDataLoading(false);
      };
      mergeData();
    } else setRawData([]);
  }, [isAuthenticated, selectedSheetIds, projects]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = username.trim();
    const pass = password.trim();
    if (VALID_USERS[user] && VALID_USERS[user] === pass) {
      sessionStorage.setItem('ok', '1');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password.');
    }
  };

  const handleLogout = () => { 
    sessionStorage.removeItem('ok'); 
    setIsAuthenticated(false); 
    setRawData([]); 
    setSelectedProdProjectIds([]);
    setSelectedHourlyProjectIds([]);
    setSelectedSheetIds([]);
  };

  const addProject = async (p: Omit<Project, 'id' | 'color'>) => {
    const cols = [COLORS.primary, COLORS.secondary, COLORS.accent];
    const newP = { ...p, id: Date.now().toString(), color: cols[Math.floor(Math.random() * cols.length)] } as Project;
    const up = [...projects, newP]; setProjects(up); await saveGlobalProjects(up);
  };

  const updateProject = async (u: Project) => {
    const list = projects.map(p => p.id === u.id ? u : p); setProjects(list); await saveGlobalProjects(list);
  };

  const deleteProject = async (id: string) => {
    const list = projects.filter(p => p.id !== id); setProjects(list); await saveGlobalProjects(list);
    setSelectedProdProjectIds(prev => prev.filter(p => p !== id));
    setSelectedHourlyProjectIds(prev => prev.filter(p => p !== id));
    setSelectedSheetIds(prev => prev.filter(s => !s.startsWith(`${id}|`)));
  };

  const handleSelectProject = (id: string) => {
    const p = projects.find(proj => proj.id === id); if (!p) return;
    if (p.category === 'production') setSelectedProdProjectIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    else setSelectedHourlyProjectIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const processedSummaries = useMemo(() => {
    if (!rawData.length) return { annotators: [], users: [], qcUsers: [], qcAnn: [], combinedPerformance: [], attendance: [], attendanceHeaders: [] };
    const allKeys = Array.from(new Set(rawData.flatMap(row => Object.keys(row)) as string[]));
    const kAnn = findKey(allKeys, "Annotator Name"), kUser = findKey(allKeys, "UserName"), kFrame = findKey(allKeys, "Frame ID"), kObj = findKey(allKeys, "Number of Object Annotated"), kQC = findKey(allKeys, "Internal QC Name"), kErr = findKey(allKeys, "Internal Polygon Error Count");
    const clean = (v: any) => {
      let val = String(v || '').trim();
      if (!val || val.toLowerCase() === 'undefined' || val.toLowerCase() === 'nil') return '';
      return val.includes('@') ? val : `${val}@rprocess.in`;
    };
    const annotatorMap: Record<string, { frameSet: Set<string>, objects: number }> = {};
    const userMap: Record<string, { frameSet: Set<string>, objects: number }> = {};
    const qcUserMap: Record<string, { objects: number, errors: number }> = {};
    const qcAnnMap: Record<string, { objects: number, errors: number }> = {};
    const combinedPerf: Record<string, { objects: number }> = {};
    const empData: Record<string, { sno: string, name: string, empCode: string }> = {}, attRecords: Record<string, Record<string, 'Present' | 'Absent' | 'P(1/2)'>> = {}, uniqueSheets = new Set<string>();

    rawData.forEach(row => {
      const category = row['__projectCategory'], sheet = String(row['__sheetSource'] || '');
      if (category === 'production') {
        const ann = clean(row[kAnn || ''] || row[kUser || '']), usr = kUser ? clean(row[kUser]) : '';
        const fId = String(row[kFrame || ''] || '').trim(), objs = parseFloat(String(row[kObj || ''] || '0')) || 0;
        const qcN = String(row[kQC || ''] || '').trim(), errs = parseFloat(String(row[kErr || ''] || '0')) || 0;
        if (ann) {
          if (!annotatorMap[ann]) annotatorMap[ann] = { frameSet: new Set(), objects: 0 };
          if (fId) annotatorMap[ann].frameSet.add(fId); annotatorMap[ann].objects += objs;
          if (qcN && qcN !== 'nil' && qcN !== '0') {
            if (!qcAnnMap[ann]) qcAnnMap[ann] = { objects: 0, errors: 0 };
            qcAnnMap[ann].objects += objs; qcAnnMap[ann].errors += errs;
          }
        }
        if (kUser && usr) {
          if (!userMap[usr]) userMap[usr] = { frameSet: new Set(), objects: 0 };
          if (fId) userMap[usr].frameSet.add(fId); userMap[usr].objects += objs;
          if (qcN && qcN !== 'nil' && qcN !== '0') {
            if (!qcUserMap[usr]) qcUserMap[usr] = { objects: 0, errors: 0 };
            qcUserMap[usr].objects += objs; qcUserMap[usr].errors += errs;
          }
        }
        const primary = ann || usr; if (primary) {
          if (!combinedPerf[primary]) combinedPerf[primary] = { objects: 0 };
          combinedPerf[primary].objects += objs;
        }
      }
      if (category === 'hourly') {
        uniqueSheets.add(sheet);
        const keys = Object.keys(row);
        const sno = String(row[keys[0]] || '').trim(), name = String(row[keys[1]] || '').trim();
        const kEmpCode = findKey(keys, "Employee Code") || findKey(keys, "Emp Code") || findKey(keys, "Emp ID") || keys[2];
        const empCode = String(row[kEmpCode] || '').trim();
        const workingHrs = parseFloat(String(row[keys[3]] || '0')) || 0;
        const hasLogin = String(row[keys[5]] || '').trim() !== "" && String(row[keys[5]] || '').toLowerCase() !== "nil";
        if (name && name !== "") {
          let status: 'Present' | 'Absent' | 'P(1/2)' = hasLogin ? (workingHrs < 5 ? 'P(1/2)' : 'Present') : 'Absent';
          if (!empData[name]) empData[name] = { sno, name, empCode };
          if (!attRecords[name]) attRecords[name] = {};
          attRecords[name][sheet] = status;
        }
      }
    });

    const sortedSheets = Array.from(uniqueSheets).sort((a, b) => parseSheetDate(a) - parseSheetDate(b));
    const attFlat = Object.keys(empData).map(name => {
      const m = empData[name], r: Record<string, string> = { SNO: m.sno, NAME: m.name, 'EMP CODE': m.empCode };
      sortedSheets.forEach(s => r[s] = attRecords[name][s] || 'NIL');
      return r;
    });

    return {
      annotators: Object.entries(annotatorMap).map(([n, d]) => ({ NAME: n, FRAMECOUNT: d.frameSet.size, OBJECTCOUNT: d.objects })),
      users: kUser ? Object.entries(userMap).map(([n, d]) => ({ NAME: n.split('@')[0], FRAMECOUNT: d.frameSet.size, OBJECTCOUNT: d.objects })) : [],
      qcUsers: kUser ? Object.entries(qcUserMap).map(([n, d]) => ({ NAME: n.split('@')[0], OBJECTCOUNT: d.objects, ERRORCOUNT: d.errors })) : [],
      qcAnn: Object.entries(qcAnnMap).map(([n, d]) => ({ NAME: n, OBJECTCOUNT: d.objects, ERRORCOUNT: d.errors })),
      combinedPerformance: Object.entries(combinedPerf).map(([n, d]) => ({ name: n, value: d.objects })),
      attendance: attFlat, attendanceHeaders: ['SNO', 'NAME', 'EMP CODE', ...sortedSheets]
    };
  }, [rawData]);

  const metrics = useMemo(() => {
    const prod = rawData.filter(r => r['__projectCategory'] === 'production');
    const allKeys = Array.from(new Set(rawData.flatMap(r => Object.keys(r)) as string[]));
    const kF = findKey(allKeys, "Frame ID"), kQC = findKey(allKeys, "Internal QC Name"), kObj = findKey(allKeys, "Number of Object Annotated"), kErr = findKey(allKeys, "Internal Polygon Error Count");
    const frames = new Set<string>();
    let totObj = 0, qcObj = 0, totErr = 0;
    prod.forEach(r => {
      const f = String(r[kF || ''] || '').trim(); if (f) frames.add(f);
      const objs = parseFloat(String(r[kObj || ''] || '0')) || 0; totObj += objs;
      const qcN = String(r[kQC || ''] || '').trim();
      if (qcN && qcN !== 'nil' && qcN !== '0') { qcObj += objs; totErr += parseFloat(String(r[kErr || ''] || '0')) || 0; }
    });
    return [
      { label: 'Total Frames', value: frames.size, icon: '🎞️', color: COLORS.primary },
      { label: 'Total Objects', value: totObj.toLocaleString(), icon: '📦', color: COLORS.accent },
      { label: 'QC Total Objects', value: qcObj.toLocaleString(), icon: '🎯', color: COLORS.secondary },
      { label: 'Total Errors', value: totErr, icon: '⚠️', color: COLORS.danger },
      { label: 'Quality Rate', value: qcObj > 0 ? (((qcObj - totErr) / qcObj) * 100).toFixed(2) + '%' : '0%', icon: '✨', color: COLORS.success }
    ];
  }, [rawData]);

  const chartPerfData = useMemo(() => [...processedSummaries.combinedPerformance].sort((a,b) => b.value - a.value), [processedSummaries]);
  const rawHeaders = useMemo(() => (Array.from(new Set(productionRawData.flatMap(row => Object.keys(row)))) as string[]).filter(k => !k.startsWith('__')), [productionRawData]);

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <StarField />
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-[32px] border border-white/10 p-10 md:p-14 rounded-[3.5rem] shadow-2xl animate-fade-up login-glow mt-auto relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black tracking-widest uppercase mb-4">Secure Portal</div>
          <h1 className="text-5xl font-black shimmer-text py-2">DesiCrew</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </span>
            <input 
              type="text" 
              placeholder="Username" 
              required 
              className="w-full bg-slate-900/60 border border-slate-800/80 text-white pl-14 pr-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
          </div>

          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </span>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              required 
              className="w-full bg-slate-900/60 border border-slate-800/80 text-white pl-14 pr-14 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>

          {loginError && <p className="text-red-400 text-xs font-bold text-center px-4 animate-shake">{loginError}</p>}
          <button type="submit" className="w-full h-14 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95">Access Dashboard</button>
        </form>
      </div>
      <div className="mt-auto w-full max-w-md z-10 relative"><InfoFooter /></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden relative">
      <StarField />
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col z-20 transition-all duration-300 relative ${isSidebarOpen ? 'w-96' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar min-w-[24rem]">
          <h2 className="text-3xl font-black text-white mb-5">DesiCrew</h2>
          <nav className="space-y-1 mb-5">
            {MENU_ITEMS.map((m) => (
              <button key={m.id} onClick={() => setCurrentView(m.id as ViewType)} className={`w-full text-left px-4 py-2.5 rounded-2xl flex items-center gap-3 transition-all ${currentView === m.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <span className="text-xl">{m.icon}</span><span className="font-bold">{m.label}</span>
              </button>
            ))}
          </nav>
          <div className="space-y-3">
            <MultiSelect title="PRODUCTION PROJECTS" options={projects.filter(p => p.category === 'production').map(p => p.id)} selected={selectedProdProjectIds} onChange={setSelectedProdProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onEnlarge={() => setEnlargedModal('projects-prod')} />
            <MultiSelect title="HOURLY PROJECTS" options={projects.filter(p => p.category === 'hourly').map(p => p.id)} selected={selectedHourlyProjectIds} onChange={setSelectedHourlyProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onEnlarge={() => setEnlargedModal('projects-hourly')} />
            {combinedSelectedProjectIds.length > 0 && (
              <MultiSelect title="SELECT DATA SHEETS" options={availableSheets.map(s => s.id)} selected={selectedSheetIds} onChange={setSelectedSheetIds} labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})} groups={groupedSheetsForUI} onEnlarge={() => setEnlargedModal('sheets')} />
            )}
          </div>
        </div>
        <div className="p-6 bg-slate-900 border-t border-slate-800 min-w-[24rem]">
          <button onClick={() => setShowProjectManager(true)} className="w-full bg-slate-800/40 py-3 rounded-2xl text-sm font-bold border border-slate-700/60 shadow-xl flex items-center justify-center gap-2 text-slate-300 hover:text-white transition-all">⚙️ Project Setup</button>
        </div>
      </aside>

      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`fixed top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-100 shadow-2xl transition-all duration-300 ${isSidebarOpen ? 'left-[23.2rem]' : 'left-6'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`${isSidebarOpen ? '' : 'rotate-180'}`}><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <main className="flex-1 overflow-auto bg-slate-950 p-6 md:p-10 custom-scrollbar relative z-10">
        <header className="flex justify-between items-center mb-10 ml-12">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white tracking-tight">{MENU_ITEMS.find(m => m.id === currentView)?.label || 'Overview'}</h1>
            <p className="text-slate-400 text-sm mt-1">Manual Sheet & Keywords Sync active</p>
          </div>
          
          <BirthdayNotice birthdays={todaysBirthdays} />

          <button onClick={handleLogout} className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center transition-all hover:bg-red-500/20 ml-4" title="Logout">🚪</button>
        </header>

        {(isDataLoading || isLoading) && (
          <div className="h-[10vh] flex flex-col items-center justify-center space-y-4 mb-8">
            <div className="w-8 h-8 border-4 border-violet-600/10 border-t-violet-600 rounded-full animate-spin"></div>
            <h3 className="text-white font-black text-xs uppercase tracking-widest">Discovering & Synchronizing Data...</h3>
          </div>
        )}

        <div className="space-y-10 pb-20">
          {combinedSelectedProjectIds.length === 0 || selectedSheetIds.length === 0 ? (
            <div className="h-[40vh] flex flex-col items-center justify-center border-4 border-dashed border-slate-900 rounded-[3rem] text-slate-700 space-y-4">
              <h3 className="text-slate-400 font-bold text-lg uppercase tracking-widest">No Active Data Sources</h3>
              <p className="text-slate-600 text-sm px-10 text-center">Add projects in Project Setup. If auto-discovery fails, manually add sheet names.</p>
            </div>
          ) : (
            <>
              {currentView === 'overview' && (
                <>
                  <SummaryCards metrics={metrics} />
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    <div className="xl:col-span-3"><OverallPieChart data={chartPerfData} title="Performance Split" /></div>
                    <div className="xl:col-span-2"><UserQualityChart data={processedSummaries.qcAnn} title="Top Quality Rates" /></div>
                  </div>
                </>
              )}
              {currentView === 'raw' && <DataTable title="Raw Intelligence" headers={rawHeaders} data={productionRawData} filterColumns={['Task', 'Annotator Name', 'DATE']} />}
              {currentView === 'annotator' && <DataTable title="Annotator Summary" headers={['NAME', 'FRAMECOUNT', 'OBJECTCOUNT']} data={processedSummaries.annotators} filterColumns={['NAME']} />}
              {currentView === 'username' && <DataTable title="UserName Summary" headers={['NAME', 'FRAMECOUNT', 'OBJECTCOUNT']} data={processedSummaries.users} filterColumns={['NAME']} />}
              {currentView === 'qc-annotator' && <DataTable title="QC (Annotator)" headers={['NAME', 'OBJECTCOUNT', 'ERRORCOUNT']} data={processedSummaries.qcAnn} filterColumns={['NAME']} />}
              {currentView === 'qc-user' && <DataTable title="QC (UserName)" headers={['NAME', 'OBJECTCOUNT', 'ERRORCOUNT']} data={processedSummaries.qcUsers} filterColumns={['NAME']} />}
              {currentView === 'attendance' && <DataTable title="Attendance Summary" headers={processedSummaries.attendanceHeaders} data={processedSummaries.attendance} filterColumns={['NAME', 'EMP CODE']} />}
            </>
          )}
        </div>
      </main>

      {showProjectManager && <ProjectManager projects={projects} selectedProjectIds={combinedSelectedProjectIds} userRole="desicrew" onAdd={addProject} onUpdate={updateProject} onDelete={deleteProject} onSelect={handleSelectProject} onClose={() => setShowProjectManager(false)} />}
      {enlargedModal === 'projects-prod' && <SelectionModal title="Production Projects" options={projects.filter(p => p.category === 'production').map(p => p.id)} selected={selectedProdProjectIds} onChange={setSelectedProdProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onClose={() => setEnlargedModal(null)} />}
      {enlargedModal === 'projects-hourly' && <SelectionModal title="Hourly Projects" options={projects.filter(p => p.category === 'hourly').map(p => p.id)} selected={selectedHourlyProjectIds} onChange={setSelectedHourlyProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onClose={() => setEnlargedModal(null)} />}
      {enlargedModal === 'sheets' && <SelectionModal title="Data Sheets" options={availableSheets.map(s => s.id)} selected={selectedSheetIds} onChange={setSelectedSheetIds} labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})} groups={groupedSheetsForUI} onClose={() => setEnlargedModal(null)} />}
    </div>
  );
};

export default App;
