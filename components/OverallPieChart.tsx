
import React from 'react';
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
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-white font-bold text-xs mb-1">{name}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase font-black">Total Objects:</span>
            <span className="text-violet-400 font-mono font-bold text-sm">{value.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Improved label renderer with better spacing and combined info
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent, name, fill } = props;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    
    // Dynamic offsets to prevent label overlap for many items
    const radiusOffset = 25;
    const lineExtension = 35;
    
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + radiusOffset) * cos;
    const my = cy + (outerRadius + radiusOffset) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * lineExtension;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    
    const percentage = (percent * 100).toFixed(1);
    const displayName = name.length > 18 ? name.substring(0, 15) + '...' : name;

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} opacity={0.5} />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text 
          x={ex + (cos >= 0 ? 6 : -6)} 
          y={ey} 
          textAnchor={textAnchor} 
          fill={fill} 
          dominantBaseline="central"
          className="text-[9px] font-black tracking-tight"
        >
          {`${displayName} (${percentage}%)`}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-[500px] flex flex-col shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-32 h-32 bg-violet-500/5 blur-[60px] rounded-full"></div>
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
          {title}
        </h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
          All Annotators
        </span>
      </div>

      <div className="flex-1 min-h-0 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={1.5}
              dataKey="value"
              stroke="#0f172a"
              strokeWidth={1}
              labelLine={false}
              label={renderCustomizedLabel}
              animationBegin={0}
              animationDuration={1000}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS.chart[index % COLORS.chart.length]} 
                  style={{ filter: `drop-shadow(0 0 5px ${COLORS.chart[index % COLORS.chart.length]}33)` }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OverallPieChart;
