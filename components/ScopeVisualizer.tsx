
import React, { useEffect, useState } from 'react';
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
  
  const allVarNames = Array.from(new Set([...Object.keys(vars), ...Object.keys(prevVars)]));
  
  const [highlightedVars, setHighlightedVars] = useState<Set<string>>(new Set());
  const [selectedVarHistory, setSelectedVarHistory] = useState<string | null>(null);

  useEffect(() => {
    const changed = new Set<string>();
    Object.keys(vars).forEach(key => {
      if (prevVars[key] !== undefined && JSON.stringify(prevVars[key]) !== JSON.stringify(vars[key])) {
        changed.add(key);
      }
    });
    setHighlightedVars(changed);
    
    const timer = setTimeout(() => {
      setHighlightedVars(new Set());
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [currentSnapshot]);

  const getVarType = (val: any): string => {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'arr[' + val.length + ']';
    if (typeof val === 'object') return 'obj';
    if (typeof val === 'number') return 'num';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'string') return 'str';
    return typeof val;
  };

  const isPrimitive = (val: any): boolean => {
    return val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
  };

  const getDelta = (current: any, previous: any) => {
    if (typeof current === 'number' && typeof previous === 'number') {
      const diff = current - previous;
      if (diff === 0) return null;
      return diff > 0 ? `+${diff}` : `${diff}`;
    }
    return null;
  };

  const renderValue = (val: any, isPrev = false): React.ReactNode => {
    if (val === null) return <span className="text-slate-500 italic">null</span>;
    
    if (Array.isArray(val)) {
      return (
        <span className="text-slate-400">
          [
          {val.map((item, i) => (
            <React.Fragment key={i}>
              {renderValue(item, isPrev)}
              {i < val.length - 1 ? ', ' : ''}
            </React.Fragment>
          ))}
          ]
        </span>
      );
    }
    
    if (typeof val === 'object') {
      const entries = Object.entries(val);
      return (
        <span className="text-slate-400">
          {'{ '}
          {entries.map(([k, v], i) => (
            <React.Fragment key={k}>
              <span className="text-amber-200/60 font-medium">{k}</span>
              <span className="text-slate-600 mx-1">:</span>
              {renderValue(v, isPrev)}
              {i < entries.length - 1 ? ', ' : ''}
            </React.Fragment>
          ))}
          {' }'}
        </span>
      );
    }

    if (typeof val === 'string') return <span className={isPrev ? "text-rose-300/70" : "text-emerald-400"}>"{val}"</span>;
    if (typeof val === 'number') return <span className={isPrev ? "text-rose-300/70" : "text-blue-400"}>{val}</span>;
    if (typeof val === 'boolean') return <span className={isPrev ? "text-rose-300/70" : "text-pink-400"}>{String(val)}</span>;
    
    return String(val);
  };

  /**
   * Filters the history to show only when the variable's value actually changed
   * to provide a cleaner timeline of mutations.
   */
  const getSignificantHistoryForVar = (name: string) => {
    const fullHistory = debugTrace.slice(0, stepIndex + 1).map((snapshot, idx) => ({
      step: idx + 1,
      line: snapshot.line,
      value: snapshot.variables[name]
    })).filter(h => h.value !== undefined);

    const significantHistory: typeof fullHistory = [];
    let lastValue: any = undefined;

    fullHistory.forEach((h) => {
      const currentValString = JSON.stringify(h.value);
      if (currentValString !== lastValue) {
        significantHistory.push(h);
        lastValue = currentValString;
      }
    });

    return significantHistory;
  };

  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
        {allVarNames.length === 0 ? (
          <div className="text-[10px] text-slate-600 italic text-center py-8 border border-dashed border-slate-800 rounded-xl">
            No variables initialized at this step
          </div>
        ) : (
          allVarNames.sort().map((name) => {
            const val = vars[name];
            const prevVal = prevVars[name];
            const isNew = prevVal === undefined && val !== undefined;
            const isChanged = prevVal !== undefined && val !== undefined && JSON.stringify(prevVal) !== JSON.stringify(val);
            const isRemoved = val === undefined && prevVal !== undefined;
            const isCurrentlyHighlighted = highlightedVars.has(name);
            const valIsPrimitive = isPrimitive(val);
            const isSelected = selectedVarHistory === name;
            const delta = getDelta(val, prevVal);

            return (
              <div 
                key={name} 
                onClick={() => setSelectedVarHistory(isSelected ? null : name)}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col gap-1.5 shadow-sm relative overflow-hidden group hover:scale-[1.01] active:scale-[0.99] ${
                  isSelected ? 'ring-2 ring-amber-500/50 bg-slate-900 border-amber-500/30' :
                  isNew ? 'bg-emerald-500/10 border-emerald-500/30 animate-var-entry' :
                  isCurrentlyHighlighted ? 'bg-amber-500/10 border-amber-500/50 animate-var-update ring-1 ring-amber-500/20' :
                  isRemoved ? 'bg-red-500/5 border-red-500/10 opacity-30 grayscale' :
                  'bg-slate-900/40 border-slate-800'
                }`}
              >
                {/* Animated status glow */}
                {isCurrentlyHighlighted && (
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none"></div>
                )}

                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                      isRemoved ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                      isNew ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 
                      isChanged ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 
                      'bg-slate-500'
                    }`}></div>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-bold font-mono tracking-tight transition-colors duration-300 ${
                        isRemoved ? 'text-slate-500 line-through' : 'text-slate-200'
                      }`}>
                        {name}
                      </span>
                      {!isRemoved && (
                        <span className="text-[8px] text-slate-500 font-mono uppercase opacity-60">
                          {getVarType(val)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {isCurrentlyHighlighted && (
                      <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded animate-pulse">
                        UPDATED
                      </span>
                    )}
                    {delta && (
                       <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${parseFloat(delta) > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                          {delta}
                       </span>
                    )}
                    <svg className={`w-3 h-3 text-slate-600 transition-transform ${isSelected ? 'rotate-180 text-amber-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 mt-0.5 relative z-10">
                  <div className={`text-sm font-mono font-bold transition-all duration-300 break-all ${
                    isRemoved ? 'text-slate-600' : 
                    isChanged ? 'text-amber-400' : 
                    isNew ? 'text-emerald-400' : 
                    'text-slate-300'
                  }`}>
                    {isRemoved ? renderValue(prevVal) : renderValue(val)}
                  </div>
                  
                  {isChanged && !isSelected && (
                    <div className={`flex items-start gap-1.5 animate-in fade-in slide-in-from-left-2 mt-1 border-l pl-2 ${
                      valIsPrimitive 
                        ? 'bg-rose-500/5 border-rose-500/30 py-1 pr-2 rounded-r' 
                        : 'border-slate-800'
                    }`}>
                      <svg className={`w-2.5 h-2.5 mt-1 shrink-0 ${valIsPrimitive ? 'text-rose-400' : 'text-slate-500/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 19l-7-7 7-7" />
                      </svg>
                      <div className={`text-[10px] font-mono break-all line-through ${
                        valIsPrimitive ? 'text-rose-300/50' : 'text-slate-500/60 opacity-40 italic'
                      }`}>
                        {renderValue(prevVal, true)}
                      </div>
                    </div>
                  )}
                </div>

                {/* History Timeline Subsection */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-slate-800 animate-in slide-in-from-top-2 duration-300">
                    <div className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>Mutation Timeline</span>
                      </div>
                      <span className="opacity-50 font-mono bg-slate-800 px-2 py-0.5 rounded">Changes only</span>
                    </div>
                    <div className="space-y-4 relative pl-5">
                      {/* Timeline Stem */}
                      <div className="absolute left-[7px] top-1.5 bottom-1.5 w-[1px] bg-gradient-to-b from-amber-500/50 via-slate-800 to-slate-800/20"></div>
                      
                      {getSignificantHistoryForVar(name).map((h, i) => {
                        const isLatest = i === getSignificantHistoryForVar(name).length - 1;
                        return (
                          <div key={i} className="relative group/step">
                            {/* Connector Dot */}
                            <div className={`absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full border-2 border-slate-900 z-10 transition-all ${
                              isLatest 
                                ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] scale-110' 
                                : 'bg-slate-700 group-hover/step:bg-slate-500'
                            }`}></div>
                            
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-500 uppercase">Step {h.step}</span>
                                <span className="text-[8px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-700/50">L{h.line}</span>
                                {i === 0 && <span className="text-[8px] text-emerald-500/60 font-bold uppercase tracking-tighter">Initial</span>}
                                {i > 0 && <span className="text-[8px] text-amber-500/60 font-bold uppercase tracking-tighter">Modified</span>}
                              </div>
                              <div className={`text-[11px] font-mono break-all leading-relaxed p-2 rounded-lg bg-slate-950/40 border border-slate-800/30 transition-all ${
                                isLatest ? 'text-amber-400 font-bold border-amber-500/10' : 'text-slate-400 opacity-80'
                              }`}>
                                {renderValue(h.value)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
