import React, { useState, useEffect, useMemo } from 'react';
import { ViewType, RawRow, Project, AttendanceData } from './types';
import { getSheetList, getSheetData, login as apiLogin, findKey } from './services/api';
import { MENU_ITEMS, COLORS, API_URL } from './constants';
import MultiSelect from './components/MultiSelect';
import DataTable from './components/DataTable';
import OverallPieChart from './components/OverallPieChart';
import SummaryCards from './components/SummaryCards';
import ProjectManager from './components/ProjectManager';
import SelectionModal from './components/SelectionModal';
import UserQualityChart from './components/UserQualityChart';
import InfoFooter from './components/InfoFooter';

const DEFAULT_PROJECTS: Project[] = [
  { id: '1', name: 'Default Production', url: API_URL, color: COLORS.primary, category: 'production' }
];

/**
 * Robust time parser to handle Google Sheets time objects, numbers, and strings.
 * Returns minutes from midnight if valid, otherwise null.
 */
const parseTimeToMinutes = (val: any): number | null => {
  if (val === null || val === undefined) return null;
  
  if (val instanceof Date) {
    return val.getHours() * 60 + val.getMinutes();
  }

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

/**
 * Parses sheet names like "1ST SEP LOGIN" or "25TH SEP LOGIN" into a sortable number.
 */
const parseSheetDate = (sheetName: string): number => {
  const cleanName = sheetName.toUpperCase();
  const match = cleanName.match(/(\d+)(?:ST|ND|RD|TH)?\s+([A-Z]{3})/);
  if (!match) return 0;

  const day = parseInt(match[1], 10);
  const monthStr = match[2];
  
  const months: Record<string, number> = {
    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
  };
  
  const month = months[monthStr] ?? 0;
  return new Date(2024, month, day).getTime();
};

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
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [enlargedModal, setEnlargedModal] = useState<'projects-prod' | 'projects-hourly' | 'sheets' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('annotation_projects_v2');
    if (saved) return JSON.parse(saved);
    return DEFAULT_PROJECTS;
  });
  
  const [selectedProdProjectIds, setSelectedProdProjectIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('selected_prod_project_ids');
    if (saved) return JSON.parse(saved);
    return DEFAULT_PROJECTS.filter(p => p.category === 'production').map(p => p.id);
  });

  const [selectedHourlyProjectIds, setSelectedHourlyProjectIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('selected_hourly_project_ids');
    if (saved) return JSON.parse(saved);
    const hourlyIds = projects.filter(p => p.category === 'hourly').map(p => p.id);
    return hourlyIds;
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
    localStorage.setItem('selected_hourly_project_ids', JSON.stringify(selectedHourlyProjectIds));
  }, [selectedProdProjectIds, selectedHourlyProjectIds]);

  useEffect(() => {
    localStorage.setItem('selected_sheet_ids', JSON.stringify(selectedSheetIds));
  }, [selectedSheetIds]);

  // Effect to handle initial "Select All" sheets if none are selected AND no preference exists
  useEffect(() => {
    const saved = localStorage.getItem('selected_sheet_ids');
    // ONLY auto-select if there is absolutely no record of a choice in localStorage (saved === null)
    if (availableSheets.length > 0 && saved === null) {
      setSelectedSheetIds(availableSheets.map(s => s.id));
    }
  }, [availableSheets]);

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
      if (combinedSelectedProjectIds.length === 0) setRawData([]);
    }
  }, [isAuthenticated, combinedSelectedProjectIds, projects]);

  useEffect(() => {
    if (availableSheets.length > 0) {
      const availableIds = new Set(availableSheets.map(s => s.id));
      const validSelectedIds = selectedSheetIds.filter(id => availableIds.has(id));
      if (validSelectedIds.length !== selectedSheetIds.length && validSelectedIds.length > 0) {
        setSelectedSheetIds(validSelectedIds);
      }
    }
  }, [availableSheets]);

  const formatDateString = (val: any): string => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    
    try {
      const res = await apiLogin(targetProject.url, username, password);
      if (res.success) {
        sessionStorage.setItem('ok', '1');
        setIsAuthenticated(true);
      } else {
        setLoginError(res.message || 'Invalid login credentials');
      }
    } catch (err) {
      setLoginError('Connection refused. Is the Google Script set to "Access: Anyone"?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ok');
    setIsAuthenticated(false);
    setRawData([]);
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

  const handleSelectProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    if (project.category === 'production') {
      if (!selectedProdProjectIds.includes(id)) setSelectedProdProjectIds(prev => [...prev, id]);
    } else {
      if (!selectedHourlyProjectIds.includes(id)) setSelectedHourlyProjectIds(prev => [...prev, id]);
    }
  };

  const processedSummaries = useMemo(() => {
    if (!rawData.length) return { annotators: [], users: [], qcUsers: [], qcAnn: [], attendance: [], attendanceHeaders: [] };

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
    
    const employeeData: Record<string, { sno: string, name: string }> = {};
    const attendanceRecords: Record<string, Record<string, 'Present' | 'Absent' | 'NIL'>> = {};
    const uniqueSheetNames = new Set<string>();

    rawData.forEach(row => {
      const category = row['Project Category'];
      const sheetSource = String(row['Sheet Source'] || '');

      if (category === 'production') {
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
      }

      if (category === 'hourly' && sheetSource.toLowerCase().endsWith('login')) {
        uniqueSheetNames.add(sheetSource);
        const rowKeys = Object.keys(row);
        
        const sKey = findKey(rowKeys, "SNO") || rowKeys[0];
        const nKey = findKey(rowKeys, "NAME") || rowKeys[1];
        const lKey = findKey(rowKeys, "Login Time") || rowKeys[5];

        let snoVal = String(row[sKey] || '').trim();
        const employeeName = String(row[nKey] || '').trim();
        const loginTimeVal = row[lKey];

        if (snoVal.includes(':')) snoVal = "";
        
        if (employeeName && employeeName !== "undefined" && employeeName !== "") {
          const loginMinutes = parseTimeToMinutes(loginTimeVal);
          const status = loginMinutes !== null ? 'Present' : 'Absent';
          
          if (!employeeData[employeeName]) {
            employeeData[employeeName] = { sno: snoVal, name: employeeName };
          }
          if (!attendanceRecords[employeeName]) {
            attendanceRecords[employeeName] = {};
          }
          
          const currentStatus = attendanceRecords[employeeName][sheetSource];
          if (status === 'Present' || !currentStatus) {
            attendanceRecords[employeeName][sheetSource] = status;
          }
          if (!employeeData[employeeName].sno && snoVal) {
            employeeData[employeeName].sno = snoVal;
          }
        }
      }
    });

    const sortedSheetHeaders = Array.from(uniqueSheetNames).sort((a, b) => {
      const timeA = parseSheetDate(a);
      const timeB = parseSheetDate(b);
      if (timeA !== timeB) return timeA - timeB;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    const attendanceFlatRaw = Object.keys(employeeData).map(name => {
      const meta = employeeData[name];
      const row: Record<string, string> = { _originalSno: meta.sno, NAME: meta.name };
      sortedSheetHeaders.forEach(sheet => {
        row[sheet] = attendanceRecords[name][sheet] || 'NIL';
      });
      return row;
    });

    const sortedFlat = attendanceFlatRaw.sort((a, b) => {
      const snoA = parseInt(a._originalSno, 10);
      const snoB = parseInt(b._originalSno, 10);
      if (!isNaN(snoA) && !isNaN(snoB)) return snoA - snoB;
      return a.NAME.localeCompare(b.NAME);
    });

    const attendanceFlat = sortedFlat.map((row, idx) => {
      const { _originalSno, ...rest } = row;
      return {
        SNO: (idx + 1).toString(),
        ...rest
      };
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
      })).sort((a,b) => b.objectCount - a.objectCount),
      attendance: attendanceFlat,
      attendanceHeaders: ['SNO', 'NAME', ...sortedSheetHeaders]
    };
  }, [rawData]);

  const metrics = useMemo(() => {
    const prodData = rawData.filter(r => r['Project Category'] === 'production');
    const globalFrames = new Set<string>();
    const keys = prodData.length > 0 ? Object.keys(prodData[0]) : [];
    const kFrame = findKey(keys, "Frame ID");
    
    prodData.forEach(r => {
      const f = String(r[kFrame || ''] || '').trim();
      if (f) globalFrames.add(f);
    });

    const totalObjects = processedSummaries.annotators.reduce((acc, cur) => acc + cur.objectCount, 0);
    const qcObjectsCount = processedSummaries.qcAnn.reduce((acc, cur) => acc + cur.objectCount, 0);
    const totalErrors = processedSummaries.qcAnn.reduce((acc, cur) => acc + cur.errorCount, 0);
    const qualityRate = qcObjectsCount > 0 ? (((qcObjectsCount - totalErrors) / qcObjectsCount) * 100).toFixed(2) + '%' : '0%';

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
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <StarField />
        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-[32px] border border-white/10 p-10 md:p-14 rounded-[3.5rem] shadow-2xl relative z-10 animate-fade-up login-glow mt-auto">
          <div className="relative z-10 text-center mb-12">
             <div className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black tracking-widest uppercase mb-4">Secure Network Portal</div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter shimmer-text py-2">DesiCrew</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-violet-400 transition-colors">👤</div>
                <input type="text" placeholder="Username" required className="w-full bg-slate-900/60 border border-slate-800/80 text-white pl-12 pr-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder-slate-600 text-sm font-medium" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-violet-400 transition-colors">🔒</div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Password" 
                  required 
                  className="w-full bg-slate-900/60 border border-slate-800/80 text-white pl-12 pr-12 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder-slate-600 text-sm font-medium" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-violet-400 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {loginError && <div className="flex items-center gap-2 text-rose-400 text-xs font-bold justify-center bg-rose-500/5 py-3 rounded-xl border border-rose-500/10 animate-pulse text-center"><span>⚠️</span> {loginError}</div>}
            <button type="submit" disabled={isLoading} className="group relative w-full h-14 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50 text-xs uppercase tracking-[0.2em] overflow-hidden">
              <span className="relative z-10">{isLoading ? 'Establishing Connection...' : 'Enter Dashboard'}</span>
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          </form>
        </div>
        
        <div className="mt-auto w-full max-w-md relative z-10">
          <InfoFooter />
          <div className="text-center pb-8 pt-2 text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] pointer-events-none mix-blend-screen opacity-50">Precision • Efficiency • Scale</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden">
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl transition-all duration-300 relative ${isSidebarOpen ? 'w-96 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full overflow-hidden'}`}>
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6 min-w-[24rem]">
          <h2 className="text-3xl font-black text-white tracking-tighter mb-6">DesiCrew</h2>
          <nav className="space-y-1">
            {MENU_ITEMS.map((item) => (
              <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 transition-all ${currentView === item.id ? 'bg-violet-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'}`}>
                <span className="text-2xl">{item.icon}</span><span className="font-bold text-sm tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>
          <hr className="border-slate-800" />
          <div className="space-y-6">
            <MultiSelect options={prodProjects.map(p => p.id)} selected={selectedProdProjectIds} onChange={setSelectedProdProjectIds} labels={prodProjects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} title="Select Spreadsheets (Production)" onEnlarge={() => setEnlargedModal('projects-prod')} />
            <MultiSelect options={hourlyProjects.map(p => p.id)} selected={selectedHourlyProjectIds} onChange={setSelectedHourlyProjectIds} labels={hourlyProjects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} title="Select Spreadsheets (Hourly)" onEnlarge={() => setEnlargedModal('projects-hourly')} />
            <MultiSelect options={availableSheets.map(s => s.id)} selected={selectedSheetIds} onChange={setSelectedSheetIds} labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})} title="Select Data Sheets" onEnlarge={() => setEnlargedModal('sheets')} />
          </div>
        </div>
        <div className="p-8 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 min-w-[24rem]">
          <button onClick={() => setShowProjectManager(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm border border-slate-700 shadow-xl">⚙️ Project Setup</button>
        </div>
      </aside>

      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`fixed top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-100 shadow-2xl transition-all duration-300 hover:bg-violet-600 group ${isSidebarOpen ? 'left-[23.2rem]' : 'left-6'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`}><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <main className="flex-1 overflow-auto bg-slate-950 p-6 md:p-10 custom-scrollbar transition-all duration-300">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex-1">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{MENU_ITEMS.find(m => m.id === currentView)?.label || 'Dashboard'}</h1>
            <p className="text-slate-500 text-sm mt-1">Synchronized view of <span className="text-violet-400 font-bold">{selectedSheetIds.length}</span> datasets from <span className="text-violet-400 font-bold">{combinedSelectedProjectIds.length}</span> sources.</p>
          </div>
          <div className="flex items-center gap-4">
             {(isDataLoading || isLoading) && <div className="flex items-center gap-2 text-xs text-violet-400 font-bold animate-pulse bg-violet-400/5 px-4 py-2 rounded-xl border border-violet-400/20 shadow-lg">Refreshing Data...</div>}
             <button onClick={handleLogout} className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-xl transition-all hover:bg-red-500/20 hover:border-red-500/50"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></button>
          </div>
        </header>

        {(isDataLoading || isLoading) && rawData.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 text-center">
             <div className="w-20 h-20 border-8 border-violet-600/10 border-t-violet-600 rounded-full animate-spin"></div>
             <h3 className="text-white font-bold text-xl">Connecting Connection Hub...</h3>
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
                      <div className="lg:col-span-3"><OverallPieChart data={pieData} title="Annotator Performance: Objects" /></div>
                      <div className="lg:col-span-2"><UserQualityChart data={processedSummaries.qcUsers} title="Top QC Quality Rates" /></div>
                    </div>
                  </>
                )}
                {currentView === 'raw' && <DataTable title="Consolidated Raw Data" headers={rawHeaders} data={rawData} filterColumns={[kTask, kLabelSet, kAnnotatorName, kUserName, kDate, 'Project Category']} />}
                {currentView === 'annotator' && <DataTable title="Annotator Output Summary" headers={['name', 'frameCount', 'objectCount']} data={processedSummaries.annotators} filterColumns={['name']} />}
                {currentView === 'username' && <DataTable title="Username Output Summary" headers={['name', 'frameCount', 'objectCount']} data={processedSummaries.users} filterColumns={['name']} />}
                {currentView === 'qc-user' && <DataTable title="Quality Assurance by Username" headers={['name', 'objectCount', 'errorCount']} data={processedSummaries.qcUsers} filterColumns={['name']} />}
                {currentView === 'qc-annotator' && <DataTable title="Quality Assurance by Annotator" headers={['name', 'objectCount', 'errorCount']} data={processedSummaries.qcAnn} filterColumns={['name']} />}
                {currentView === 'attendance' && (
                  processedSummaries.attendance.length > 0 ? (
                    <DataTable 
                      title="Attendance Summary: Monthly Pivot Grid" 
                      headers={processedSummaries.attendanceHeaders} 
                      data={processedSummaries.attendance} 
                      filterColumns={['NAME']}
                    />
                  ) : (
                    <div className="h-[40vh] flex flex-col items-center justify-center border-4 border-dashed border-slate-900 rounded-[3rem] text-slate-700 space-y-4">
                      <div className="text-6xl grayscale opacity-20">📅</div>
                      <h3 className="text-slate-400 font-bold text-lg">No "Login" sheets found in Hourly projects</h3>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        )}
      </main>

      {showProjectManager && <ProjectManager projects={projects} activeProjectId={combinedSelectedProjectIds[0] || ''} onAdd={addProject} onUpdate={updateProject} onDelete={deleteProject} onSelect={handleSelectProject} onClose={() => setShowProjectManager(false)} />}
      {enlargedModal === 'projects-prod' && <SelectionModal title="Production Project Selection" options={prodProjects.map(p => p.id)} selected={selectedProdProjectIds} onChange={setSelectedProdProjectIds} labels={prodProjects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onClose={() => setEnlargedModal(null)} />}
      {enlargedModal === 'projects-hourly' && <SelectionModal title="Hourly Project Selection" options={hourlyProjects.map(p => p.id)} selected={selectedHourlyProjectIds} onChange={setSelectedHourlyProjectIds} labels={hourlyProjects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})} onClose={() => setEnlargedModal(null)} />}
      {enlargedModal === 'sheets' && <SelectionModal title="Data Sheet Selection" options={availableSheets.map(s => s.id)} selected={selectedSheetIds} onChange={setSelectedSheetIds} labels={availableSheets.reduce((acc, s) => ({ ...acc, [s.id]: s.label }), {})} onClose={() => setEnlargedModal(null)} />}
    </div>
  );
};

export default App;