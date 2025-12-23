import React, { useState, useMemo } from 'react';

interface DataTableProps {
  headers: string[];
  data: any[];
  title: string;
  // Specific columns to show in the multi-select filter panel
  filterColumns?: string[];
}

const DataTable: React.FC<DataTableProps> = ({ headers, data, title, filterColumns }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Determine which columns are filterable
  const actualFilterColumns = useMemo(() => {
    return filterColumns || headers.slice(0, 3);
  }, [filterColumns, headers]);

  // Extract unique values for filtering
  const filterableData = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    actualFilterColumns.forEach(col => {
      const values: string[] = (Array.from(new Set(data.map(row => String(row[col] || '')))) as string[])
        .filter(v => v !== '' && v !== 'undefined' && v !== 'null')
        .sort();
      mapping[col] = values;
    });
    return mapping;
  }, [data, actualFilterColumns]);

  const toggleFilterValue = (column: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[column] || [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [column]: next };
    });
  };

  const clearFilters = () => {
    setSelectedFilters({});
    setSearchTerm('');
  };

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchesSearch = searchTerm === '' || headers.some(header => 
        String(row[header] || '').toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchesFilters = (Object.entries(selectedFilters) as [string, string[]][]).every(([col, selectedValues]) => {
        if (selectedValues.length === 0) return true;
        return selectedValues.includes(String(row[col] || ''));
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, headers, searchTerm, selectedFilters]);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    
    const csvRows = [];
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
    
    filteredData.forEach(row => {
      const values = headers.map(header => {
        const val = row[header] ?? '';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totals = useMemo(() => {
    const results: Record<string, { value: any; label?: string; type?: 'numeric' | 'attendance' }> = {};
    headers.forEach(header => {
      const normHeader = header.toLowerCase().replace(/[\s\-_]+/g, "");
      
      // Attendance Detection
      const columnValues = filteredData.map(row => String(row[header] || '').toUpperCase());
      const isAttendanceCol = columnValues.some(v => v === 'PRESENT' || v === 'ABSENT' || v === 'NIL');
      
      if (isAttendanceCol) {
        const presentCount = columnValues.filter(v => v === 'PRESENT').length;
        const absentCount = columnValues.filter(v => v === 'ABSENT').length;
        if (presentCount > 0 || absentCount > 0) {
          results[header] = { 
            value: { present: presentCount, absent: absentCount }, 
            label: 'Attendance',
            type: 'attendance'
          };
          return;
        }
      }

      if (normHeader.includes("videoid")) return;
      if (normHeader.includes("frameid")) {
        const count = filteredData.filter(row => row[header] !== null && row[header] !== undefined && String(row[header]).trim() !== "").length;
        results[header] = { value: count, label: 'Count', type: 'numeric' };
        return;
      }

      const sample = filteredData.find(r => r[header] !== null && r[header] !== undefined && r[header] !== "");
      if (sample && !isNaN(Number(sample[header])) && typeof sample[header] !== 'boolean') {
        const sum = filteredData.reduce((acc, row) => acc + (Number(row[header]) || 0), 0);
        results[header] = { value: sum, label: 'Sum', type: 'numeric' };
      }
    });
    return results;
  }, [filteredData, headers]);

  // Aggregate attendance for the "Grand Totals" label's neighbor cell
  const aggregateAttendance = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    (Object.values(totals) as Array<{ value: any; label?: string; type?: 'numeric' | 'attendance' }>).forEach(t => {
      if (t.type === 'attendance') {
        totalPresent += t.value.present;
        totalAbsent += t.value.absent;
      }
    });
    return { present: totalPresent, absent: totalAbsent };
  }, [totals]);

  const activeFilterCount = Object.values(selectedFilters).flat().length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full animate-in fade-in duration-500">
      {/* Table Header / Action Bar */}
      <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl md:text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400">
              {title}
            </h3>
            <span className="bg-violet-500/10 text-violet-400 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full border border-violet-500/20 whitespace-nowrap">
              {filteredData.length} Records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] md:min-w-[280px]">
              <input
                type="text"
                placeholder="Search by Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800/50 text-slate-100 text-sm rounded-2xl pl-12 pr-6 py-3 w-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder-slate-500 shadow-inner"
              />
              <span className="absolute left-4 top-3.5 text-slate-500 text-lg">🔍</span>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold transition-all border ${
                showFilters || activeFilterCount > 0
                  ? 'bg-violet-600 border-violet-500 text-white shadow-lg'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <span>{showFilters ? '▲' : '▼'}</span>
              Filter
              {activeFilterCount > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px] ml-1">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 hover:border-emerald-500/50 rounded-2xl text-xs md:text-sm font-bold transition-all"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Dynamic Filter Panel */}
        {showFilters && (
          <div className="mt-8 pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-4 duration-300">
            {(Object.entries(filterableData) as [string, string[]][]).map(([col, values]) => (
              <div key={col} className="flex flex-col space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{col === 'name' ? 'Filter by Name' : col}</span>
                  {selectedFilters[col]?.length > 0 && (
                    <button 
                      onClick={() => setSelectedFilters(prev => ({ ...prev, [col]: [] }))}
                      className="text-[10px] text-violet-400 hover:text-white"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-2 h-40 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                  {values.length > 0 ? values.map(val => (
                    <label 
                      key={val} 
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        selectedFilters[col]?.includes(val) ? 'bg-violet-600/20 text-white' : 'hover:bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedFilters[col]?.includes(val) || false}
                        onChange={() => toggleFilterValue(col, val)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="truncate">{val}</span>
                    </label>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 text-[10px] font-bold uppercase tracking-widest">
                       No Data
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="md:col-span-full flex justify-end pt-2">
              <button 
                onClick={clearFilters}
                className="text-xs font-bold text-slate-500 hover:text-red-400 flex items-center gap-2 px-4 py-2"
              >
                🗑️ Reset All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-800 z-10 shadow-lg">
            <tr>
              {headers.map(header => (
                <th key={header} className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-700 whitespace-nowrap bg-slate-800/95 backdrop-blur-sm">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-violet-500/5 transition-all group border-l-4 border-l-transparent hover:border-l-violet-500">
                  {headers.map(header => (
                    <td key={header} className="px-8 py-4 text-sm text-slate-300 whitespace-nowrap group-hover:text-white transition-colors">
                      {row[header] === 'Present' ? (
                        <span className="text-emerald-400 font-bold">P</span>
                      ) : row[header] === 'Absent' ? (
                        <span className="text-rose-400 font-bold">L</span>
                      ) : row[header] === 'NIL' ? (
                        <span className="text-slate-600 font-medium">{row[header]}</span>
                      ) : (
                        row[header] ?? <span className="text-slate-600 font-mono">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <span className="text-5xl">🔭</span>
                    <p className="text-slate-400 italic font-medium">No results found matching your current filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          {filteredData.length > 0 && (Object.keys(totals).length > 0 || aggregateAttendance.present > 0 || aggregateAttendance.absent > 0) && (
            <tfoot className="sticky bottom-0 bg-slate-800 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] border-t-2 border-slate-700">
              <tr className="bg-slate-800/95 backdrop-blur-md">
                {headers.map((header, idx) => (
                  <td key={`foot-${idx}`} className="px-8 py-5 text-sm font-black text-white whitespace-nowrap">
                    {idx === 0 ? (
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400">GRAND TOTALS</span>
                    ) : idx === 1 ? (
                      /* Next to Grand Totals (NAME column): Show Aggregate Attendance across all sheets if applicable */
                      (aggregateAttendance.present > 0 || aggregateAttendance.absent > 0) ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">AGGREGATE (ALL SHEETS)</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded font-black tracking-tighter">P</span>
                            <span className="text-emerald-400 tabular-nums">{aggregateAttendance.present}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded font-black tracking-tighter">L</span>
                            <span className="text-rose-400 tabular-nums">{aggregateAttendance.absent}</span>
                          </div>
                        </div>
                      ) : null
                    ) : (totals[header] !== undefined ? (
                      <div className="flex flex-col">
                        {totals[header].label && totals[header].type !== 'attendance' && (
                          <span className="text-[9px] text-slate-500 uppercase tracking-tighter mb-0.5">{totals[header].label}</span>
                        )}
                        {totals[header].type === 'attendance' ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded font-black tracking-tighter">P</span>
                              <span className="text-emerald-400 tabular-nums">{totals[header].value.present}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded font-black tracking-tighter">L</span>
                              <span className="text-rose-400 tabular-nums">{totals[header].value.absent}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-violet-400 tabular-nums">
                            {totals[header].value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : null)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default DataTable;