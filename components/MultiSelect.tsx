
import React from 'react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  labels?: Record<string, string>;
  title?: string;
  onEnlarge?: () => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, labels, title = "Select Items", onEnlarge }) => {
  const isAllSelected = selected.length === options.length && options.length > 0;

  const toggleSelection = (option: string) => {
    if (selected.includes(option) && selected.length > 1) {
      onChange(selected.filter(s => s !== option));
    } else if (!selected.includes(option)) {
      onChange([...selected, option]);
    }
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options);
    }
  };

  return (
    <div className="bg-slate-800/20 border border-slate-800/50 p-4 rounded-3xl w-full backdrop-blur-md relative group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/80">{title}</span>
          <span className="text-[10px] font-medium text-slate-400 mt-0.5">{selected.length} of {options.length} Selected</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Merged ALL/NONE Toggle Button */}
          <button 
            onClick={handleToggleAll}
            className={`text-[9px] font-black px-3 py-1 rounded-lg border transition-all active:scale-95 shadow-lg ${
              isAllSelected 
                ? 'bg-slate-700/50 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white' 
                : 'bg-violet-600/20 text-violet-400 border-violet-500/30 hover:bg-violet-600 hover:text-white'
            }`}
          >
            {isAllSelected ? 'NONE' : 'ALL'}
          </button>

          {/* Enlarge Icon next to the toggle button */}
          {onEnlarge && (
            <button 
              onClick={onEnlarge}
              className="text-slate-100 hover:text-violet-400 transition-all p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg shadow-xl border border-slate-700/50 group/icon"
              title="View in large screen"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="group-hover/icon:scale-110 transition-transform"
              >
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Changed to flex-col and overflow-y-auto for top-to-bottom scroll */}
      <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[180px] pr-1 py-1">
        {options.map(option => (
          <button
            key={option}
            onClick={() => toggleSelection(option)}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border-2 ${
              selected.includes(option)
                ? 'bg-violet-600 border-violet-400 text-white shadow-lg'
                : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:border-slate-500 shadow-inner'
            }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              selected.includes(option) ? 'bg-white text-violet-600 shadow-sm' : 'bg-slate-900/50 text-slate-500 border border-slate-700'
            }`}>
              {selected.includes(option) ? <span className="text-[10px] font-black">✓</span> : ''}
            </div>
            <span className={`font-bold text-[11px] leading-tight text-left flex-1 break-words ${selected.includes(option) ? 'text-white' : 'text-slate-100'}`}>
              {labels ? labels[option] : option}
            </span>
          </button>
        ))}
        {options.length === 0 && (
          <div className="text-[10px] text-slate-500 font-medium italic py-6 w-full text-center border-2 border-dashed border-slate-800 rounded-xl">
            No active sources
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;
