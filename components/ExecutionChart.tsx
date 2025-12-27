
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

interface ExecutionData {
  label: string;
  value: number;
}

interface ExecutionChartProps {
  data: ExecutionData[];
  title?: string;
}

const ExecutionChart: React.FC<ExecutionChartProps> = ({ data, title = "Execution Analysis" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-xs italic border border-dashed border-slate-800 rounded-xl">
        No execution data available
      </div>
    );
  }

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="h-full flex flex-col p-4 bg-slate-900/50 rounded-xl border border-slate-800 shadow-inner">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="label" 
              stroke="#475569" 
              fontSize={9} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#475569" 
              fontSize={9} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                border: '1px solid #334155', 
                borderRadius: '8px',
                fontSize: '10px'
              }}
              itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExecutionChart;
