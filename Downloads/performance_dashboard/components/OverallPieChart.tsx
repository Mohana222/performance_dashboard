
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
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

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  
  return (
    <g>
      <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#94a3b8" className="text-[10px] font-black uppercase tracking-widest">
        Total objects
      </text>
      <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#fff" className="text-2xl font-black">
        {payload.totalOverall?.toLocaleString() || value.toLocaleString()}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0 0 12px ${fill}66)` }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
      />
    </g>
  );
};

const OverallPieChart: React.FC<OverallPieChartProps> = ({ data, title }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const { chartData, totalValue } = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    // Expand to top 10 users
    const top10 = sorted.slice(0, 10);
    const remaining = sorted.slice(10);
    const othersValue = remaining.reduce((acc, curr) => acc + curr.value, 0);
    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    const finalChartData = top10.map(item => ({ ...item, totalOverall: total }));
    if (othersValue > 0) {
      finalChartData.push({ name: 'Others', value: othersValue, totalOverall: total });
    }

    return { 
      chartData: finalChartData, 
      totalValue: total
    };
  }, [data]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
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
          Distribution
        </span>
      </div>

      <div className="flex flex-1 min-h-0 mt-2 gap-8">
        {/* Pie Chart Section */}
        <div className="flex-[2] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                {...({
                  activeIndex: activeIndex,
                  activeShape: renderActiveShape,
                  data: chartData,
                  cx: "50%",
                  cy: "50%",
                  innerRadius: 80,
                  outerRadius: 115,
                  paddingAngle: 5,
                  dataKey: "value",
                  stroke: "none",
                  onMouseEnter: onPieEnter,
                  animationBegin: 0,
                  animationDuration: 800
                } as any)}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === 'Others' ? '#334155' : COLORS.chart[index % COLORS.chart.length]} 
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Section - Extended Top Contributors */}
        <div className="flex-[3] flex flex-col border-l border-slate-800 pl-6 my-2 overflow-hidden">
          <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mb-4">Top 10 Contributors</h4>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {chartData.map((entry, index) => {
              const percentage = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : "0.0";
              const isActive = activeIndex === index;
              const isOthers = entry.name === 'Others';
              const color = isOthers ? '#334155' : COLORS.chart[index % COLORS.chart.length];
              
              return (
                <div 
                  key={entry.name} 
                  className={`transition-all duration-300 py-1 ${isActive ? 'translate-x-1' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full transition-all ${isActive ? 'scale-125' : ''}`} style={{ backgroundColor: color }}></div>
                      <span className={`text-[11px] font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-400'} truncate max-w-[180px]`}>
                        {entry.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className={`text-[9px] font-mono font-medium ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{entry.value.toLocaleString()}</span>
                       <span className={`text-[10px] font-mono font-bold w-12 text-right ${isActive ? 'text-violet-400' : 'text-slate-500'}`}>{percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: color,
                        boxShadow: isActive ? `0 0 8px ${color}88` : 'none'
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {chartData.length === 0 && (
              <div className="text-[10px] text-slate-700 italic py-4 text-center">No contributor data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallPieChart;