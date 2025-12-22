import React, { useState, useEffect, useMemo } from 'react';
import { ViewType, RawRow, Project } from './types';
import { getSheetList, getSheetData, login as apiLogin, findKey } from './services/api';
import { MENU_ITEMS, COLORS, API_URL } from './constants';
import MultiSelect from './components/MultiSelect';
import DataTable from './components/DataTable';
import OverallPieChart from './components/OverallPieChart';
import SummaryCards from './components/SummaryCards';
import ProjectManager from './components/ProjectManager';
import SelectionModal from './components/SelectionModal';
import UserQualityChart from './components/UserQualityChart';

const DEFAULT_PROJECTS: Project[] = [
  { id: '1', name: 'Default Production', url: API_URL, color: COLORS.primary, category: 'production' }
];

// Helper to generate stars for the Milky Way effect
const StarField: React.FC = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
      opacity: Math.random() * 0.7 + 0.3,
      color: i % 10 === 0 ? '#06B6D4' : i % 15 === 0 ? '#8B5CF6' : 'white'
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star animate-twinkle"
          style={{
            width: `${star.size}px`,
            height: `${star.size}px`,
            top: star.top,
            left: star.left,
            backgroundColor: star.color,
            boxShadow: `0 0 ${star.size * 2}px ${star.color}`,
            animationDelay: star.delay,
            animationDuration: star.duration,
            opacity: star.opacity
          }}
        />
      ))}
      {/* Nebula Clouds */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-40 mix-blend-screen">
        <div className="absolute top-[20%] left-[10%] w-[800px] h-[800px] bg-violet-900/20 rounded-full blur-[160px] animate-drift"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[900px] h-[900px] bg-indigo-900/20 rounded-full blur-[180px] animate-drift" style={{ animationDelay: '-7s' }}></div>
        <div className="absolute top-[40%] left-[30%] w-[700px] h-[700px] bg-cyan-900/10 rounded-full blur-[140px] animate-drift" style={{ animationDelay: '-12s' }}></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!sessionStorage.getItem('ok'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [enlargedModal, setEnlargedModal] = useState<'projects-prod' | 'projects-hourly' | 'sheets' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('annotation_projects_v2');
    if (saved) return JSON.parse(saved);
    const legacy = localStorage.getItem('annotation_projects');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      return parsed.map((p: any) => ({ ...p, category: p.category || 'production' }));
    }
    return DEFAULT_PROJECTS;
  });
  
  const [selectedProdProjectIds, setSelectedProdProjectIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('selected_prod_project_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedHourlyProjectIds, setSelectedHourlyProjectIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('selected_hourly_project_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const combinedSelectedProjectIds = useMemo(() => 
    [...selectedProdProjectIds, ...selectedHourlyProjectIds]
  , [selectedProdProjectIds, selectedHourlyProjectIds]);

  const [availableSheets, setAvailableSheets] = useState<{ id: string; label: string; projectId: string; sheetName: string }[]>([]);
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('selected_sheet_ids');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [rawData, setRawData] = useState<RawRow[]>([]);

  useEffect(() => {
    localStorage.setItem('annotation_projects_v2', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('selected_prod_project_ids', JSON.stringify(selectedProdProjectIds));
  }, [selectedProdProjectIds]);

  useEffect(() => {
    localStorage.setItem('selected_hourly_project_ids', JSON.stringify(selectedHourlyProjectIds));
  }, [selectedHourlyProjectIds]);

  useEffect(() => {
    localStorage.setItem('selected_sheet_ids', JSON.stringify(selectedSheetIds));
  }, [selectedSheetIds]);

  useEffect(() => {
    if (isAuthenticated && combinedSelectedProjectIds.length > 0) {
      const fetchAllSheets = async () => {
        setIsLoading(true);
        const allSheets: { id: string; label: string; projectId: string; sheetName: string }[] = [];
        
        await Promise.all(combinedSelectedProjectIds.map(async (pid) => {
          const project = projects.find(p => p.id === pid);
          if (project) {
            const list = await getSheetList(project.url);
            list.forEach(sheetName => {
              const isHourly = project.category === 'hourly';
              const sNameLower = sheetName.toLowerCase();
              const containsLogin = sNameLower.includes('login');
              const containsCredential = sNameLower.includes('credential');
              
              if (!isHourly || (containsLogin && !containsCredential)) {
                allSheets.push({
                  id: `${pid}|${sheetName}`,
                  label: `[${project.name}] ${sheetName}`,
                  projectId: pid,
                  sheetName: sheetName
                });
              }
            });
          }
        }));
        
        setAvailableSheets(allSheets);
        setIsLoading(false);
      };
      fetchAllSheets();
    } else {
      setAvailableSheets([]);
      if (combinedSelectedProjectIds.length === 0) {
        setRawData([]);
      }
    }
  }, [isAuthenticated, combinedSelectedProjectIds, projects]);

  useEffect(() => {
    if (availableSheets.length > 0) {
      const availableIds = new Set(availableSheets.map(s => s.id));
      const validSelectedIds = selectedSheetIds.filter(id => availableIds.has(id));
      if (validSelectedIds.length !== selectedSheetIds.length) {
        setSelectedSheetIds(validSelectedIds);
      }
    }
  }, [availableSheets]);

  const formatDateString = (val: any): string => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    if (isAuthenticated && selectedSheetIds.length > 0) {
      const fetchAndMergeData = async () => {
        setIsDataLoading(true);
        const projectGroups: Record<string, string[]> = {};
        selectedSheetIds.forEach(id => {
          const [pid, sname] = id.split('|');
          if (!projectGroups[pid]) projectGroups[pid] = [];
          projectGroups[pid].push(sname);
        });

        const merged: RawRow[] = [];
        await Promise.all(Object.entries(projectGroups).map(async ([pid, sheetNames]) => {
          const project = projects.find(p => p.id === pid);
          if (project) {
            await Promise.all(sheetNames.map(async (sname) => {
              const data = await getSheetData(project.url, sname);
              const currentKeys = data.length > 0 ? Object.keys(data[0]) : [];
              const dateKey = findKey(currentKeys, "Date");

              merged.push(...data.map(row => {
                const processedRow = { ...row };
                if (dateKey && processedRow[dateKey]) {
                  processedRow[dateKey] = formatDateString(processedRow[dateKey]);
                }
                return {
                  ...processedRow,
                  'Project Source': project.name,
                  'Project Category': project.category,
                  'Sheet Source': sname 
                };
              }));
            }));
          }
        }));
        setRawData(merged);
        setIsDataLoading(false);
      };
      fetchAndMergeData();
    } else {
      setRawData([]);
    }
  }, [isAuthenticated, selectedSheetIds, projects]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    const targetProject = projects.find(p => combinedSelectedProjectIds.includes(p.id)) || projects[0];
    const res = await apiLogin(targetProject.url, username, password);
    if (res.success) {
      sessionStorage.setItem('ok', '1');
      setIsAuthenticated(true);
    } else {
      setLoginError(res.message || 'Invalid login credentials');
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ok');
    setIsAuthenticated(false);
    setRawData([]);
    setSelectedSheetIds([]);
  };

  const addProject = (p: Omit<Project, 'id' | 'color'>) => {
    const availableColors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.success, COLORS.warning, COLORS.danger];
    const newProject: Project = {
      ...p,
      id: Date.now().toString(),
      color: availableColors[Math.floor(Math.random() * availableColors.length)]
    };
    setProjects(prev => [...prev, newProject]);
    if (p.category === 'production') {
      setSelectedProdProjectIds(prev => [...prev, newProject.id]);
    } else {
      setSelectedHourlyProjectIds(prev => [...prev, newProject.id]);
    }
  };

  const updateProject = (updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    setSelectedProdProjectIds(prev => prev.filter(pid => pid !== id));
    setSelectedHourlyProjectIds(prev => prev.filter(pid => pid !== id));
  };

  const processedSummaries = useMemo(() => {
    if (!rawData.length) return { annotators: [], users: [], qcUsers: [], qcAnn: [] };

    const keys = Object.keys(rawData[0]);
    const kAnn = findKey(keys, "Annotator Name");
    const kUser = findKey(keys, "UserName");
    const kFrame = findKey(keys, "Frame ID");
    const kObj = findKey(keys, "Number of Object Annotated");
    const kQC = findKey(keys, "Internal QC Name");
    const kErr = findKey(keys, "Internal Polygon Error Count");

    const annotatorMap: Record<string, { frameSet: Set<string>, objects: number }> = {};
    const userMap: Record<string, { frameSet: Set<string>, objects: number }> = {};
    const qcUserMap: Record<string, { objects: number, errors: number }> = {};
    const qcAnnMap: Record<string, { objects: number, errors: number }> = {};

    rawData.forEach(row => {
      const ann = String(row[kAnn || ''] || '').trim();
      const user = String(row[kUser || ''] || '').trim();
      const frameId = String(row[kFrame || ''] || '').trim();
      
      const objCount = parseFloat(String(row[kObj || ''] || '0')) || 0;
      const qcName = String(row[kQC || ''] || '').trim();
      const errCount = parseFloat(String(row[kErr || ''] || '0')) || 0;

      if (ann) {
        if (!annotatorMap[ann]) annotatorMap[ann] = { frameSet: new Set(), objects: 0 };
        if (frameId) annotatorMap[ann].frameSet.add(frameId);
        annotatorMap[ann].objects += objCount;

        if (qcName) {
          if (!qcAnnMap[ann]) qcAnnMap[ann] = { objects: 0, errors: 0 };
          qcAnnMap[ann].objects += objCount;
          qcAnnMap[ann].errors += errCount;
        }
      }

      if (user) {
        if (!userMap[user]) userMap[user] = { frameSet: new Set(), objects: 0 };
        if (frameId) userMap[user].frameSet.add(frameId);
        userMap[user].objects += objCount;

        if (qcName) {
          if (!qcUserMap[user]) qcUserMap[user] = { objects: 0, errors: 0 };
          qcUserMap[user].objects += objCount;
          qcUserMap[user].errors += errCount;
        }
      }
    });

    return {
      annotators: Object.entries(annotatorMap).map(([name, data]) => ({
        name,
        frameCount: data.frameSet.size,
        objectCount: data.objects
      })).sort((a,b) => b.objectCount - a.objectCount),
      users: Object.entries(userMap).map(([name, data]) => ({
        name,
        frameCount: data.frameSet.size,
        objectCount: data.objects
      })).sort((a,b) => b.objectCount - a.objectCount),
      qcUsers: Object.entries(qcUserMap).map(([name, data]) => ({
        name,
        objectCount: data.objects,
        errorCount: data.errors
      })).sort((a,b) => b.objectCount - a.objectCount),
      qcAnn: Object.entries(qcAnnMap).map(([name, data]) => ({
        name,
        objectCount: data.objects,
        errorCount: data.errors
      })).sort((a,b) => b.objectCount - a.objectCount)
    };
  }, [rawData]);

  const metrics = useMemo(() => {
    const globalFrames = new Set<string>();
    const keys = rawData.length > 0 ? Object.keys(rawData[0]) : [];
    const kFrame = findKey(keys, "Frame ID");
    rawData.forEach(r => {
      const f = String(r[kFrame || ''] || '').trim();
      if (f) globalFrames.add(f);
    });

    const totalObjects = processedSummaries.annotators.reduce((acc, cur) => acc + cur.objectCount, 0);
    const qcObjectsCount = processedSummaries.qcAnn.reduce((acc, cur) => acc + cur.objectCount, 0);
    const totalErrors = processedSummaries.qcAnn.reduce((acc, cur) => acc + cur.errorCount, 0);
    
    const qualityRate = qcObjectsCount > 0 
      ? (((qcObjectsCount - totalErrors) / qcObjectsCount) * 100).toFixed(2) + '%' 
      : '0%';

    return [
      { label: 'Total Frames', value: globalFrames.size, icon: '🎞️', color: COLORS.primary },
      { label: 'Total Objects', value: totalObjects.toLocaleString(), icon: '📦', color: COLORS.accent },
      { label: 'QC Total Objects', value: qcObjectsCount.toLocaleString(), icon: '🎯', color: COLORS.secondary },
      { label: 'Total Errors', value: totalErrors, icon: '⚠️', color: COLORS.danger },
      { label: 'Quality Rate', value: qualityRate, icon: '✨', color: COLORS.success },
    ];
  }, [processedSummaries, rawData]);

  const pieData = useMemo(() => {
    const top = [...processedSummaries.annotators].slice(0, 5);
    const otherSum = processedSummaries.annotators.slice(5).reduce((acc, cur) => acc + cur.objectCount, 0);

    const data = top.map(a => ({ name: a.name, value: a.objectCount }));
    if (otherSum > 0) data.push({ name: 'Others', value: otherSum });
    return data;
  }, [processedSummaries]);

  const rawHeaders = rawData.length > 0 ? Object.keys(rawData[0]) : [];
  const kTask = findKey(rawHeaders, "Task") || "Task";
  const kLabelSet = findKey(rawHeaders, "Label Set") || "Label Set";
  const kAnnotatorName = findKey(rawHeaders, "Annotator Name") || "Annotator Name";
  const kUserName = findKey(rawHeaders, "UserName") || "UserName";
  const kDate = findKey(rawHeaders, "Date") || "Date";

  const prodProjects = projects.filter(p => p.category === 'production');
  const hourlyProjects = projects.filter(p => p.category === 'hourly');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
        <StarField />

        {/* Login Container */}
        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-[32px] border border-white/10 p-10 md:p-14 rounded-[3.5rem] shadow-2xl relative z-10 animate-fade-up login-glow">
          <div className="relative z-10 text-center mb-12">
             <div className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black tracking-widest uppercase mb-4">
               Secure Network Portal
             </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter shimmer-text py-2">
              DesiCrew
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-500 group-focus-within:text-violet-400 transition-colors">👤</span>
                </div>
                <input
                  type="text"
                  placeholder="Username"
                  required
                  className="w-full bg-slate-900/60 border border-slate-800/80 text-white pl-12 pr-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder-slate-600 text-sm font-medium"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-500 group-focus-within:text-violet-400 transition-colors">🔒</span>
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  required
                  className="w-full bg-slate-900/60 border border-slate-800/80 text-white pl-12 pr-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder-slate-600 text-sm font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold justify-center bg-rose-500/5 py-3 rounded-xl border border-rose-500/10 animate-pulse">
                <span>⚠️</span> {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full h-14 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-xs uppercase tracking-[0.2em] overflow-hidden"
            >
              <span className="relative z-10">
                {isLoading ? 'Establishing Connection...' : 'Enter Dashboard'}
              </span>
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          </form>
        </div>
        
        {/* Footer text */}
        <div className="fixed bottom-8 text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] pointer-events-none mix-blend-screen opacity-50">
          Precision • Efficiency • Scale
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden">
      <aside 
        className={`bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl transition-all duration-300 ease-in-out relative ${
          isSidebarOpen ? 'w-96 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full overflow-hidden'
        }`}
      >
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6 min-w-[24rem]">
          <div className="flex flex-col items-start gap-1 mb-6">
            <h2 className="text-3xl font-black text-white tracking-tighter">DesiCrew</h2>
          </div>

          <nav className="space-y-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 transition-all ${
                  currentView === item.id
                    ? 'bg-violet-600 text-white shadow-xl ring-1 ring-violet-400/50'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>

          <hr className="border-slate-800" />

          <div className="space-y-6">
            <MultiSelect 
              options={prodProjects.map(p => p.id)}
              selected={selectedProdProjectIds}
              onChange={setSelectedProdProjectIds}
              labels={prodProjects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})}
              title="Select Spreadsheets (Production)"
              onEnlarge={() => setEnlargedModal('projects-prod')}
            />

            <MultiSelect 
              options={hourlyProjects.map(p => p.id)}
              selected={selectedHourlyProjectIds}
              onChange={setSelectedHourlyProjectIds}
              labels={hourlyProjects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})}
              title="Select Spreadsheets (Hourly)"
              onEnlarge={() => setEnlargedModal('projects-hourly')}
            />

            <MultiSelect 
              options={availableSheets.map(s => s.id)}
              selected={selectedSheetIds}
              onChange={setSelectedSheetIds}
              labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})}
              title="Select Data Sheets"
              onEnlarge={() => setEnlargedModal('sheets')}
            />
          </div>
        </div>

        <div className="p-8 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 min-w-[24rem] space-y-3">
          <button
            onClick={() => setShowProjectManager(true)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm border border-slate-700 shadow-xl"
          >
            ⚙️ Project Setup
          </button>
        </div>
      </aside>

      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-100 shadow-2xl transition-all duration-300 hover:bg-violet-600 hover:border-violet-500 group ${
          isSidebarOpen ? 'left-[23.2rem]' : 'left-6'
        }`}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={`transition-transform duration-300 ${isSidebarOpen ? 'rotate-0' : 'rotate-180'}`}
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <main className="flex-1 overflow-auto bg-slate-950 p-6 md:p-10 custom-scrollbar transition-all duration-300">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex-1">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
              {MENU_ITEMS.find(m => m.id === currentView)?.label || 'Dashboard'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Synchronized view of <span className="text-violet-400 font-bold">{selectedSheetIds.length}</span> datasets from <span className="text-violet-400 font-bold">{combinedSelectedProjectIds.length}</span> sources.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {(isDataLoading || isLoading) && (
               <div className="flex items-center gap-2 text-xs text-violet-400 font-bold animate-pulse bg-violet-400/5 px-4 py-2 rounded-xl border border-violet-400/20 shadow-lg">
                 <div className="w-2 h-2 bg-violet-400 rounded-full animate-ping"></div>
                 Data Refresh in Progress
               </div>
             )}
             <button 
                onClick={handleLogout}
                className="group relative w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-xl transition-all hover:bg-red-500/20 hover:border-red-500/50 overflow-hidden"
                title="Secure Logout"
             >
                <div className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-red-400 transition-colors">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </div>
             </button>
          </div>
        </header>

        {(isDataLoading || isLoading) && rawData.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 text-center">
             <div className="relative">
                <div className="w-20 h-20 border-8 border-violet-600/10 border-t-violet-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-3xl">📡</div>
             </div>
             <div className="space-y-2">
                <h3 className="text-white font-bold text-xl">Connecting Hub</h3>
                <p className="text-slate-500 max-w-sm">Aggregating records from your selected cloud spreadsheets. Please stand by.</p>
             </div>
          </div>
        ) : (
          <div className="space-y-10">
            {combinedSelectedProjectIds.length === 0 || selectedSheetIds.length === 0 ? (
              <div className="h-[40vh] flex flex-col items-center justify-center border-4 border-dashed border-slate-900 rounded-[3rem] text-slate-700 space-y-4">
                <div className="text-6xl grayscale opacity-20">🖱️</div>
                <div className="text-center">
                  <h3 className="text-slate-400 font-bold text-lg">No Active Sources</h3>
                  <p className="text-slate-600 text-sm max-w-xs mx-auto">Please select spreadsheet projects and at least one data sheet from the sidebar to visualize analytics.</p>
                </div>
              </div>
            ) : (
              <>
                {currentView === 'overview' && (
                  <>
                    <SummaryCards metrics={metrics} />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                      <div className="lg:col-span-3">
                        <OverallPieChart 
                          data={pieData} 
                          title="Performance Quotient: Top Annotators" 
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <UserQualityChart 
                          data={processedSummaries.qcUsers}
                          title="QC Performance Analysis"
                        />
                      </div>
                    </div>
                  </>
                )}

                {currentView === 'raw' && (
                  <DataTable 
                    title={`Unified Raw Dataset`} 
                    headers={rawHeaders} 
                    data={rawData} 
                    filterColumns={[kTask, kLabelSet, kAnnotatorName, kUserName, kDate, 'Project Category']}
                  />
                )}

                {currentView === 'annotator' && (
                  <DataTable 
                    title="Annotator Summary Performance" 
                    headers={['name', 'frameCount', 'objectCount']} 
                    data={processedSummaries.annotators} 
                    filterColumns={['name']}
                  />
                )}

                {currentView === 'username' && (
                  <DataTable 
                    title="UserName Analysis Index" 
                    headers={['name', 'frameCount', 'objectCount']} 
                    data={processedSummaries.users} 
                    filterColumns={['name']}
                  />
                )}

                {currentView === 'qc-user' && (
                  <DataTable 
                    title="QC Assurance: UserName Metric" 
                    headers={['name', 'objectCount', 'errorCount']} 
                    data={processedSummaries.qcUsers} 
                    filterColumns={['name']}
                  />
                )}

                {currentView === 'qc-annotator' && (
                  <DataTable 
                    title="QC Quality: Annotator Segment" 
                    headers={['name', 'objectCount', 'errorCount']} 
                    data={processedSummaries.qcAnn} 
                    filterColumns={['name']}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {showProjectManager && (
        <ProjectManager 
          projects={projects}
          activeProjectId={combinedSelectedProjectIds[0] || ''}
          onAdd={addProject}
          onUpdate={updateProject}
          onDelete={deleteProject}
          onSelect={(id) => {
            const project = projects.find(p => p.id === id);
            if (project?.category === 'production') {
              if (!selectedProdProjectIds.includes(id)) setSelectedProdProjectIds(prev => [...prev, id]);
            } else if (project?.category === 'hourly') {
              if (!selectedHourlyProjectIds.includes(id)) setSelectedHourlyProjectIds(prev => [...prev, id]);
            }
          }}
          onClose={() => setShowProjectManager(false)}
        />
      )}

      {enlargedModal === 'projects-prod' && (
        <SelectionModal 
          title="Production Sources"
          options={prodProjects.map(p => p.id)}
          selected={selectedProdProjectIds}
          onChange={setSelectedProdProjectIds}
          labels={prodProjects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})}
          onClose={() => setEnlargedModal(null)}
        />
      )}

      {enlargedModal === 'projects-hourly' && (
        <SelectionModal 
          title="Hourly Sources"
          options={hourlyProjects.map(p => p.id)}
          selected={selectedHourlyProjectIds}
          onChange={setSelectedHourlyProjectIds}
          labels={hourlyProjects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})}
          onClose={() => setEnlargedModal(null)}
        />
      )}

      {enlargedModal === 'sheets' && (
        <SelectionModal 
          title="Data Sheet Collections"
          options={availableSheets.map(s => s.id)}
          selected={selectedSheetIds}
          onChange={setSelectedSheetIds}
          labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})}
          onClose={() => setEnlargedModal(null)}
        />
      )}
    </div>
  );
};

export default App;