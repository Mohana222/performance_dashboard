
import React, { useMemo } from 'react';
import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ComposedChart,
  Line,
  Cell
} from 'recharts';
import { COLORS } from '../constants';

// Fixed UserData interface to match the uppercase keys provided by App.tsx (NAME, OBJECTCOUNT, ERRORCOUNT)
interface UserData {
  NAME: string;
  OBJECTCOUNT: number;
  ERRORCOUNT: number;
}

interface UserQualityChartProps {
  data: UserData[];
  title: string;
}

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const name = payload.value;
  
  if (name.includes('@')) {
    const parts = name.split('@');
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          textAnchor="middle" 
          fill="#94a3b8" 
          fontSize={8.5} 
          fontWeight={700}
        >
          <tspan x="0" dy="12">{parts[0]}</tspan>
          <tspan x="0" dy="12">@{parts[1]}</tspan>
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} 
        y={0} 
        dy={12}
        textAnchor="middle" 
        fill="#94a3b8" 
        fontSize={9} 
        fontWeight={700}
      >
        {name}
      </text>
    </g>
  );
};

const UserQualityChart: React.FC<UserQualityChartProps> = ({ data, title }) => {
  // Sort by a composite score to find the "Top Performers"
  // Priority: High volume with high quality
  const chartData = useMemo(() => {
    const processed = data
      // Updated to use uppercase properties matching the new UserData interface
      .filter(u => u.OBJECTCOUNT > 0)
      .map(u => {
        const quality = Number((((u.OBJECTCOUNT - u.ERRORCOUNT) / Math.max(u.OBJECTCOUNT, 1)) * 100).toFixed(2));
        return {
          name: u.NAME,
          objects: u.OBJECTCOUNT,
          errors: u.ERRORCOUNT,
          quality: quality,
          // Composite Score: (Volume weight 40%) * (Quality weight 60%)
          // This prevents someone with 1 object and 100% quality from beating high-volume pros.
          score: (u.OBJECTCOUNT) * (quality / 100)
        };
      });

    return processed
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-white font-bold mb-2 text-xs">Contributor: {label}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between gap-6">
              <span className="text-[10px] text-slate-400 uppercase font-black">QC Objects:</span>
              <span className="text-violet-400 font-mono font-bold text-xs">{payload.find((p:any) => p.dataKey === 'objects')?.value.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-[10px] text-slate-400 uppercase font-black">Errors:</span>
              <span className="text-rose-400 font-mono font-bold text-xs">{payload.find((p:any) => p.dataKey === 'errors')?.value.toLocaleString() || 0}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between gap-6">
                <span className="text-[10px] text-emerald-400 uppercase font-black">Quality Rate:</span>
                <span className="text-emerald-400 font-mono font-bold text-xs">{payload.find((p:any) => p.dataKey === 'quality')?.value}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-[400px] flex flex-col shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full"></div>
      
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
          {title}
        </h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
          High Performance Quality Check
        </span>
      </div>

      <div className="flex-1 min-h-0">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={<CustomXAxisTick />} 
                interval={0}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10 }} 
                width={40}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 100]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#10b981', fontSize: 10, fontWeight: 700 }}
                unit="%"
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.2 }} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              />
              
              <Bar 
                yAxisId="left" 
                dataKey="objects" 
                name="QC Objects" 
                fill={COLORS.primary} 
                radius={[6, 6, 0, 0]} 
                barSize={32} 
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fillOpacity={0.8} />
                ))}
              </Bar>
              <Bar 
                yAxisId="left" 
                dataKey="errors" 
                name="Total Errors" 
                fill={COLORS.danger} 
                radius={[6, 6, 0, 0]} 
                barSize={32} 
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-err-${index}`} fillOpacity={0.8} />
                ))}
              </Bar>
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="quality" 
                name="Quality Rate" 
                stroke="#10b981" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#0f172a' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                animationDuration={1500}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-2">
            <span className="text-4xl">📉</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Insufficient Data for QA Chart</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserQualityChart;
