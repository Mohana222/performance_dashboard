
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { COLORS } from '../constants.tsx';

interface ChartData {
  name: string;
  value: number;
}

interface OverallPieChartProps {
  data: ChartData[];
  title: string;
}

const OverallPieChart: React.FC<OverallPieChartProps> = ({ data, title }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 h-[400px] flex flex-col">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">{title}</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} stroke="rgba(0,0,0,0)" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OverallPieChart;
