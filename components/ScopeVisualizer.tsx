
import React, { useEffect, useState, useMemo } from 'react';
import { DebugSnapshot } from '../types';

interface ScopeVisualizerProps {
  debugTrace: DebugSnapshot[];
  stepIndex: number;
}

const ScopeVisualizer: React.FC<ScopeVisualizerProps> = ({ debugTrace, stepIndex }) => {
  const currentSnapshot = debugTrace[stepIndex];
  const previousSnapshot = stepIndex > 0 ? debugTrace[stepIndex - 1] : undefined;
  
  const vars = currentSnapshot.variables;
  const prevVars = previousSnapshot?.variables || {};
  
  const allVarNames = useMemo(() => {
    return Array.from(new Set([...Object.keys(vars), ...Object.keys(prevVars)]));
  }, [vars, prevVars]);
  
  const [highlightedVars, setHighlightedVars] = useState<Set<string>>(new Set());
  const [selectedVarHistory, setSelectedVarHistory] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const changed = new Set<string>();
    Object.keys(vars).forEach(key => {
      // Logic for highlighting: newly added or value changed
      if (prevVars[key] === undefined || JSON.stringify(prevVars[key]) !== JSON.stringify(vars[key])) {
        changed.add(key);
      }
    });
    setHighlightedVars(changed);
    
    const timer = setTimeout(() => {
      setHighlightedVars(new Set());
    }, 1200);
    
    return () => clearTimeout(timer);
  }, [stepIndex, vars]); // Re-run when stepIndex or variables change

  const getVarType = (val: any): string => {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'arr';
    if (typeof val === 'object') return 'obj';
    if (typeof val === 'number') return 'num';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'string') return 'str';
    return typeof val;
  };

  const isPrimitive = (val: any): boolean => {
    return val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
  };

  const ValueExplorer: React.FC<{ value: any; isPrev?: boolean; depth?: number }> = ({ value, isPrev = false, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (value === null) return <span className="text-slate-500 italic">null</span>;
    const type = getVarType(value);
    if (type !== 'obj' && type !== 'arr') {
      if (typeof value === 'string') return <span className={isPrev ? "text-rose-300/50" : "text-emerald-400"}>"{value}"</span>;
      if (typeof value === 'number') return <span className={isPrev ? "text-rose-300/50" : "text-blue-400"}>{value}</span>;
      if (typeof value === 'boolean') return <span className={isPrev ? "text-rose-300/50" : "text-pink-400"}>{String(value)}</span>;
      return <span className="text-slate-300">{String(value)}</span>;
    }
    const toggle = (e: React.MouseEvent) => { e.stopPropagation(); setIsExpanded(!isExpanded); };
    const items = type === 'arr' ? value : Object.entries(value);
    return (
      <div className="inline-block align-top">
        <button onClick={toggle} className="flex items-center gap-1 hover:text-amber-400 transition-colors group/toggle">
          <span className="text-slate-600 font-bold group-hover/toggle:text-amber-500">{isExpanded ? '▼' : '▶'}</span>
          <span className="text-slate-500">{type === 'arr' ? `Array(${items.length})` : 'Object'}</span>
        </button>
        {isExpanded && (
          <div className="pl-4 mt-1 border-l border-slate-800 space-y-1 animate-in slide-in-from-left-1">
            {type === 'arr' ? items.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-2"><span className="text-slate-600 text-[10px] w-4 font-mono">{i}</span><ValueExplorer value={item} isPrev={isPrev} depth={depth + 1} /></div>
            )) : items.map(([k, v]: [string, any]) => (
              <div key={k} className="flex items-start gap-2"><span className="text-amber-200/60 font-medium text-[11px] font-mono shrink-0">{k}:</span><ValueExplorer value={v} isPrev={isPrev} depth={depth + 1} /></div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getSignificantHistoryForVar = (name: string) => {
    const fullHistory = debugTrace.slice(0, stepIndex + 1).map((snapshot, idx) => ({
      step: idx + 1, line: snapshot.line, value: snapshot.variables[name]
    })).filter(h => h.value !== undefined);
    const significantHistory: typeof fullHistory = [];
    let lastValue: any = undefined;
    fullHistory.forEach((h) => {
      const currentValString = JSON.stringify(h.value);
      if (currentValString !== lastValue) { significantHistory.push(h); lastValue = currentValString; }
    });
    return significantHistory;
  };

  const filteredVarNames = useMemo(() => {
    let result = allVarNames;
    if (filterType !== 'all') result = result.filter(name => getVarType(vars[name] ?? prevVars[name]) === filterType);
    
    // Custom sort: Put highlighted (changed) variables at the top
    return result.sort((a, b) => {
      const aH = highlightedVars.has(a) ? 1 : 0;
      const bH = highlightedVars.has(b) ? 1 : 0;
      if (aH !== bH) return bH - aH;
      return a.localeCompare(b);
    });
  }, [allVarNames, filterType, vars, prevVars, highlightedVars]);

  return (
    <div className="flex flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-800/50">
        {['all', 'num', 'str', 'bool', 'obj', 'arr'].map(type => (
          <button key={type} onClick={() => setFilterType(type)} className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all border ${filterType === type ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-300'}`}>{type.toUpperCase()}</button>
        ))}
      </div>

      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredVarNames.length === 0 ? (
          <div className="text-[10px] text-slate-600 italic text-center py-8 border border-dashed border-slate-800 rounded-xl">No variables tracked</div>
        ) : filteredVarNames.map((name) => {
            const val = vars[name];
            const prevVal = prevVars[name];
            const isNew = prevVal === undefined && val !== undefined;
            const isChanged = prevVal !== undefined && val !== undefined && JSON.stringify(prevVal) !== JSON.stringify(val);
            const isRemoved = val === undefined && prevVal !== undefined;
            const isCurrentlyHighlighted = highlightedVars.has(name);
            const isSelected = selectedVarHistory === name;

            return (
              <div key={name} onClick={() => setSelectedVarHistory(isSelected ? null : name)} className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col gap-1.5 shadow-sm relative overflow-hidden group hover:bg-slate-900/60 ${
                isSelected ? 'ring-2 ring-amber-500/50 bg-slate-900 border-amber-500/30' :
                isNew ? 'bg-emerald-500/10 border-emerald-500/30 animate-var-entry' :
                isCurrentlyHighlighted ? 'bg-amber-500/10 border-amber-500/50 animate-var-update' :
                isRemoved ? 'bg-red-500/5 border-red-500/20 opacity-40 grayscale blur-[0.5px]' :
                'bg-slate-900/40 border-slate-800'
              }`}>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isRemoved ? 'bg-red-500 shadow-[0_0_8px_red]' : isNew ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : isChanged ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-slate-600'}`}></div>
                    <div className="flex flex-col"><span className={`text-[10px] font-bold font-mono tracking-tight ${isRemoved ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{name}</span></div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {isCurrentlyHighlighted && <span className="text-[7px] bg-amber-500 text-slate-950 font-black px-1 py-0.5 rounded-sm animate-pulse">MUTATED</span>}
                    {isRemoved && <span className="text-[7px] bg-red-500/20 text-red-400 font-black px-1 py-0.5 rounded-sm">DELETED</span>}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 mt-0.5 relative z-10">
                  <div className={`text-sm font-mono font-bold transition-all duration-300 break-all ${isRemoved ? 'text-slate-600' : isChanged ? 'text-amber-400' : isNew ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {isRemoved ? <ValueExplorer value={prevVal} isPrev /> : <ValueExplorer value={val} />}
                  </div>
                  {isChanged && !isSelected && (
                    <div className="flex items-center gap-1.5 text-[9px] font-mono opacity-40 italic pl-1 border-l border-slate-700">
                      <span className="line-through text-slate-500"><ValueExplorer value={prevVal} isPrev /></span>
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7"/></svg>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-slate-800/60 animate-in slide-in-from-top-1">
                    <div className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Change Logs
                    </div>
                    <div className="space-y-3 relative pl-4 border-l border-slate-800">
                      {getSignificantHistoryForVar(name).map((h, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[8px]"><span className="text-slate-500 font-bold uppercase">L{h.line}</span><span className="text-slate-600 italic">Step {h.step}</span></div>
                          <div className="text-[10px] font-mono text-slate-400 bg-slate-950/30 p-1.5 rounded border border-slate-800/40"><ValueExplorer value={h.value} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ScopeVisualizer;
