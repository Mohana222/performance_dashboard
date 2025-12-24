
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { COLORS } from '../constants';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface OverallPieChartProps {
  data: ChartData[];
  title: string;
}

const OverallPieChart: React.FC<OverallPieChartProps> = ({ data, title }) => {
  // Process data for the chart: Top 5 + Others
  const { chartData, remainingData, totalValue } = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const top5 = sorted.slice(0, 5);
    const remaining = sorted.slice(5);
    const othersValue = remaining.reduce((acc, curr) => acc + curr.value, 0);

    const finalChartData = [...top5];
    if (othersValue > 0) {
      finalChartData.push({ name: 'Others', value: othersValue });
    }

    return { 
      chartData: finalChartData, 
      remainingData: remaining,
      totalValue: data.reduce((acc, curr) => acc + curr.value, 0)
    };
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      const percentage = ((value / totalValue) * 100).toFixed(1);
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-white font-bold text-xs mb-1">{name}</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-slate-400 uppercase font-black">Objects:</span>
              <span className="text-violet-400 font-mono font-bold text-sm">{value.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-slate-400 uppercase font-black">Share:</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">{percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-RADIAN * midAngle);
    const y = cy + radius * Math.sin(-RADIAN * midAngle);

    if (percent < 0.05) return null; // Don't show labels for tiny slices

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central" 
        className="text-[9px] font-black pointer-events-none drop-shadow-md"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-[500px] flex flex-col shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-32 h-32 bg-violet-500/5 blur-[60px] rounded-full"></div>
      
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
          {title}
        </h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
          Analytics
        </span>
      </div>

      <div className="flex flex-1 min-h-0 mt-2 gap-6">
        {/* Pie Chart Section */}
        <div className="flex-[3] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={115}
                paddingAngle={4}
                dataKey="value"
                stroke="#0f172a"
                strokeWidth={2}
                labelLine={false}
                label={renderCustomizedLabel}
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === 'Others' ? '#334155' : COLORS.chart[index % COLORS.chart.length]} 
                    style={{ filter: `drop-shadow(0 0 8px ${entry.name === 'Others' ? '#334155' : COLORS.chart[index % COLORS.chart.length]}44)` }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Info */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</span>
            <span className="block text-xl font-black text-white">{totalValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Right Side Legend / Remaining List */}
        <div className="flex-[2] flex flex-col border-l border-slate-800 pl-6 my-4 overflow-hidden">
          <div className="mb-4">
            <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mb-3">Top Contributors</h4>
            <div className="space-y-2">
              {chartData.filter(d => d.name !== 'Others').map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.chart[index % COLORS.chart.length] }}></div>
                    <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px]">{entry.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{((entry.value / totalValue) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Remaining ({remainingData.length})</h4>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1.5">
              {remainingData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between py-1 border-b border-slate-800/50 hover:bg-slate-800/30 rounded px-1 transition-colors">
                  <span className="text-[10px] font-medium text-slate-400 truncate max-w-[140px]">{entry.name}</span>
                  <span className="text-[9px] font-mono text-slate-600">{entry.value.toLocaleString()}</span>
                </div>
              ))}
              {remainingData.length === 0 && (
                <div className="text-[10px] text-slate-700 italic py-4 text-center">No other contributors</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallPieChart;
