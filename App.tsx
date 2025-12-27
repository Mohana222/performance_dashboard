
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



const parseTimeToMinutes = (val: any): number | null => {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.getHours() * 60 + val.getMinutes();
  if (typeof val === 'number') {
    if (val <= 0 || val >= 1) return null; 
    return Math.round(val * 24 * 60);
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'n/a' || str === '0' || str === '00:00:00') return null;
  const timeRegex = new RegExp("(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*(AM|PM)?", "i");
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

const normalizeDateValue = (val: any): string => {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  if (s === "" || s.toUpperCase() === "NIL" || s === "-" || s.toLowerCase() === "undefined") return "";
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hour = parseInt(isoMatch[4], 10);
    let d = new Date(year, month, day);
    if (hour >= 18) d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    if (year > 1900 && year < 2100) return `${year}/${month}/${day}`;
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
  const matchAlt = cleanName.match(/([A-Z]{3})\s*[-]?\s*(\d+)/);
  if (matchAlt) {
    const day = parseInt(matchAlt[2], 10);
    const month = months[matchAlt[1]] ?? 0;
    return new Date(2025, month, day).getTime();
  }
  return 0;
};

const formatTimestampToDisplayDate = (ts: number): string => {
  if (!ts) return "-";
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
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
  const [availableSheets, setAvailableSheets] = useState<{ id: string; label: string; projectId: string; sheetName: string }[]>([]);
  const [birthdayMessage, setBirthdayMessage] = useState<string>('');
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [rawData, setRawData] = useState<RawRow[]>([]);

  const combinedSelectedProjectIds = useMemo(() => [...selectedProdProjectIds, ...selectedHourlyProjectIds], [selectedProdProjectIds, selectedHourlyProjectIds]);

  const productionRawData = useMemo(() => rawData.filter(row => row['__projectCategory'] === 'production'), [rawData]);

  const groupedSheetsForUI = useMemo(() => {
    return combinedSelectedProjectIds.map(pid => {
      const project = projects.find(p => p.id === pid);
      const sheets = availableSheets.filter(s => s.projectId === pid).map(s => s.id);
      return { title: project?.name || 'Unknown Project', color: project?.color, options: sheets };
    }).filter(g => g.options.length > 0);
  }, [combinedSelectedProjectIds, availableSheets, projects]);

  const syncProjectsToServer = useCallback(async (updatedProjects: Project[]) => {
    try { await saveGlobalProjects(API_URL, updatedProjects); } catch (err) { console.error("Sync error"); }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const loadProjects = async () => {
        setIsLoading(true);
        try {
          const globalProjects = await fetchGlobalProjects(API_URL);
          if (Array.isArray(globalProjects) && globalProjects.length > 0) {
            setProjects(globalProjects);
          } else {
            setProjects(SEED_PROJECTS);
            await saveGlobalProjects(API_URL, SEED_PROJECTS);
          }
        } catch (err) { console.error("DB Load error"); } finally { setIsLoading(false); }
      };
      loadProjects();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && projects.length > 0) {
      const scanAllBirthdays = async () => {
        const today = new Date();
        const tDay = today.getDate();
        const tMonth = today.getMonth() + 1;
        const allNames: string[] = [];
        await Promise.all(projects.map(async (project) => {
          try {
            const list = await getSheetList(project.url);
            const birthdaySheets = list.filter(name => name.toLowerCase().includes('birthday'));
            await Promise.all(birthdaySheets.map(async (sheetName) => {
              const bData = await getSheetData(project.url, sheetName);
              const matches = bData.filter(row => {
                const dobRaw = String(row['DOB'] || row['dob'] || row['Date of Birth'] || '').trim();
                if (!dobRaw) return false;
                const d = new Date(dobRaw);
                return !isNaN(d.getTime()) && d.getDate() === tDay && (d.getMonth() + 1) === tMonth;
              }).map(row => String(row['NAME'] || row['name'] || row['Employee Name'] || 'Someone').trim());
              allNames.push(...matches);
            }));
          } catch (err) {}
        }));
        if (allNames.length > 0) setBirthdayMessage(`Happy Birthday! ${Array.from(new Set(allNames)).join(', ')} 🎈`);
      };
      scanAllBirthdays();
    }
  }, [isAuthenticated, projects]);

  useEffect(() => {
    if (isAuthenticated && combinedSelectedProjectIds.length > 0) {
      const fetchSheets = async () => {
        setIsLoading(true);
        const all: { id: string; label: string; projectId: string; sheetName: string }[] = [];
        await Promise.all(combinedSelectedProjectIds.map(async (pid) => {
          const project = projects.find(p => p.id === pid);
          if (project) {
            const list = await getSheetList(project.url);
            list.forEach(name => {
              const low = name.toLowerCase();
              if ((project.category === 'hourly' && low.includes('login') && !low.includes('credential')) ||
                  (project.category === 'production' && (low.includes('production') || low.includes('qc')))) {
                all.push({ id: `${pid}|${name}`, label: name, projectId: pid, sheetName: name });
              }
            });
          }
        }));
        setAvailableSheets(all);
        setIsLoading(false);
      };
      fetchSheets();
    } else {
      setAvailableSheets([]);
      if (combinedSelectedProjectIds.length === 0) setRawData([]);
    }
  }, [isAuthenticated, combinedSelectedProjectIds, projects]);

  useEffect(() => {
    setSelectedSheetIds(prev => prev.filter(id => combinedSelectedProjectIds.includes(id.split('|')[0])));
  }, [combinedSelectedProjectIds]);

  useEffect(() => {
    if (isAuthenticated && selectedSheetIds.length > 0) {
      const mergeData = async () => {
        setIsDataLoading(true);
        const groups: Record<string, string[]> = {};
        selectedSheetIds.forEach(id => {
          const [pid, sname] = id.split('|');
          if (!groups[pid]) groups[pid] = [];
          groups[pid].push(sname);
        });
        const merged: RawRow[] = [];
        await Promise.all(Object.entries(groups).map(async ([pid, sheetNames]) => {
          const project = projects.find(p => p.id === pid);
          if (project) {
            await Promise.all(sheetNames.map(async (sname) => {
              const data = await getSheetData(project.url, sname);
              const headers = data.length > 0 ? Object.keys(data[0]) : [];
              let dateKey = findKey(headers, "Date") || headers[2];
              let sheetDate = "-";
              for (const r of data) {
                const n = normalizeDateValue(r[dateKey]);
                if (n && n !== "-") { sheetDate = n; break; }
              }
              if (sheetDate === "-") {
                const ts = parseSheetDate(sname);
                if (ts > 0) sheetDate = formatTimestampToDisplayDate(ts);
              }
              merged.push(...data.map(row => {
                const processed: RawRow = {};
                let rowDate = "-";
                headers.forEach(h => {
                  let val = row[h];
                  if (h === dateKey || h.toLowerCase().includes('date')) {
                    const norm = normalizeDateValue(val);
                    if (norm && norm !== "-") { val = norm; rowDate = norm; }
                  }
                  processed[h] = val;
                });
                processed['DATE'] = rowDate === "-" ? sheetDate : rowDate;
                return { ...processed, '__projectSource': project.name, '__projectCategory': project.category, '__sheetSource': sname };
              }));
            }));
          }
        }));
        setRawData(merged);
        setIsDataLoading(false);
      };
      mergeData();
    } else setRawData([]);
  }, [isAuthenticated, selectedSheetIds, projects]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      const res = await apiLogin(API_URL, username, password);
      if (res.success) { sessionStorage.setItem('ok', '1'); setIsAuthenticated(true); }
      else setLoginError(res.message || 'Invalid credentials');
    } catch (err) { setLoginError('Connection Refused'); } finally { setIsLoading(false); }
  };

  const handleLogout = () => { 
    sessionStorage.removeItem('ok'); 
    setIsAuthenticated(false); 
    setRawData([]); 
    setUsername(''); 
    setPassword('');
    setShowPassword(false);
    setLoginError('');
    // Explicitly clear selection states
    setSelectedProdProjectIds([]);
    setSelectedHourlyProjectIds([]);
    setSelectedSheetIds([]);
    setAvailableSheets([]);
    setCurrentView('overview');
  };

  const addProject = async (p: Omit<Project, 'id' | 'color'>) => {
    const cols = [COLORS.primary, COLORS.secondary, COLORS.accent];
    const newP = { ...p, id: Date.now().toString(), color: cols[Math.floor(Math.random() * cols.length)] };
    const up = [...projects, newP]; setProjects(up); await syncProjectsToServer(up);
  };

  const updateProject = async (u: Project) => {
    const list = projects.map(p => p.id === u.id ? u : p); setProjects(list); await syncProjectsToServer(list);
  };

  const deleteProject = async (id: string) => {
    const list = projects.filter(p => p.id !== id); setProjects(list); await syncProjectsToServer(list);
  };

  const handleSelectProject = (id: string) => {
    const p = projects.find(proj => proj.id === id); if (!p) return;
    if (p.category === 'production') setSelectedProdProjectIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    else setSelectedHourlyProjectIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const processedSummaries = useMemo(() => {
    if (!rawData.length) return { annotators: [], users: [], qcUsers: [], qcAnn: [], combinedPerformance: [], attendance: [], attendanceHeaders: [] };
    const allKeys = Array.from(new Set(rawData.flatMap(row => Object.keys(row))));
    const kAnn = findKey(allKeys, "Annotator Name"), kUser = findKey(allKeys, "UserName"), kFrame = findKey(allKeys, "Frame ID"), kObj = findKey(allKeys, "Number of Object Annotated"), kQC = findKey(allKeys, "Internal QC Name"), kErr = findKey(allKeys, "Internal Polygon Error Count");
    
    const clean = (v: any) => {
      let val = String(v || '').trim();
      if (!val || val.toLowerCase() === 'undefined' || val.toLowerCase() === 'nil') return '';
      const namePart = val.split('@')[0];
      return `${namePart}@rprocess.in`;
    };

    const annotatorMap: Record<string, { frameSet: Set<string>, objects: number }> = {};
    const userMap: Record<string, { frameSet: Set<string>, objects: number }> = {};
    const qcUserMap: Record<string, { objects: number, errors: number }> = {};
    const qcAnnMap: Record<string, { objects: number, errors: number }> = {};
    const combinedPerf: Record<string, { objects: number }> = {};
    const empData: Record<string, { sno: string, name: string, empCode: string }> = {}, attRecords: Record<string, Record<string, 'Present' | 'Absent' | 'P(1/2)'>> = {}, uniqueSheets = new Set<string>();

    rawData.forEach(row => {
      const category = row['__projectCategory'], sheet = String(row['__sheetSource'] || '');
      const isQc = sheet.toLowerCase().includes('qc');
      
      if (category === 'production') {
        const ann = clean(row[kAnn || ''] || row[kUser || '']), usr = kUser ? clean(row[kUser]) : '';
        const fId = String(row[kFrame || ''] || '').trim(), objs = parseFloat(String(row[kObj || ''] || '0')) || 0;
        const qcN = String(row[kQC || ''] || '').trim(), errs = parseFloat(String(row[kErr || ''] || '0')) || 0;
        const hasValidQc = qcN && qcN.toLowerCase() !== 'nil' && qcN.toLowerCase() !== 'undefined' && qcN !== '-' && qcN !== '0';
        
        if (ann) {
          if (!annotatorMap[ann]) annotatorMap[ann] = { frameSet: new Set(), objects: 0 };
          if (fId) annotatorMap[ann].frameSet.add(fId); annotatorMap[ann].objects += objs;
          if (hasValidQc && !isQc) {
            if (!qcAnnMap[ann]) qcAnnMap[ann] = { objects: 0, errors: 0 };
            qcAnnMap[ann].objects += objs; qcAnnMap[ann].errors += errs;
          }
        }
        if (kUser && usr) {
          if (!userMap[usr]) userMap[usr] = { frameSet: new Set(), objects: 0 };
          if (fId) userMap[usr].frameSet.add(fId); userMap[usr].objects += objs;
          if (hasValidQc && !isQc) {
            if (!qcUserMap[usr]) qcUserMap[usr] = { objects: 0, errors: 0 };
            qcUserMap[usr].objects += objs; qcUserMap[usr].errors += errs;
          }
        }
        const primary = ann || usr;
        if (primary) {
          if (!combinedPerf[primary]) combinedPerf[primary] = { objects: 0 };
          combinedPerf[primary].objects += objs;
        }
      }
      
      if (category === 'hourly' && sheet.toLowerCase().endsWith('login')) {
        uniqueSheets.add(sheet);
        const keys = Object.keys(row);
        const sno = String(row[keys[0]] || '').trim(), name = String(row[keys[1]] || '').trim();
        
        // Find Emp Code - checking for explicit header or index 2
        const kEmpCode = findKey(keys, "Employee Code") || findKey(keys, "Emp Code") || findKey(keys, "Emp ID") || keys[2];
        const empCode = String(row[kEmpCode] || '').trim();

        const workingHrsRaw = row[keys[3]];
        const workingHrs = parseFloat(String(workingHrsRaw || '0')) || 0;
        const logTime = row[keys[5]];
        const hasLogin = logTime !== null && logTime !== undefined && String(logTime).trim() !== "" && String(logTime).trim().toLowerCase() !== "nil";

        if (name && name !== "undefined" && name !== "") {
          let status: 'Present' | 'Absent' | 'P(1/2)' = 'Absent';
          if (!hasLogin) status = 'Absent';
          else status = workingHrs < 5 ? 'P(1/2)' : 'Present';

          if (!empData[name]) empData[name] = { sno, name, empCode };
          if (!attRecords[name]) attRecords[name] = {};
          
          const cur = attRecords[name][sheet];
          if (status === 'Present' || (status === 'P(1/2)' && cur !== 'Present') || !cur) {
            attRecords[name][sheet] = status;
          }
        }
      }
    });

    const sortedSheets = Array.from(uniqueSheets).sort((a, b) => parseSheetDate(a) - parseSheetDate(b) || a.localeCompare(b, undefined, { numeric: true }));
    const attFlat = Object.keys(empData).map(name => {
      const m = empData[name], r: Record<string, string> = { _sno: m.sno, NAME: m.name, 'EMP CODE': m.empCode };
      sortedSheets.forEach(s => r[s] = attRecords[name][s] || 'NIL');
      return r;
    }).sort((a, b) => {
      const sa = parseInt(a._sno, 10), sb = parseInt(b._sno, 10);
      return (!isNaN(sa) && !isNaN(sb)) ? sa - sb : a.NAME.localeCompare(b.NAME);
    }).map((r, i) => { const { _sno, ...rest } = r; return { SNO: (i + 1).toString(), ...rest }; });

    return {
      annotators: Object.entries(annotatorMap).map(([n, d]) => ({ NAME: n, FRAMECOUNT: d.frameSet.size, OBJECTCOUNT: d.objects })),
      // Updated to remove '@rprocess.in' suffix only for UserName Summary and QC (UserName)
      users: kUser ? Object.entries(userMap).map(([n, d]) => ({ NAME: n.split('@')[0], FRAMECOUNT: d.frameSet.size, OBJECTCOUNT: d.objects })) : [],
      qcUsers: kUser ? Object.entries(qcUserMap).map(([n, d]) => ({ NAME: n.split('@')[0], OBJECTCOUNT: d.objects, ERRORCOUNT: d.errors })) : [],
      qcAnn: Object.entries(qcAnnMap).map(([n, d]) => ({ NAME: n, OBJECTCOUNT: d.objects, ERRORCOUNT: d.errors })),
      combinedPerformance: Object.entries(combinedPerf).map(([n, d]) => ({ name: n, value: d.objects })),
      attendance: attFlat, attendanceHeaders: ['SNO', 'NAME', 'EMP CODE', ...sortedSheets]
    };
  }, [rawData]);

  const metrics = useMemo(() => {
    const prod = rawData.filter(r => r['__projectCategory'] === 'production');
    const allKeys = Array.from(new Set(rawData.flatMap(r => Object.keys(r))));
    const kF = findKey(allKeys, "Frame ID");
    const kQC = findKey(allKeys, "Internal QC Name");
    const kObj = findKey(allKeys, "Number of Object Annotated");
    const kErr = findKey(allKeys, "Internal Polygon Error Count");

    const frames = new Set<string>();
    let totObj = 0;
    let qcObj = 0;
    let totErr = 0;

    prod.forEach(r => {
      const f = String(r[kF || ''] || '').trim();
      if (f) frames.add(f);

      const objs = parseFloat(String(r[kObj || ''] || '0')) || 0;
      totObj += objs;

      const qcN = String(r[kQC || ''] || '').trim();
      const hasQcName = qcN && qcN.toLowerCase() !== 'nil' && qcN.toLowerCase() !== 'undefined' && qcN !== '-' && qcN !== '0';
      if (hasQcName) {
        qcObj += objs;
        const errs = parseFloat(String(r[kErr || ''] || '0')) || 0;
        totErr += errs;
      }
    });

    return [
      { label: 'Total Frames', value: frames.size, icon: '🎞️', color: COLORS.primary },
      { label: 'Total Objects', value: totObj.toLocaleString(), icon: '📦', color: COLORS.accent },
      { label: 'QC Total Objects', value: qcObj.toLocaleString(), icon: '🎯', color: COLORS.secondary },
      { label: 'Total Errors', value: totErr, icon: '⚠️', color: COLORS.danger },
      { label: 'Quality Rate', value: qcObj > 0 ? (((qcObj - totErr) / qcObj) * 100).toFixed(2) + '%' : '0%', icon: '✨', color: COLORS.success }
    ];
  }, [rawData]);

  const chartPerfData = useMemo(() => [...processedSummaries.combinedPerformance].sort((a,b) => b.value - a.value).slice(0, 5), [processedSummaries]);

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
              <button key={m.id} onClick={() => setCurrentView(m.id as ViewType)} className={`w-full text-left px-4 py-2.5 rounded-2xl flex items-center gap-3 transition-all ${currentView === m.id ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                <span className="text-xl">{m.icon}</span><span className="font-bold">{m.label}</span>
              </button>
            ))}
          </nav>
          <div className="space-y-3">
            <MultiSelect 
              title="SELECT SPREADSHEETS (PRODUCTION)" 
              options={projects.filter(p => p.category === 'production').map(p => p.id)} 
              selected={selectedProdProjectIds} 
              onChange={setSelectedProdProjectIds} 
              labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} 
              onEnlarge={() => setEnlargedModal('projects-prod')}
            />
            <MultiSelect 
              title="SELECT SPREADSHEETS (HOURLY)" 
              options={projects.filter(p => p.category === 'hourly').map(p => p.id)} 
              selected={selectedHourlyProjectIds} 
              onChange={setSelectedHourlyProjectIds} 
              labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} 
              onEnlarge={() => setEnlargedModal('projects-hourly')}
            />
            {combinedSelectedProjectIds.length > 0 && (
              <MultiSelect 
                title="SELECT DATA SHEETS" 
                options={availableSheets.map(s => s.id)} 
                selected={selectedSheetIds} 
                onChange={setSelectedSheetIds} 
                labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})} 
                groups={groupedSheetsForUI} 
                onEnlarge={() => setEnlargedModal('sheets')}
              />
            )}
          </div>
        </div>
        <div className="p-6 bg-slate-900 border-t border-slate-800 min-w-[24rem]">
          <button 
            onClick={() => setShowProjectManager(true)} 
            className="w-full bg-slate-800/40 py-3 rounded-2xl text-sm font-bold border border-slate-700/60 shadow-xl flex items-center justify-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            ⚙️ Project Setup
          </button>
        </div>
      </aside>

      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`fixed top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-100 shadow-2xl transition-all duration-300 ${isSidebarOpen ? 'left-[23.2rem]' : 'left-6'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`}><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <main className="flex-1 overflow-auto bg-slate-950 p-6 md:p-10 custom-scrollbar relative z-10">
        <header className="flex justify-between items-start mb-10 ml-12">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white tracking-tight">{MENU_ITEMS.find(m => m.id === currentView)?.label || 'Overview'}</h1>
            <p className="text-slate-400 text-sm mt-1">Operational analytics and performance monitoring</p>
          </div>
          <div className="flex items-center gap-6">
            {birthdayMessage && (
              <div className="bg-gradient-to-r from-violet-600/20 to-pink-600/20 border border-violet-500/30 px-6 py-3 rounded-2xl flex items-center gap-3 animate-fade-up shadow-lg">
                <span className="text-lg animate-bounce">🎈</span>
                <span className="text-sm font-black tracking-tight shimmer-text">{birthdayMessage}</span>
              </div>
            )}
            <button onClick={handleLogout} className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl transition-all hover:bg-red-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></button>
          </div>
        </header>

        {(isDataLoading || isLoading) && projects.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-20 h-20 border-8 border-violet-600/10 border-t-violet-600 rounded-full animate-spin"></div>
            <h3 className="text-white font-black text-xl uppercase tracking-widest">Syncing Data Streams...</h3>
          </div>
        ) : (
          <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {combinedSelectedProjectIds.length === 0 || selectedSheetIds.length === 0 ? (
              <div className="h-[40vh] flex flex-col items-center justify-center border-4 border-dashed border-slate-900 rounded-[3rem] text-slate-700 space-y-4">
                <div className="text-6xl grayscale opacity-20">🖱️</div>
                <h3 className="text-slate-400 font-bold text-lg uppercase tracking-widest">No Active Data Sources</h3>
                <p className="text-slate-600 text-sm">Please select projects and sheets from the sidebar to begin.</p>
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
                {currentView === 'raw' && <DataTable title="Consolidated Raw Intelligence" headers={rawHeaders} data={productionRawData} filterColumns={['Task', 'Label Set', 'Annotator Name', 'UserName', 'DATE']} />}
                {currentView === 'annotator' && <DataTable title="Annotator Summary" headers={['NAME', 'FRAMECOUNT', 'OBJECTCOUNT']} data={processedSummaries.annotators} filterColumns={['NAME']} />}
                {currentView === 'username' && <DataTable title="UserName Summary" headers={['NAME', 'FRAMECOUNT', 'OBJECTCOUNT']} data={processedSummaries.users} filterColumns={['NAME']} />}
                {currentView === 'qc-annotator' && <DataTable title="QC (Annotator)" headers={['NAME', 'OBJECTCOUNT', 'ERRORCOUNT']} data={processedSummaries.qcAnn} filterColumns={['NAME']} />}
                {currentView === 'qc-user' && <DataTable title="QC (UserName)" headers={['NAME', 'OBJECTCOUNT', 'ERRORCOUNT']} data={processedSummaries.qcUsers} filterColumns={['NAME']} />}
                {currentView === 'attendance' && <DataTable title="Attendance Summary" headers={processedSummaries.attendanceHeaders} data={processedSummaries.attendance} filterColumns={['NAME', 'EMP CODE']} />}
              </>
            )}
          </div>
        )}
      </main>

      {showProjectManager && (
        <ProjectManager projects={projects} selectedProjectIds={combinedSelectedProjectIds} userRole="desicrew" onAdd={addProject} onUpdate={updateProject} onDelete={deleteProject} onSelect={handleSelectProject} onClose={() => setShowProjectManager(false)} />
      )}
      {enlargedModal === 'projects-prod' && <SelectionModal title="Production Projects" options={projects.filter(p => p.category === 'production').map(p => p.id)} selected={selectedProdProjectIds} onChange={setSelectedProdProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onClose={() => setEnlargedModal(null)} />}
      {enlargedModal === 'projects-hourly' && <SelectionModal title="Hourly Projects" options={projects.filter(p => p.category === 'hourly').map(p => p.id)} selected={selectedHourlyProjectIds} onChange={setSelectedHourlyProjectIds} labels={projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onClose={() => setEnlargedModal(null)} />}
      {enlargedModal === 'sheets' && <SelectionModal title="Data Sheets" options={availableSheets.map(s => s.id)} selected={selectedSheetIds} onChange={setSelectedSheetIds} labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})} onClose={() => setEnlargedModal(null)} groups={groupedSheetsForUI} />}
    </div>
  );
};

export default App;
