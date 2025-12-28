
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ScriptMode, CodeOutput, SanskritamError, DebugSnapshot } from './types';
import { KEYWORDS, SAMPLE_CODES, SNIPPETS, Snippet } from './constants';
import Editor from './components/Editor';
import Visualizer from './components/Visualizer';
import ExecutionChart from './components/ExecutionChart';
import ScopeVisualizer from './components/ScopeVisualizer';
import { processSanskritamCode } from './services/geminiService';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'PLAYGROUND' | 'DOCS'>('HOME');
  const [scriptMode, setScriptMode] = useState<ScriptMode>(ScriptMode.ROMAN);
  const [code, setCode] = useState<string>(SAMPLE_CODES.ROMAN);
  const [output, setOutput] = useState<CodeOutput | null>(null);
  const [errors, setErrors] = useState<SanskritamError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLinting, setIsLinting] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [verboseMode, setVerboseMode] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  // Console specific state
  const [consoleTab, setConsoleTab] = useState<'STDOUT' | 'CPP' | 'LOGIC'>('STDOUT');

  // Snippet search state
  const [snippetSearchQuery, setSnippetSearchQuery] = useState('');

  // Debugger states
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(800);
  const playTimerRef = useRef<number | null>(null);

  const toggleScript = () => {
    const newMode = scriptMode === ScriptMode.ROMAN ? ScriptMode.DEVANAGARI : ScriptMode.ROMAN;
    setScriptMode(newMode);
    setCode(newMode === ScriptMode.DEVANAGARI ? SAMPLE_CODES.DEVANAGARI : SAMPLE_CODES.ROMAN);
    setOutput(null);
    setErrors([]);
    setBreakpoints(new Set());
    setExecutionTime(null);
    stopDebug();
  };

  const loadSnippet = (snippet: Snippet) => {
    setCode(scriptMode === ScriptMode.ROMAN ? snippet.code.ROMAN : snippet.code.DEVANAGARI);
    setOutput(null);
    setEngineError(null);
    setErrors([]);
    setBreakpoints(new Set());
    setExecutionTime(null);
    stopDebug();
    setActiveTab('PLAYGROUND');
  };

  const toggleBreakpoint = (line: number) => {
    setBreakpoints(prev => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const handleDownloadCore = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const ext = scriptMode === ScriptMode.DEVANAGARI ? 'dev.san' : 'rom.san';
      zip.file(`project.${ext}`, code);
      if (output?.transpiled) zip.file('transpiled.cpp', output.transpiled);
      const runtimeHeader = `
#ifndef SANSKRITAM_H
#define SANSKRITAM_H
#include <iostream>
namespace san { template<typename T> void vadatu(T val) { std::cout << val << std::endl; } }
#endif`;
      zip.file('Sanskritam.h', runtimeHeader.trim());
      const readme = `# Sanskritam SDK Starter Kit v1.0\n\nKeywords:\n${Object.entries(KEYWORDS).map(([k, v]) => `- ${k}: ${v.roman} / ${v.devanagari}`).join('\n')}`;
      zip.file('README.md', readme.trim());
      const content = await zip.generateAsync({ type: 'blob' });
      FileSaver.saveAs(content, 'sanskritam-core-v1.0.zip');
      setDownloadFeedback("SDK Downloaded!");
      setTimeout(() => setDownloadFeedback(null), 3000);
    } catch (err) {
      setDownloadFeedback("Download failed");
      setTimeout(() => setDownloadFeedback(null), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'PLAYGROUND' || isDebugMode) return;
    const timer = setTimeout(async () => {
      if (!code.trim()) { setErrors([]); return; }
      setIsLinting(true);
      try {
        const result = await processSanskritamCode(code, scriptMode, 'lint');
        setErrors(result.errors || []);
      } catch (err) { console.warn("Linting failed", err); } finally { setIsLinting(false); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [code, scriptMode, activeTab, isDebugMode]);

  const runCode = async () => {
    setIsLoading(true);
    setEngineError(null);
    setExecutionTime(null);
    stopDebug();
    setConsoleTab('STDOUT');
    const startTime = performance.now();
    try {
      const result = await processSanskritamCode(code, scriptMode, 'debug');
      const endTime = performance.now();
      setExecutionTime(endTime - startTime);
      setOutput(result);
      setErrors(result.errors || []);
    } catch (err: any) { setEngineError(err.message || 'Execution failed'); } finally { setIsLoading(false); }
  };

  const startDebug = async () => {
    setIsLoading(true);
    setEngineError(null);
    setExecutionTime(null);
    setIsDebugMode(false);
    setConsoleTab('STDOUT');
    try {
      const result = await processSanskritamCode(code, scriptMode, 'debug');
      if (result.errors && result.errors.length > 0) { setErrors(result.errors); setIsLoading(false); return; }
      setOutput(result);
      setStepIndex(0);
      setIsDebugMode(true);
    } catch (err: any) { setEngineError(err.message || 'Debug failed'); } finally { setIsLoading(false); }
  };

  const stopDebug = () => {
    setIsDebugMode(false);
    setStepIndex(0);
    setIsPlaying(false);
    if (playTimerRef.current) clearInterval(playTimerRef.current);
  };

  const stepNext = () => {
    if (output?.debugTrace && stepIndex < output.debugTrace.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      stopDebug();
    }
  };

  const stepBack = () => {
    if (stepIndex > 0) setStepIndex(prev => prev - 1);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playTimerRef.current = window.setInterval(() => {
        setStepIndex(prev => {
          if (output?.debugTrace && prev < output.debugTrace.length - 1) {
            const nextIdx = prev + 1;
            if (breakpoints.has(output.debugTrace[nextIdx].line)) {
              if (playTimerRef.current) clearInterval(playTimerRef.current);
              setIsPlaying(false);
              return nextIdx;
            }
            return nextIdx;
          } else {
            if (playTimerRef.current) clearInterval(playTimerRef.current);
            setIsPlaying(false);
            return prev;
          }
        });
      }, playSpeed);
    }
  };

  const continueExecution = () => {
    if (!output?.debugTrace) return;
    let nextIdx = stepIndex + 1;
    while (nextIdx < output.debugTrace.length) {
      if (breakpoints.has(output.debugTrace[nextIdx].line)) {
        setStepIndex(nextIdx);
        return;
      }
      nextIdx++;
    }
    setStepIndex(output.debugTrace.length - 1);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStepIndex(parseInt(e.target.value, 10));
  };

  const filteredSnippets = useMemo(() => {
    const query = snippetSearchQuery.toLowerCase();
    if (!query) return SNIPPETS;
    return SNIPPETS.filter(s => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query));
  }, [snippetSearchQuery]);

  const currentSnapshot: DebugSnapshot | null = isDebugMode && output?.debugTrace ? output.debugTrace[stepIndex] : null;

  const executionChartData = output?.tokens ? output.tokens.slice(0, 8).map(t => ({ 
    label: t.word.length > 6 ? t.word.substring(0, 4) + '..' : t.word, value: t.word.length 
  })) : [];

  const codeLines = code.split('\n');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-xl z-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('HOME')}>
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-slate-900 text-xl shadow-[0_0_20px_rgba(245,158,11,0.3)]"> सं </div>
          <span className="text-2xl font-extrabold tracking-tighter bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent"> SANSKRITAM </span>
        </div>
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
          <button onClick={() => setActiveTab('HOME')} className={`hover:text-amber-400 transition-colors ${activeTab === 'HOME' ? 'text-amber-400' : ''}`}>Philosophy</button>
          <button onClick={() => setActiveTab('PLAYGROUND')} className={`hover:text-amber-400 transition-colors ${activeTab === 'PLAYGROUND' ? 'text-amber-400' : ''}`}>Compiler</button>
          <button onClick={() => setActiveTab('DOCS')} className={`hover:text-amber-400 transition-colors ${activeTab === 'DOCS' ? 'text-amber-400' : ''}`}>Documentation</button>
          <button onClick={handleDownloadCore} disabled={isDownloading} className="px-5 py-2 bg-amber-500 text-slate-950 rounded-full font-bold hover:bg-amber-400 transition-all transform active:scale-95 flex items-center gap-2 relative">
            {isDownloading && <div className="animate-spin w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full" />}
            Download SDK v1.0
            {downloadFeedback && <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-lg animate-in slide-in-from-top-2 fade-in whitespace-nowrap">{downloadFeedback}</span>}
          </button>
        </div>
      </nav>

      {activeTab === 'HOME' && (
        <main className="flex-1">
          <section className="relative px-8 py-24 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight devanagari"> कोडिंग् इदानीं <span className="text-amber-500">सरलम्</span> </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mb-12 font-light leading-relaxed"> Experience the world's first programming language where <span className="text-slate-200 font-semibold">semantic meaning</span> precedes order. A C++ core wrapper designed for AI Transformers. </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button onClick={() => setActiveTab('PLAYGROUND')} className="px-8 py-4 bg-slate-100 text-slate-950 rounded-xl font-bold text-lg hover:bg-white transition-all shadow-xl">Try the Playground</button>
              <button onClick={() => setActiveTab('DOCS')} className="px-8 py-4 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-bold text-lg hover:bg-slate-700 transition-all">Read Whitepaper</button>
            </div>
          </section>
        </main>
      )}

      {activeTab === 'DOCS' && (
        <main className="flex-1 overflow-y-auto px-8 py-16 bg-slate-950">
          <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="border-b border-slate-800 pb-12">
              <h1 className="text-5xl font-black mb-6 text-white tracking-tight">Language Documentation</h1>
              <p className="text-xl text-slate-400 font-light leading-relaxed"> Welcome to the formal specification of Sanskritam (v1.0). Built on the principle of Anvaya—semantic connection. </p>
            </header>
            <section className="space-y-8">
              <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3"><span className="w-8 h-[2px] bg-amber-500"></span>Core Keywords</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(KEYWORDS).map(([key, kw]) => (
                  <div key={key} className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2"><span className="text-xs font-mono text-slate-500">{key}</span><span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-400 uppercase font-bold">{kw.equivalent}</span></div>
                    <div className="flex items-center gap-3 mb-4"><span className="text-xl font-bold text-slate-100">{kw.roman}</span><span className="text-xl font-bold text-amber-400 devanagari">{kw.devanagari}</span></div>
                    <p className="text-sm text-slate-400 leading-relaxed">{kw.meaning}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      )}

      {activeTab === 'PLAYGROUND' && (
        <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 bg-slate-950 overflow-hidden">
          <div className="w-full md:w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Sanskritam Engine</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Script Interface</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg">
                    <button onClick={() => scriptMode !== ScriptMode.ROMAN && toggleScript()} className={`py-2 rounded text-xs font-bold transition-all ${scriptMode === ScriptMode.ROMAN ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Roman</button>
                    <button onClick={() => scriptMode !== ScriptMode.DEVANAGARI && toggleScript()} className={`py-2 rounded text-xs font-bold transition-all devanagari ${scriptMode === ScriptMode.DEVANAGARI ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>देवनागरी</button>
                  </div>
                </div>

                {!isDebugMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={runCode} disabled={isLoading || isLinting} className="py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-black rounded-xl transition-all shadow-xl shadow-amber-500/10 flex items-center justify-center space-x-2">
                      {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" /> : <span>Run</span>}
                    </button>
                    <button onClick={startDebug} disabled={isLoading || isLinting} className="py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:bg-slate-900 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 11-5.112-.3c.297-1.28.73-2.52 1.233-3.676a1 1 0 10-1.843-.782c-.643 1.514-1.168 3.125-1.517 4.792a4.64 4.64 0 008.203 3.52c.163-.13.318-.27.466-.421l.006-.007a33.35 33.35 0 01.763-4.427c.25-1.07.56-2.146.936-3.052.177-.428.388-.838.642-1.229.255-.392.571-.776.993-1.058a1 1 0 00.128-1.548z" clipRule="evenodd" /><path d="M6.031 8.045a1.5 1.5 0 10-3.002.041 1.5 1.5 0 003.002-.041z" /></svg>
                      <span>Debug</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-500 animate-pulse flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-amber-500"></span> DEBUGGING ACTIVE
                      </span>
                      <button onClick={stopDebug} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono uppercase tracking-widest">
                        <span>Timeline Traverse</span>
                        <span>{stepIndex + 1} / {output?.debugTrace?.length || 1}</span>
                      </div>
                      <input type="range" min="0" max={(output?.debugTrace?.length || 1) - 1} value={stepIndex} onChange={handleSliderChange} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button onClick={stepBack} disabled={stepIndex === 0} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center disabled:opacity-20 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg></button>
                      <button onClick={togglePlay} className={`p-2 rounded-lg flex items-center justify-center transition-all ${isPlaying ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-500 hover:bg-slate-700'}`}>
                        {isPlaying ? <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                      </button>
                      <button onClick={stepNext} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg></button>
                      <button onClick={continueExecution} className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg flex items-center justify-center transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg></button>
                    </div>
                    {isPlaying && (
                      <div className="pt-2">
                        <div className="flex justify-between text-[7px] text-slate-500 uppercase font-bold mb-1"><span>Speed Control</span><span>{playSpeed}ms</span></div>
                        <input type="range" min="100" max="2000" step="100" value={playSpeed} onChange={(e) => setPlaySpeed(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col min-h-[200px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Memory Scope</h2>
                {isDebugMode && <span className="text-[8px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 font-mono">STEP {stepIndex + 1}</span>}
              </div>
              {isDebugMode && output?.debugTrace ? (
                <ScopeVisualizer debugTrace={output.debugTrace} stepIndex={stepIndex} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[10px] text-slate-600 text-center italic space-y-2">
                  <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span>Enter debug mode to watch memory</span>
                </div>
              )}
            </div>

            <div className="h-48 shadow-xl"><ExecutionChart data={executionChartData} title="Semantic Frequency" /></div>
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden shadow-xl min-h-[300px]"><Visualizer tokens={output?.tokens || []} /></div>
          </div>

          <div className="flex-1 flex flex-col gap-6 h-[calc(100vh-140px)]">
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              <div className="flex-1 min-h-0">
                <Editor code={code} setCode={setCode} mode={scriptMode} errors={errors} breakpoints={breakpoints} toggleBreakpoint={toggleBreakpoint} currentDebugLine={currentSnapshot?.line} />
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Library Snippets</h3>
                        <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
                    </div>
                    <div className="relative group max-w-xs w-full">
                        <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" placeholder="Search snippets..." value={snippetSearchQuery} onChange={(e) => setSnippetSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                    </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar min-h-[90px]">
                    {filteredSnippets.length > 0 ? filteredSnippets.map((snippet, idx) => (
                        <button key={idx} onClick={() => loadSnippet(snippet)} className="flex-shrink-0 w-48 p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800 transition-all text-left group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-6 h-6 bg-amber-500/10 rounded flex items-center justify-center group-hover:bg-amber-500/20 transition-colors"><svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg></div>
                                <span className="text-[8px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">{scriptMode}</span>
                            </div>
                            <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors mb-1 truncate">{snippet.name}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{snippet.description}</div>
                        </button>
                    )) : <div className="flex-1 flex items-center justify-center py-6 text-[10px] text-slate-600 italic border border-dashed border-slate-800 rounded-xl">No matches found</div>}
                </div>
              </div>
            </div>

            <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                    <button onClick={() => setConsoleTab('STDOUT')} className={`text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest transition-all ${consoleTab === 'STDOUT' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Stdout</button>
                    <button onClick={() => setConsoleTab('CPP')} disabled={!output} className={`text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest transition-all ${!output ? 'opacity-30 cursor-not-allowed' : ''} ${consoleTab === 'CPP' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>C++</button>
                    <button onClick={() => setConsoleTab('LOGIC')} disabled={!output} className={`text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest transition-all ${!output ? 'opacity-30 cursor-not-allowed' : ''} ${consoleTab === 'LOGIC' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Logic</button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 mr-2"><span className="text-[9px] font-bold text-slate-500 uppercase">Verbose</span><button onClick={() => setVerboseMode(!verboseMode)} className={`w-7 h-3.5 rounded-full transition-colors relative ${verboseMode ? 'bg-amber-500' : 'bg-slate-700'}`}><div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${verboseMode ? 'left-4' : 'left-0.5'}`} /></button></div>
                  {output && !isDebugMode && <span className="text-[10px] text-green-500 font-mono hidden sm:inline">Execution Success</span>}
                  {isDebugMode && <span className="text-[10px] text-amber-500 font-mono animate-pulse hidden sm:inline">Debug Tracking</span>}
                </div>
              </div>
              <div className="flex-1 p-4 font-mono text-sm overflow-y-auto whitespace-pre-wrap">
                {engineError && <div className="text-red-400">System Error: {engineError}</div>}
                {errors.length > 0 && !isLoading && (
                  <div className="space-y-2 mb-4"><div className="text-red-400 font-bold underline">Compilation Errors:</div>{errors.map((err, idx) => (<div key={idx} className="text-red-400/80 text-xs">• L{err.line}, C{err.column}: {err.message}</div>))}</div>
                )}
                {!output && !isLoading && !engineError && errors.length === 0 && <div className="text-slate-600 italic">Ready for instruction...</div>}
                {isLoading && <div className="text-amber-500/50 animate-pulse">Consulting Sanskritam VM Engine...</div>}
                {consoleTab === 'STDOUT' && (
                    <div className="flex flex-col gap-2">
                        {output && !isDebugMode && errors.length === 0 && !verboseMode && (<div className="text-amber-400 font-bold">{output.stdout || '> Output null'}</div>)}
                        {(isDebugMode || (output && verboseMode)) && output?.debugTrace && (
                            <div className="space-y-1">{output.debugTrace.slice(0, stepIndex + 1).map((snap, i) => (
                                <div key={i} className={`flex flex-col border-l-2 pl-3 py-1 ${i === stepIndex && isDebugMode ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800 opacity-60'}`}>
                                  <div className="flex items-center gap-2 text-[10px]"><span className="text-amber-500 font-bold">L{snap.line}</span><span className="text-slate-400 font-mono italic truncate">{codeLines[snap.line-1]}</span></div>
                                  {i === 0 ? snap.stdout && <div className="text-amber-400 font-bold ml-2 mt-1">{snap.stdout}</div> : snap.stdout !== output.debugTrace[i-1].stdout && <div className="text-amber-400 font-bold ml-2 mt-1">{snap.stdout.replace(output.debugTrace[i-1].stdout, '')}</div>}
                                </div>
                            ))}</div>
                        )}
                        {output && !isDebugMode && executionTime !== null && (
                          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest"><div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800"><svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Time: <span className="text-amber-400">{executionTime.toFixed(2)}ms</span></div></div>
                        )}
                    </div>
                )}
                {consoleTab === 'CPP' && output && <pre className="text-slate-300 bg-slate-950/50 p-4 rounded-xl text-xs border border-slate-800 leading-relaxed">{output.transpiled}</pre>}
                {consoleTab === 'LOGIC' && output && <div className="text-slate-300 bg-slate-800/30 p-4 rounded-xl border border-slate-800 text-sm italic">{output.explanation}</div>}
                {isLinting && !isLoading && !isDebugMode && <div className="text-[10px] text-slate-500 absolute bottom-2 right-4 animate-pulse">Syntax Review in Progress...</div>}
              </div>
            </div>
          </div>
        </main>
      )}

      <footer className="px-8 py-8 border-t border-slate-900 text-slate-600 text-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>© 2024 Sanskritam Language Core. Dual-Script Native Architecture.</div>
        <div className="flex space-x-6"><a href="#" className="hover:text-slate-400">Github</a><a href="#" className="hover:text-slate-400">Twitter</a></div>
      </footer>
    </div>
  );
};

export default App;
