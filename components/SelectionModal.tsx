
import React from 'react';

interface SelectionModalProps {
  title: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  labels?: Record<string, string>;
  onClose: () => void;
}

const SelectionModal: React.FC<SelectionModalProps> = ({ title, options, selected, onChange, labels, onClose }) => {
  const toggleSelection = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => onChange(options);
  const deselectAll = () => onChange([]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-full max-h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">{title}</h2>
            <p className="text-slate-400 font-medium mt-1">{selected.length} of {options.length} items currently selected for data merging.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={selectAll}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-600/20"
            >
              SELECT ALL
            </button>
            <button 
              onClick={deselectAll}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-xl border border-slate-700 transition-all active:scale-95"
            >
              CLEAR NONE
            </button>
            <button 
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-full transition-all text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-950/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {options.map(option => (
              <button
                key={option}
                onClick={() => toggleSelection(option)}
                className={`flex flex-col items-start p-6 rounded-3xl border-2 transition-all group text-left min-h-[140px] justify-between ${
                  selected.includes(option)
                    ? 'bg-violet-600 border-violet-400 text-white shadow-xl ring-2 ring-violet-500/20'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800 shadow-inner'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-4 transition-all flex-shrink-0 ${
                  selected.includes(option) ? 'bg-white text-violet-600 scale-110 shadow-lg' : 'bg-slate-800 border border-slate-700'
                }`}>
                  {selected.includes(option) ? <span className="font-black text-sm">✓</span> : ''}
                </div>
                <div className="w-full">
                  <span className={`block font-black text-sm mb-1 break-words leading-tight ${selected.includes(option) ? 'text-white' : 'text-slate-100'}`}>
                    {labels ? labels[option] : option}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${selected.includes(option) ? 'text-violet-200' : 'text-slate-500'}`}>
                    {selected.includes(option) ? 'Sync Enabled' : 'Inactive Source'}
                  </span>
                </div>
              </button>
            ))}
          </div>
          
          {options.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
               <div className="text-6xl">📭</div>
               <p className="text-slate-500 font-bold uppercase tracking-widest">No Sources Connected</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
               {[...Array(Math.min(selected.length, 5))].map((_, i) => (
                 <div key={i} className="w-8 h-8 rounded-full bg-violet-500 border-2 border-slate-900 flex items-center justify-center shadow-lg">
                    <span className="text-white text-[10px] font-black">✓</span>
                 </div>
               ))}
               {selected.length > 5 && (
                 <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-300">+{selected.length - 5}</div>
               )}
            </div>
            <span className="text-sm font-bold text-slate-400">{selected.length} datasets ready for synchronization</span>
          </div>
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white font-black rounded-2xl shadow-2xl active:scale-95 transition-all uppercase tracking-widest"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectionModal;
