
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
  Line
} from 'recharts';
import { COLORS } from '../constants.tsx';

interface UserData {
  name: string;
  objectCount: number;
  errorCount: number;
}

interface UserQualityChartProps {
  data: UserData[];
  title: string;
}

const UserQualityChart: React.FC<UserQualityChartProps> = ({ data, title }) => {
  const chartData = useMemo(() => {
    return [...data]
      .filter(u => u.objectCount > 0)
      .map(u => ({
        name: u.name,
        objects: u.objectCount,
        errors: u.errorCount,
        quality: Number((((u.objectCount - u.errorCount) / u.objectCount) * 100).toFixed(2))
      }))
      .sort((a, b) => b.quality - a.quality)
      .slice(0, 3);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-white font-bold mb-2">ID: {label}</p>
          <div className="space-y-1">
            <p className="text-xs flex justify-between gap-4">
              <span className="text-slate-400">QC Objects:</span>
              <span className="text-violet-400 font-mono">{payload[0].value.toLocaleString()}</span>
            </p>
            <p className="text-xs flex justify-between gap-4">
              <span className="text-slate-400">Errors:</span>
              <span className="text-rose-400 font-mono">{payload[1].value.toLocaleString()}</span>
            </p>
            <div className="mt-2 pt-2 border-t border-slate-800">
              <p className="text-xs flex justify-between gap-4 font-bold">
                <span className="text-emerald-400">Quality:</span>
                <span className="text-emerald-400">{payload[2].value}%</span>
              </p>
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
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {title}
        </h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
          Top 3 Quality Rates
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10 }} 
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              domain={[0, 100]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#10b981', fontSize: 10, fontWeight: 700 }}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
            <Legend 
              verticalAlign="top" 
              align="right" 
              wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px', fontSize: '10px', fontWeight: 800 }}
            />
            
            <Bar 
              yAxisId="left" 
              dataKey="objects" 
              name="QC Objects" 
              fill={COLORS.primary} 
              radius={[4, 4, 0, 0]} 
              barSize={20} 
            />
            <Bar 
              yAxisId="left" 
              dataKey="errors" 
              name="Total Errors" 
              fill={COLORS.danger} 
              radius={[4, 4, 0, 0]} 
              barSize={20} 
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="quality" 
              name="Quality Rate" 
              stroke="#10b981" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default UserQualityChart;
