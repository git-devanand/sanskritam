
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface VisualizerProps {
  tokens: { word: string; category: string }[];
}

const Visualizer: React.FC<VisualizerProps> = ({ tokens }) => {
  if (!tokens || tokens.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 italic">
        Execute code to see semantic token analysis
      </div>
    );
  }

  // Count categories
  const categoryData = tokens.reduce((acc: any, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});

  const data = Object.keys(categoryData).map(key => ({
    name: key,
    value: categoryData[key]
  }));

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-widest">Semantic Token Distribution</h3>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fbbf24' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {tokens.slice(0, 6).map((t, i) => (
          <div key={i} className="text-[10px] px-2 py-1 bg-slate-800 border border-slate-700 rounded flex justify-between">
            <span className="text-amber-400 truncate mr-2">{t.word}</span>
            <span className="text-slate-500 uppercase">{t.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Visualizer;
