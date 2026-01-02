
import React from 'react';

interface Metric {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

interface SummaryCardsProps {
  metrics: Metric[];
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {metrics.map((metric, idx) => (
        <div 
          key={idx} 
          className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-xl"
        >
          <div 
            className="absolute -right-4 -bottom-4 text-6xl opacity-10 grayscale group-hover:opacity-20 group-hover:grayscale-0 transition-all"
            style={{ color: metric.color }}
          >
            {metric.icon}
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{metric.icon}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{metric.label}</span>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;