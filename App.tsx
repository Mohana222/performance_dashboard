
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ViewType, RawRow, Project } from './types';
import { getSheetList, getSheetData, login as apiLogin, findKey, fetchGlobalProjects, saveGlobalProjects } from './services/api';
import { MENU_ITEMS, COLORS, API_URL } from './constants';
import MultiSelect from './components/MultiSelect';
import DataTable from './components/DataTable';
import OverallPieChart from './components/OverallPieChart';
import SummaryCards from './components/SummaryCards';
import ProjectManager from './components/ProjectManager';
import SelectionModal from './components/SelectionModal';
import UserQualityChart from './components/UserQualityChart';
import InfoFooter from './components/InfoFooter';

// Seed projects including both the requested Production and Hourly trackers
const SEED_PROJECTS: Project[] = [
  {
    id: 'dc-ramp-prod-dec-2025',
    name: 'Production Tracker Dec 2025',
    url: 'https://script.google.com/macros/s/AKfycbybBF1xbbUHCr2kTlLvVCdtc2UVGZKzLQasRNf_0pwwFSImsHo0f1Nq5fp56nJhJ45Z/exec',
    color: COLORS.primary,
    category: 'production'
  },
  {
    id: 'ramp-hourly-dec-2025',
    name: 'Hourly Tracker_Dec 2025',
    url: 'https://script.google.com/macros/s/AKfycbxGEjoJ-e9McSgYWCUS45FDf4Ox_uRtE9cxAMdGWyYSccQieLOuVxntRY93basHQicVKg/exec',
    color: COLORS.secondary,
    category: 'hourly'
  }
];

const parseTimeToMinutes = (val: any): number | null => {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.getHours() * 60 + val.getMinutes();
  if (typeof val === 'number') {
    if (val <= 0 || val >= 1) return null; 
    return Math.round(val * 24 * 60);
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'n/a' || str === '0' || str === '00:00:00') return null;
  const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i;
  const match = str.match(timeRegex);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[4]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return null;
};

const parseSheetDate = (sheetName: string): number => {
  const cleanName = sheetName.toUpperCase();
  const match = cleanName.match(/(\d+)(?:ST|ND|RD|TH)?\s+([A-Z]{3})/);
  if (!match) return 0;
  const day = parseInt(match[1], 10);
  const months: Record<string, number> = {
    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
  };
  const month = months[match[2]] ?? 0;
  return new Date(2024, month, day).getTime();
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
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-40 mix-blend-screen">
        <div className="absolute top-[20%] left-[10%] w-[800px] h-[800px] bg-violet-900/20 rounded-full blur-[160px] animate-drift"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[900px] h-[900px] bg-indigo-900/20 rounded-full blur-[180px] animate-drift" style={{ animationDelay: '-7s' }}></div>
      </div>
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

  const combinedSelectedProjectIds = useMemo(() => [...selectedProdProjectIds, ...selectedHourlyProjectIds], [selectedProdProjectIds, selectedHourlyProjectIds]);
  const [availableSheets, setAvailableSheets] = useState<{ id: string; label: string; projectId: string; sheetName: string }[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [rawData, setRawData] = useState<RawRow[]>([]);

  const syncProjectsToServer = useCallback(async (updatedProjects: Project[]) => {
    await saveGlobalProjects(API_URL, updatedProjects);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const loadProjects = async () => {
        setIsLoading(true);
        const globalProjects = await fetchGlobalProjects(API_URL);
        if (globalProjects === null) {
          console.warn("Could not sync with project database. Using local state if available.");
        } else if (globalProjects.length === 0) {
          setProjects(SEED_PROJECTS);
          await saveGlobalProjects(API_URL, SEED_PROJECTS);
        } else {
          setProjects(globalProjects);
        }
        setIsLoading(false);
      };
      loadProjects();
    }
  }, [isAuthenticated]);

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
              const sNameLower = sheetName.toLowerCase();
              if (project.category === 'hourly') {
                if (sNameLower.includes('login') && !sNameLower.includes('credential')) {
                  allSheets.push({ id: `${pid}|${sheetName}`, label: `[${project.name}] ${sheetName}`, projectId: pid, sheetName: sheetName });
                }
              } else if (project.category === 'production') {
                if (sNameLower.includes('production') || sNameLower.includes('qc')) {
                  allSheets.push({ id: `${pid}|${sheetName}`, label: `[${project.name}] ${sheetName}`, projectId: pid, sheetName: sheetName });
                }
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
      if (combinedSelectedProjectIds.length === 0) setRawData([]);
    }
  }, [isAuthenticated, combinedSelectedProjectIds, projects]);

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
              const headers = data.length > 0 ? Object.keys(data[0]) : [];
              const isProduction = project.category === 'production';
              
              // Column C is always Index 2 in these spreadsheets.
              const colCHeader = headers[2]; 
              let lastValidDate = '-';

              merged.push(...data.map(row => {
                const processedRow = { ...row };
                
                // For Production spreadsheets, strictly process Column C for date
                if (isProduction && colCHeader) {
                  const rawVal = String(processedRow[colCHeader] || '').trim();
                  
                  if (rawVal && rawVal !== "" && rawVal !== "undefined" && rawVal !== "null") {
                    const d = new Date(rawVal);
                    if (!isNaN(d.getTime())) {
                      // Fix: Use local date components instead of UTC/ISO to prevent "one day off" error
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      const formatted = `${year}-${month}-${day}`;
                      
                      processedRow[colCHeader] = formatted;
                      processedRow['Date'] = formatted;
                      lastValidDate = formatted; // Remember this date for next rows
                    }
                  } else {
                    // Forward-fill: If Column C is empty, use the last valid date found in this sheet
                    processedRow[colCHeader] = lastValidDate;
                    processedRow['Date'] = lastValidDate;
                  }
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
    try {
      const res = await apiLogin(API_URL, username, password);
      if (res.success) {
        sessionStorage.setItem('ok', '1');
        setIsAuthenticated(true);
      } else {
        setLoginError(res.message || 'Invalid login credentials');
      }
    } catch (err) {
      setLoginError('Connection refused. Please check the master Script URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ok');
    setIsAuthenticated(false);
    setRawData([]);
    setProjects([]);
    setSelectedProdProjectIds([]);
    setSelectedHourlyProjectIds([]);
    setSelectedSheetIds([]);
  };

  const addProject = async (p: Omit<Project, 'id' | 'color'>) => {
    const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.success, COLORS.warning, COLORS.danger];
    const newProject = { ...p, id: Date.now().toString(), color: colors[Math.floor(Math.random() * colors.length)] };
    const updated = [...projects, newProject];
    setProjects(updated);
    await syncProjectsToServer(updated);
  };

  const updateProject = async (updated: Project) => {
    const newList = projects.map(p => p.id === updated.id ? updated : p);
    setProjects(newList);
    await syncProjectsToServer(newList);
  };

  const deleteProject = async (id: string) => {
    const newList = projects.filter(p => p.id !== id);
    setProjects(newList);
    setSelectedProdProjectIds(prev => prev.filter(pid => pid !== id));
    setSelectedHourlyProjectIds(prev => prev.filter(pid => pid !== id));
    await syncProjectsToServer(newList);
  };

  const handleSelectProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    if (project.category === 'production') {
      setSelectedProdProjectIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedHourlyProjectIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
  };

  const processedSummaries = useMemo(() => {
    if (!rawData.length) return { annotators: [], users: [], qcUsers: [], qcAnn: [], combinedPerformance: [], attendance: [], attendanceHeaders: [] };
    const allKeys = Array.from(new Set(rawData.flatMap(row => Object.keys(row))));
    const kAnn = findKey(allKeys, "Annotator Name"), kUser = findKey(allKeys, "UserName"), kFrame = findKey(allKeys, "Frame ID"), kObj = findKey(allKeys, "Number of Object Annotated"), kQC = findKey(allKeys, "Internal QC Name"), kErr = findKey(allKeys, "Internal Polygon Error Count");
    
    const annotatorMap: Record<string, { frameSet: Set<string>, objects: number }> = {};
    const userMap: Record<string, { frameSet: Set<string>, objects: number }> = {};
    const qcUserMap: Record<string, { objects: number, errors: number }> = {};
    const qcAnnMap: Record<string, { objects: number, errors: number }> = {};
    const combinedPerformanceMap: Record<string, { objects: number }> = {};
    const employeeData: Record<string, { sno: string, name: string }> = {}, attendanceRecords: Record<string, Record<string, 'Present' | 'Absent' | 'NIL'>> = {}, uniqueSheetNames = new Set<string>();

    rawData.forEach(row => {
      const category = row['Project Category'], sheetSource = String(row['Sheet Source'] || '');
      const isQcSheet = sheetSource.toLowerCase().includes('qc');

      if (category === 'production') {
        const cleanRawName = (val: any) => String(val || '').trim().replace(/@rprocess\.in/gi, '');
        const ann = cleanRawName(row[kAnn || ''] || row[kUser || '']);
        const user = cleanRawName(row[kUser || '']);
        const frameId = String(row[kFrame || ''] || '').trim();
        const objCount = parseFloat(String(row[kObj || ''] || '0')) || 0;
        const qcName = String(row[kQC || ''] || '').trim();
        const errCount = parseFloat(String(row[kErr || ''] || '0')) || 0;

        if (ann) {
          if (!annotatorMap[ann]) annotatorMap[ann] = { frameSet: new Set(), objects: 0 };
          if (frameId) annotatorMap[ann].frameSet.add(frameId);
          annotatorMap[ann].objects += objCount;
          const isQCed = qcName !== "" || (kErr && row[kErr] !== undefined && row[kErr] !== null);
          if (isQCed && !isQcSheet) {
             if (!qcAnnMap[ann]) qcAnnMap[ann] = { objects: 0, errors: 0 };
             qcAnnMap[ann].objects += objCount;
             qcAnnMap[ann].errors += errCount;
          }
        }
        if (user) {
          if (!userMap[user]) userMap[user] = { frameSet: new Set(), objects: 0 };
          if (frameId) userMap[user].frameSet.add(frameId);
          userMap[user].objects += objCount;
          const isQCed = qcName !== "" || (kErr && row[kErr] !== undefined && row[kErr] !== null);
          if (isQCed && !isQcSheet) {
             if (!qcUserMap[user]) qcUserMap[user] = { objects: 0, errors: 0 };
             qcUserMap[user].objects += objCount;
             qcUserMap[user].errors += errCount;
          }
        }
        const primaryName = ann || user;
        if (primaryName) {
          if (!combinedPerformanceMap[primaryName]) combinedPerformanceMap[primaryName] = { objects: 0 };
          combinedPerformanceMap[primaryName].objects += objCount;
        }
      }
      if (category === 'hourly' && sheetSource.toLowerCase().endsWith('login')) {
        uniqueSheetNames.add(sheetSource);
        const rowKeys = Object.keys(row);
        const sKey = findKey(rowKeys, "SNO") || rowKeys[0], nKey = findKey(rowKeys, "NAME") || rowKeys[1], lKey = findKey(rowKeys, "Login Time") || rowKeys[5];
        let snoVal = String(row[sKey] || '').trim();
        const employeeName = String(row[nKey] || '').trim(), loginTimeVal = row[lKey];
        if (employeeName && employeeName !== "undefined" && employeeName !== "") {
          const status = parseTimeToMinutes(loginTimeVal) !== null ? 'Present' : 'Absent';
          if (!employeeData[employeeName]) employeeData[employeeName] = { sno: snoVal, name: employeeName };
          if (!attendanceRecords[employeeName]) attendanceRecords[employeeName] = {};
          if (status === 'Present' || !attendanceRecords[employeeName][sheetSource]) attendanceRecords[employeeName][sheetSource] = status;
        }
      }
    });
    
    const sortedSheetHeaders = Array.from(uniqueSheetNames).sort((a, b) => parseSheetDate(a) - parseSheetDate(b) || a.localeCompare(b, undefined, { numeric: true }));
    const attendanceFlat = Object.keys(employeeData).map(name => {
      const meta = employeeData[name], row: Record<string, string> = { _originalSno: meta.sno, NAME: meta.name };
      sortedSheetHeaders.forEach(sheet => { row[sheet] = attendanceRecords[name][sheet] || 'NIL'; });
      return row;
    }).sort((a, b) => {
      const snoA = parseInt(a._originalSno, 10), snoB = parseInt(b._originalSno, 10);
      return (!isNaN(snoA) && !isNaN(snoB)) ? snoA - snoB : a.NAME.localeCompare(b.NAME);
    }).map((row, idx) => { const { _originalSno, ...rest } = row; return { SNO: (idx + 1).toString(), ...rest }; });
    
    return {
      annotators: Object.entries(annotatorMap).map(([name, data]) => ({ name, frameCount: data.frameSet.size, objectCount: data.objects })),
      users: Object.entries(userMap).map(([name, data]) => ({ name, frameCount: data.frameSet.size, objectCount: data.objects })),
      qcUsers: Object.entries(qcUserMap).map(([name, data]) => ({ name, objectCount: data.objects, errorCount: data.errors })),
      qcAnn: Object.entries(qcAnnMap).map(([name, data]) => ({ name, objectCount: data.objects, errorCount: data.errors })),
      combinedPerformance: Object.entries(combinedPerformanceMap).map(([name, data]) => ({ name, objectCount: data.objects })),
      attendance: attendanceFlat, attendanceHeaders: ['SNO', 'NAME', ...sortedSheetHeaders]
    };
  }, [rawData]);

  const metrics = useMemo(() => {
    const prodData = rawData.filter(r => r['Project Category'] === 'production'), globalFrames = new Set<string>();
    const allKeys = Array.from(new Set(rawData.flatMap(row => Object.keys(row))));
    const kFrame = findKey(allKeys, "Frame ID");
    prodData.forEach(r => { const f = String(r[kFrame || ''] || '').trim(); if (f) globalFrames.add(f); });
    const totalObjects = processedSummaries.annotators.reduce((acc, cur) => acc + cur.objectCount, 0), qcObjectsCount = processedSummaries.qcAnn.reduce((acc, cur) => acc + cur.objectCount, 0), totalErrors = processedSummaries.qcAnn.reduce((acc, cur) => acc + cur.errorCount, 0);
    return [
      { label: 'Total Frames', value: globalFrames.size, icon: '🎞️', color: COLORS.primary },
      { label: 'Total Objects', value: totalObjects.toLocaleString(), icon: '📦', color: COLORS.accent },
      { label: 'QC Total Objects', value: qcObjectsCount.toLocaleString(), icon: '🎯', color: COLORS.secondary },
      { label: 'Total Errors', value: totalErrors, icon: '⚠️', color: COLORS.danger },
      { label: 'Quality Rate', value: qcObjectsCount > 0 ? (((qcObjectsCount - totalErrors) / qcObjectsCount) * 100).toFixed(2) + '%' : '0%', icon: '✨', color: COLORS.success },
    ];
  }, [processedSummaries, rawData]);

  const pieData = useMemo(() => {
    return [...processedSummaries.combinedPerformance]
      .sort((a,b) => b.objectCount - a.objectCount)
      .map(a => ({ name: a.name, value: a.objectCount }));
  }, [processedSummaries]);

  const pieChartTitle = useMemo(() => {
    if (selectedSheetIds.length === 0) return "Overall Performance";
    const names = selectedSheetIds.map(id => id.split('|')[1]?.toLowerCase() || '');
    const hasQC = names.some(n => n.includes('qc'));
    const hasProd = names.some(n => n.includes('production'));
    if (hasQC && !hasProd) return "Overall QC Performance";
    if (hasProd && !hasQC) return "Overall Annotator Performance";
    if (hasQC && hasProd) return "Overall Combined Performance";
    return "Overall Performance";
  }, [selectedSheetIds]);

  const rawHeaders = useMemo(() => {
    if (rawData.length === 0) return [];
    return Array.from(new Set(rawData.flatMap(row => Object.keys(row))));
  }, [rawData]);

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <StarField />
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-[32px] border border-white/10 p-10 md:p-14 rounded-[3.5rem] shadow-2xl animate-fade-up login-glow mt-auto relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black tracking-widest uppercase mb-4">Secure Portal</div>
          <h1 className="text-5xl font-black tracking-tighter shimmer-text py-2">DesiCrew</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-violet-400 transition-colors">👤</span>
              <input type="text" placeholder="Username" required className="w-full bg-slate-900/60 border border-slate-800/80 text-white pl-12 pr-5 py-4 rounded-2xl focus:ring-2 focus:ring-violet-500/50 outline-none transition-all placeholder-slate-600 font-medium" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-violet-400 transition-colors">🔒</span>
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" required className="w-full bg-slate-900/60 border border-slate-800/80 text-white pl-12 pr-12 py-4 rounded-2xl focus:ring-2 focus:ring-violet-500/50 outline-none transition-all placeholder-slate-600 font-medium" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-violet-400 transition-colors focus:outline-none text-lg">{showPassword ? '👁️' : '👁️‍🗨️'}</button>
            </div>
          </div>
          {loginError && <div className="text-rose-400 text-xs font-bold text-center animate-pulse py-2 px-4 bg-rose-500/10 rounded-xl border border-rose-500/20">{loginError}</div>}
          <button type="submit" disabled={isLoading} className="w-full h-14 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-black rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-[0.2em]">{isLoading ? 'Processing...' : 'Access Dashboard'}</button>
        </form>
      </div>
      <div className="mt-auto w-full max-w-md relative z-10"><InfoFooter /></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden">
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col z-20 transition-all duration-300 relative ${isSidebarOpen ? 'w-96' : 'w-0 overflow-hidden'}`}>
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6 min-w-[24rem]">
          <h2 className="text-3xl font-black text-white tracking-tighter mb-6">DesiCrew</h2>
          <nav className="space-y-1">
            {MENU_ITEMS.map((item) => (
              <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 transition-all ${currentView === item.id ? 'bg-violet-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'}`}>
                <span className="text-2xl">{item.icon}</span><span className="font-bold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
          <hr className="border-slate-800" />
          <div className="space-y-6">
            <MultiSelect options={projects.filter(p => p.category === 'production').map(p => p.id)} selected={selectedProdProjectIds} onChange={setSelectedProdProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} title="Select Spreadsheets (Production)" onEnlarge={() => setEnlargedModal('projects-prod')} />
            <MultiSelect options={projects.filter(p => p.category === 'hourly').map(p => p.id)} selected={selectedHourlyProjectIds} onChange={setSelectedHourlyProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} title="Select Spreadsheets (Hourly)" onEnlarge={() => setEnlargedModal('projects-hourly')} />
            {combinedSelectedProjectIds.length > 0 && <MultiSelect options={availableSheets.map(s => s.id)} selected={selectedSheetIds} onChange={setSelectedSheetIds} labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})} title="Select Data Sheets" onEnlarge={() => setEnlargedModal('sheets')} />}
          </div>
        </div>
        <div className="p-8 bg-slate-900 border-t border-slate-800 min-w-[24rem]">
          <button onClick={() => setShowProjectManager(true)} className="w-full bg-slate-800 py-3.5 rounded-2xl text-sm font-bold border border-slate-700 shadow-xl flex items-center justify-center gap-2">⚙️ Project Setup</button>
        </div>
      </aside>

      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`fixed top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-100 shadow-2xl transition-all duration-300 ${isSidebarOpen ? 'left-[23.2rem]' : 'left-6'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`}><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <main className="flex-1 overflow-auto bg-slate-950 p-6 md:p-10 custom-scrollbar relative">
        <header className="flex justify-between items-center mb-10 ml-12">
          <div className="flex-1">
            <h1 className="text-4xl font-black text-white tracking-tighter">{MENU_ITEMS.find(m => m.id === currentView)?.label || 'Dashboard'}</h1>
            <p className="text-slate-500 text-sm mt-1">Active Projects: <span className="text-violet-400 font-bold">{selectedSheetIds.length}</span> datasets synchronization live.</p>
          </div>
          <button onClick={handleLogout} className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl transition-all hover:bg-red-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></button>
        </header>

        {(isDataLoading || isLoading) && rawData.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-20 h-20 border-8 border-violet-600/10 border-t-violet-600 rounded-full animate-spin"></div>
            <h3 className="text-white font-bold text-xl">Connecting Portal...</h3>
          </div>
        ) : (
          <div className="space-y-10 pb-20">
            {combinedSelectedProjectIds.length === 0 || selectedSheetIds.length === 0 ? (
              <div className="h-[40vh] flex flex-col items-center justify-center border-4 border-dashed border-slate-900 rounded-[3rem] text-slate-700 space-y-4">
                <div className="text-6xl grayscale opacity-20">🖱️</div>
                <h3 className="text-slate-400 font-bold text-lg">No Active Data Sources</h3>
              </div>
            ) : (
              <>
                {currentView === 'overview' && (
                  <>
                    <SummaryCards metrics={metrics} />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                      <div className="lg:col-span-3"><OverallPieChart data={pieData} title={pieChartTitle} /></div>
                      <div className="lg:col-span-2"><UserQualityChart data={processedSummaries.qcAnn} title="Top Quality Rates" /></div>
                    </div>
                  </>
                )}
                {currentView === 'raw' && <DataTable title="Consolidated Raw Data" headers={rawHeaders} data={rawData} filterColumns={['Task', 'Label Set', 'Annotator Name', 'UserName', 'Date', 'Project Category']} />}
                {currentView === 'annotator' && <DataTable title="Annotator Output" headers={['name', 'frameCount', 'objectCount']} data={processedSummaries.annotators} filterColumns={['name']} />}
                {currentView === 'username' && <DataTable title="Username Output" headers={['name', 'frameCount', 'objectCount']} data={processedSummaries.users} filterColumns={['name']} />}
                {currentView === 'qc-user' && <DataTable title="QA (Username)" headers={['name', 'objectCount', 'errorCount']} data={processedSummaries.qcUsers} filterColumns={['name']} />}
                {currentView === 'qc-annotator' && <DataTable title="QA (Annotator)" headers={['name', 'objectCount', 'errorCount']} data={processedSummaries.qcAnn} filterColumns={['name']} />}
                {currentView === 'attendance' && <DataTable title="Attendance Summary" headers={processedSummaries.attendanceHeaders} data={processedSummaries.attendance} filterColumns={['NAME']} />}
              </>
            )}
          </div>
        )}
      </main>

      {showProjectManager && (
        <ProjectManager projects={projects} activeProjectId={combinedSelectedProjectIds[0] || ''} userRole="desicrew" onAdd={addProject} onUpdate={updateProject} onDelete={deleteProject} onSelect={handleSelectProject} onClose={() => setShowProjectManager(false)} />
      )}
      {enlargedModal === 'projects-prod' && <SelectionModal title="Production Projects" options={projects.filter(p => p.category === 'production').map(p => p.id)} selected={selectedProdProjectIds} onChange={setSelectedProdProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onClose={() => setEnlargedModal(null)} />}
      {enlargedModal === 'projects-hourly' && <SelectionModal title="Hourly Projects" options={projects.filter(p => p.category === 'hourly').map(p => p.id)} selected={selectedHourlyProjectIds} onChange={setSelectedHourlyProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onClose={() => setEnlargedModal(null)} />}
      {enlargedModal === 'sheets' && <SelectionModal title="Data Sheet Selection" options={availableSheets.map(s => s.id)} selected={selectedSheetIds} onChange={setSelectedSheetIds} labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})} onClose={() => setEnlargedModal(null)} />}
    </div>
  );
};

export default App;
