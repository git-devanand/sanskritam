
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
    if (val === null) return <span className="text-slate-500">null</span>;
    
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

  const getHistoryForVar = (name: string) => {
    return debugTrace.slice(0, stepIndex + 1).map((snapshot, idx) => ({
      step: idx + 1,
      line: snapshot.line,
      value: snapshot.variables[name]
    })).filter(h => h.value !== undefined);
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
                    <div className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                      <span>Historical Trace</span>
                      <span className="opacity-50 font-mono">Steps 1 → {stepIndex + 1}</span>
                    </div>
                    <div className="space-y-3 relative pl-4">
                      <div className="absolute left-[7px] top-0 bottom-0 w-[1px] bg-slate-800"></div>
                      {getHistoryForVar(name).map((h, i) => (
                        <div key={i} className="relative group/step">
                          <div className={`absolute -left-[12.5px] top-1.5 w-2 h-2 rounded-full border border-slate-900 z-10 transition-all ${h.step === stepIndex + 1 ? 'bg-amber-500 scale-125' : 'bg-slate-700 group-hover/step:bg-slate-500'}`}></div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-500">STEP {h.step} <span className="mx-1 text-slate-700">|</span> LN {h.line}</span>
                            </div>
                            <div className={`text-[11px] font-mono break-all ${h.step === stepIndex + 1 ? 'text-amber-400 font-black' : 'text-slate-400 opacity-60'}`}>
                              {renderValue(h.value)}
                            </div>
                          </div>
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
