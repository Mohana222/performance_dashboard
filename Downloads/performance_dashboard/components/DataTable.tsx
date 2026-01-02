
import React, { useState, useMemo } from 'react';

interface DataTableProps {
  headers: string[];
  data: any[];
  title: string;
  filterColumns?: string[];
}

const DataTable: React.FC<DataTableProps> = ({ headers, data, title, filterColumns }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  const actualFilterColumns = useMemo(() => {
    return filterColumns || headers.slice(0, 3);
  }, [filterColumns, headers]);

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

  const totals = useMemo(() => {
    const results: Record<string, { value: any; label?: string; type?: 'numeric' | 'attendance' }> = {};
    headers.forEach(header => {
      const normHeader = header.toLowerCase().replace(new RegExp("[\\s\\-_]+", "g"), "");
      
      // Explicitly ignore 'Video ID' from totals
      if (normHeader === "videoid") {
        return;
      }

      // Explicitly handle 'Frame ID' as a count instead of a sum
      if (normHeader === "frameid") {
        const count = filteredData.filter(row => row[header] !== null && row[header] !== undefined && String(row[header]).trim() !== "").length;
        results[header] = { value: count, label: 'Count', type: 'numeric' };
        return;
      }

      const columnValues = filteredData.map(row => String(row[header] || '').toUpperCase());
      const isAttendanceCol = columnValues.some(v => v === 'PRESENT' || v === 'ABSENT' || v === 'NIL' || v === 'P(1/2)');
      
      if (isAttendanceCol) {
        const pCount = columnValues.filter(v => v === 'PRESENT').length;
        const lCount = columnValues.filter(v => v === 'ABSENT').length;
        const hCount = columnValues.filter(v => v === 'P(1/2)').length;
        
        if (pCount > 0 || lCount > 0 || hCount > 0) {
          results[header] = { 
            value: { present: pCount, absent: lCount, half: hCount }, 
            label: 'Attendance',
            type: 'attendance'
          };
          return;
        }
      }

      const sumKeys = ["framecount", "objectcount", "errorcount", "numberofobjectannotated"];
      if (sumKeys.includes(normHeader)) {
        const sum = filteredData.reduce((acc, row) => acc + (Number(row[header]) || 0), 0);
        results[header] = { value: sum, label: 'Sum', type: 'numeric' };
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

  const overallAttendanceTotal = useMemo(() => {
    const summary = { present: 0, half: 0, absent: 0 };
    let hasAttendance = false;
    // Fix: Explicitly cast Object.values(totals) as any[] to solve unknown type property access errors
    (Object.values(totals) as any[]).forEach(t => {
      if (t.type === 'attendance') {
        summary.present += t.value.present;
        summary.half += t.value.half;
        summary.absent += t.value.absent;
        hasAttendance = true;
      }
    });
    return hasAttendance ? summary : null;
  }, [totals]);

  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    const csvRows = [];
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
    filteredData.forEach(row => {
      const values = headers.map(header => {
        let val = row[header] ?? '';
        if (val === 'Present') val = 'P';
        else if (val === 'Absent') val = 'L';
        else if (val === 'P(1/2)') val = 'HD';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });
    csvRows.push(headers.map(() => '""').join(','));
    const totalsRow = headers.map((header, idx) => {
      if (idx === 0) return `"GRAND TOTALS"`;
      let cell = '';
      if (totals[header]) {
        if (totals[header].type === 'attendance') {
          cell = `P: ${totals[header].value.present} | L: ${totals[header].value.absent} | HD: ${totals[header].value.half}`;
        } else {
          cell = String(totals[header].value);
        }
      }
      return `"${cell.replace(/"/g, '""')}"`;
    });
    csvRows.push(totalsRow.join(','));
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `${title.toLowerCase().replace(new RegExp("\\s+", "g"), '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeFilterCount = Object.values(selectedFilters).flat().length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full animate-in fade-in duration-500">
      <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl md:text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400">{title}</h3>
            <span className="bg-violet-500/10 text-violet-400 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full border border-violet-500/20">{filteredData.length} Records</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-800/50 text-slate-100 text-sm rounded-2xl px-6 py-3 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[200px]" />
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold transition-all border ${showFilters || activeFilterCount > 0 ? 'bg-violet-600 border-violet-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Filter {activeFilterCount > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-lg ml-1">{activeFilterCount}</span>}</button>
            <button onClick={exportToCSV} className="px-5 py-3 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs md:text-sm font-bold transition-all">📥 Export CSV</button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-8 pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-4">
            {(Object.entries(filterableData) as [string, string[]][]).map(([col, values]) => (
              <div key={col} className="flex flex-col space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{col}</span>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-2 h-40 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                  {values.map(val => (
                    <label key={val} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs cursor-pointer ${selectedFilters[col]?.includes(val) ? 'bg-violet-600/20 text-white' : 'hover:bg-slate-700/50 text-slate-400'}`}>
                      <input type="checkbox" checked={selectedFilters[col]?.includes(val) || false} onChange={() => toggleFilterValue(col, val)} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-violet-600" />
                      <span className="truncate">{val}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-auto flex-1 custom-scrollbar max-h-[640px] relative">
        <table className="w-full text-left border-collapse min-w-full">
          <thead className="sticky top-0 bg-[#1e293b] z-20">
            <tr>
              {headers.map(header => (
                <th key={header} className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-700 whitespace-nowrap">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-violet-500/5 group">
                  {headers.map(header => (
                    <td key={header} className="px-8 py-4 text-sm text-slate-300 whitespace-nowrap group-hover:text-white">
                      {row[header] === 'Present' ? <span className="text-emerald-400 font-bold">P</span> : 
                       row[header] === 'Absent' ? <span className="text-rose-400 font-bold">L</span> : 
                       row[header] === 'P(1/2)' ? <span className="text-orange-400 font-bold">HD</span> : 
                       row[header] === 'NIL' ? <span className="text-slate-600">{row[header]}</span> : 
                       (row[header] ?? <span className="text-slate-600 font-mono">-</span>)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr><td colSpan={headers.length} className="px-8 py-20 text-center text-slate-600 italic">No results found</td></tr>
            )}
          </tbody>
          {filteredData.length > 0 && (
            <tfoot className="sticky bottom-0 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] bg-[#1e293b]">
              <tr>
                {headers.map((header, idx) => (
                  <td key={`foot-${idx}`} className="px-8 py-5 text-sm font-black text-white whitespace-nowrap">
                    {idx === 0 ? (
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400">GRAND TOTALS</span>
                    ) : idx === 1 ? (
                      <div className="flex flex-col gap-2">
                         {/* Display aggregate count for summary views */}
                         <span className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-black border-b border-slate-700/50 pb-1">
                            TOTAL COUNT: {filteredData.length}
                         </span>
                         
                         {overallAttendanceTotal ? (
                          <div className="flex flex-row flex-wrap items-center gap-x-4 text-[10px] uppercase tracking-[0.1em]">
                            <span className="text-emerald-400">TOTAL P: {overallAttendanceTotal.present}</span>
                            <span className="text-orange-400">TOTAL HD: {overallAttendanceTotal.half}</span>
                            <span className="text-rose-400">TOTAL L: {overallAttendanceTotal.absent}</span>
                          </div>
                         ) : (
                           totals[header] && (
                            <span className="text-violet-400">{totals[header].value.toLocaleString()}</span>
                           )
                         )}
                      </div>
                    ) : (
                      totals[header] && (
                        totals[header].type === 'attendance' ? (
                          <div className="flex flex-row flex-wrap items-center gap-x-4 text-[10px] uppercase tracking-wider">
                            <span className="text-emerald-400">P: {totals[header].value.present}</span>
                            <span className="text-orange-400">HD: {totals[header].value.half}</span>
                            <span className="text-rose-400">L: {totals[header].value.absent}</span>
                          </div>
                        ) : (
                          <span className="text-violet-400">{totals[header].value.toLocaleString()}</span>
                        )
                      )
                    )}
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