
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ScriptMode, CodeOutput, SanskritamError, DebugSnapshot } from './types';
import { KEYWORDS, SAMPLE_CODES, SNIPPETS, Snippet } from './constants';
import Editor from './components/Editor';
import Visualizer from './components/Visualizer';
import ExecutionChart from './components/ExecutionChart';
import ScopeVisualizer from './components/ScopeVisualizer';
import { processSanskritamCode } from './services/geminiService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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
      
      // 1. Current Source Code
      const ext = scriptMode === ScriptMode.DEVANAGARI ? 'dev.san' : 'rom.san';
      zip.file(`project.${ext}`, code);

      // 2. Transpiled C++ if available
      if (output?.transpiled) {
        zip.file('transpiled.cpp', output.transpiled);
      }

      // 3. Runtime Library Header (Sanskritam.h)
      const runtimeHeader = `
/**
 * SANSKRITAM RUNTIME v1.0
 * This header provides the mapping for Sanskritam transpiled C++ code.
 */
#ifndef SANSKRITAM_H
#define SANSKRITAM_H

#include <iostream>
#include <string>
#include <vector>
#include <map>

namespace san {
    template<typename T>
    void vadatu(T val) {
        std::cout << val << std::endl;
    }
    
    // Semantic variable wrapper
    struct mulyam {
        // Implementation for dynamic typing in C++
    };
}

#endif
      `;
      zip.file('Sanskritam.h', runtimeHeader.trim());

      // 4. README / Documentation
      const readme = `
# Sanskritam SDK Starter Kit v1.0

## Contents
- \`project.${ext}\`: Your current source code.
- \`transpiled.cpp\`: The C++ representation of your logic.
- \`Sanskritam.h\`: The core runtime header for compilation.

## How to use
1. Install a C++ compiler (GCC/Clang).
2. Use the transpiled C++ source and link it with Sanskritam.h.
3. Enjoy high-performance semantic programming.

## Language Specification
Built on the principle of Anvaya (semantic connection).

Keywords used:
${Object.entries(KEYWORDS).map(([k, v]) => `- ${k}: ${v.roman} / ${v.devanagari} (${v.meaning})`).join('\n')}
      `;
      zip.file('README.md', readme.trim());

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'sanskritam-core-v1.0.zip');
      
      setDownloadFeedback("SDK Downloaded!");
      setTimeout(() => setDownloadFeedback(null), 3000);
    } catch (err) {
      console.error("Download failed", err);
      setDownloadFeedback("Download failed");
      setTimeout(() => setDownloadFeedback(null), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  // Real-time linting effect
  useEffect(() => {
    if (activeTab !== 'PLAYGROUND' || isDebugMode) return;

    const timer = setTimeout(async () => {
      if (!code.trim()) {
        setErrors([]);
        return;
      }

      setIsLinting(true);
      try {
        const result = await processSanskritamCode(code, scriptMode, 'lint');
        setErrors(result.errors || []);
      } catch (err) {
        console.warn("Linting failed", err);
      } finally {
        setIsLinting(false);
      }
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
    } catch (err: any) {
      setEngineError(err.message || 'Execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const startDebug = async () => {
    setIsLoading(true);
    setEngineError(null);
    setExecutionTime(null);
    setIsDebugMode(false);
    setConsoleTab('STDOUT');
    try {
      const result = await processSanskritamCode(code, scriptMode, 'debug');
      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors);
        setIsLoading(false);
        return;
      }
      setOutput(result);
      setStepIndex(0);
      setIsDebugMode(true);
    } catch (err: any) {
      setEngineError(err.message || 'Debug failed');
    } finally {
      setIsLoading(false);
    }
  };

  const stopDebug = () => {
    setIsDebugMode(false);
    setStepIndex(0);
  };

  const stepNext = () => {
    if (output?.debugTrace && stepIndex < output.debugTrace.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      stopDebug();
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
    stopDebug();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStepIndex(parseInt(e.target.value, 10));
  };

  const filteredSnippets = useMemo(() => {
    const query = snippetSearchQuery.toLowerCase();
    if (!query) return SNIPPETS;
    return SNIPPETS.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.description.toLowerCase().includes(query)
    );
  }, [snippetSearchQuery]);

  const currentSnapshot: DebugSnapshot | null = 
    isDebugMode && output?.debugTrace ? output.debugTrace[stepIndex] : null;

  const executionChartData = output?.tokens ? 
    output.tokens.slice(0, 8).map(t => ({ 
      label: t.word.length > 6 ? t.word.substring(0, 4) + '..' : t.word, 
      value: t.word.length 
    })) : [];

  const codeLines = code.split('\n');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-xl z-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('HOME')}>
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-slate-900 text-xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            सं
          </div>
          <span className="text-2xl font-extrabold tracking-tighter bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            SANSKRITAM
          </span>
        </div>
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
          <button onClick={() => setActiveTab('HOME')} className={`hover:text-amber-400 transition-colors ${activeTab === 'HOME' ? 'text-amber-400' : ''}`}>Philosophy</button>
          <button onClick={() => setActiveTab('PLAYGROUND')} className={`hover:text-amber-400 transition-colors ${activeTab === 'PLAYGROUND' ? 'text-amber-400' : ''}`}>Compiler</button>
          <button onClick={() => setActiveTab('DOCS')} className={`hover:text-amber-400 transition-colors ${activeTab === 'DOCS' ? 'text-amber-400' : ''}`}>Documentation</button>
          <button 
            onClick={handleDownloadCore}
            disabled={isDownloading}
            className="px-5 py-2 bg-amber-500 text-slate-950 rounded-full font-bold hover:bg-amber-400 transition-all transform active:scale-95 flex items-center gap-2 relative"
          >
            {isDownloading ? <div className="animate-spin w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full" /> : null}
            Download Core v1.0
            {downloadFeedback && (
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-lg animate-in slide-in-from-top-2 fade-in whitespace-nowrap">
                {downloadFeedback}
              </span>
            )}
          </button>
        </div>
      </nav>

      {activeTab === 'HOME' && (
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative px-8 py-24 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight devanagari">
              कोडिंग् इदानीं <span className="text-amber-500">सरलम्</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mb-12 font-light leading-relaxed">
              Experience the world's first programming language where <span className="text-slate-200 font-semibold">semantic meaning</span> precedes order. A C++ core wrapper designed for the next generation of AI Transformers.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={() => setActiveTab('PLAYGROUND')}
                className="px-8 py-4 bg-slate-100 text-slate-950 rounded-xl font-bold text-lg hover:bg-white transition-all shadow-xl"
              >
                Try the Playground
              </button>
              <button onClick={() => setActiveTab('DOCS')} className="px-8 py-4 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-bold text-lg hover:bg-slate-700 transition-all">
                Read Whitepaper
              </button>
            </div>

            {/* Features */}
            <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
              <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-amber-500/50 transition-all group">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 className="text-xl font-bold mb-4">Semantic Tokenization</h3>
                <p className="text-slate-400 leading-relaxed">By leveraging Sanskrit's case-based logic, Sanskritam allows tokens to be processed in any order, perfect for LLM efficiency.</p>
              </div>
              <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-amber-500/50 transition-all group">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>
                </div>
                <h3 className="text-xl font-bold mb-4">Dual-Script Native</h3>
                <p className="text-slate-400 leading-relaxed">Full UTF-8 support for Devanagari script alongside Roman transliteration. Switch instantly without logical breakage.</p>
              </div>
              <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-amber-500/50 transition-all group">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <h3 className="text-xl font-bold mb-4">C++ Optimized Core</h3>
                <p className="text-slate-400 leading-relaxed">Write like Python, execute like C++. The language transpiles to high-performance C++ code at compile time.</p>
              </div>
            </div>
          </section>
        </main>
      )}

      {activeTab === 'DOCS' && (
        <main className="flex-1 overflow-y-auto px-8 py-16 bg-slate-950">
          <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="border-b border-slate-800 pb-12">
              <h1 className="text-5xl font-black mb-6 text-white tracking-tight">Language Documentation</h1>
              <p className="text-xl text-slate-400 font-light leading-relaxed">
                Welcome to the formal specification of Sanskritam (v1.0). Sanskritam is built on the principle of <span className="text-amber-400 font-semibold italic">Anvaya</span>—the semantic connection of words regardless of their sequence.
              </p>
            </header>

            <section className="space-y-8">
              <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-[2px] bg-amber-500"></span>
                Core Keywords
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(KEYWORDS).map(([key, kw]) => (
                  <div key={key} className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-slate-500">{key}</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-400 uppercase font-bold">{kw.equivalent}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xl font-bold text-slate-100">{kw.roman}</span>
                      <span className="text-xl font-bold text-amber-500 devanagari">{kw.devanagari}</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{kw.meaning}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-[2px] bg-amber-500"></span>
                Syntax & Logic
              </h2>
              <div className="space-y-6">
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
                  <h3 className="text-xl font-bold mb-4 text-white">Variable Declaration</h3>
                  <p className="text-slate-400 mb-6">Use <code className="text-amber-400 font-mono">mulyam</code> (or <code className="text-amber-400 font-mono devanagari">मूल्यम्</code>) to initialize memory pointers. Variables are dynamically typed but optimized as C++ primitives.</p>
                  <pre className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-emerald-400 font-mono text-sm leading-relaxed">
                    mulyam rajas = 100<br/>
                    मूल्यम् राजा = १००
                  </pre>
                </div>

                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
                  <h3 className="text-xl font-bold mb-4 text-white">Control Flow</h3>
                  <p className="text-slate-400 mb-6">Conditionals use the <code className="text-amber-400 font-mono">yadi-tarhi</code> (If-Then) construct. Every block must conclude with <code className="text-amber-400 font-mono">samaptam</code>.</p>
                  <pre className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-emerald-400 font-mono text-sm leading-relaxed">
                    yadi x > 10 tarhi<br/>
                    &nbsp;&nbsp;vadatu "Greater"<br/>
                    samaptam
                  </pre>
                </div>
              </div>
            </section>

            <section className="bg-amber-500 rounded-3xl p-12 text-slate-950 flex flex-col items-center text-center">
              <h2 className="text-4xl font-black mb-4">Ready to build?</h2>
              <p className="text-lg mb-8 font-medium opacity-80">The Sanskritam Playground is fully equipped with high-fidelity debugging and real-time C++ transpilation.</p>
              <button 
                onClick={() => setActiveTab('PLAYGROUND')}
                className="px-10 py-5 bg-slate-950 text-white rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-2xl"
              >
                Enter the Playground
              </button>
            </section>
          </div>
        </main>
      )}

      {activeTab === 'PLAYGROUND' && (
        <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 bg-slate-950 overflow-hidden">
          {/* Sidebar / Tools */}
          <div className="w-full md:w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Sanskritam Engine</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Script Interface</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg">
                    <button 
                      onClick={() => scriptMode !== ScriptMode.ROMAN && toggleScript()}
                      className={`py-2 rounded text-xs font-bold transition-all ${scriptMode === ScriptMode.ROMAN ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      Roman
                    </button>
                    <button 
                      onClick={() => scriptMode !== ScriptMode.DEVANAGARI && toggleScript()}
                      className={`py-2 rounded text-xs font-bold transition-all devanagari ${scriptMode === ScriptMode.DEVANAGARI ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      देवनागरी
                    </button>
                  </div>
                </div>

                {!isDebugMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={runCode}
                      disabled={isLoading || isLinting}
                      className="py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-black rounded-xl transition-all shadow-xl shadow-amber-500/10 flex items-center justify-center space-x-2"
                    >
                      {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" /> : <span>Run</span>}
                    </button>
                    <button 
                      onClick={startDebug}
                      disabled={isLoading || isLinting}
                      className="py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:bg-slate-900 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 11-5.112-.3c.297-1.28.73-2.52 1.233-3.676a1 1 0 10-1.843-.782c-.643 1.514-1.168 3.125-1.517 4.792a4.64 4.64 0 008.203 3.52c.163-.13.318-.27.466-.421l.006-.007a33.35 33.35 0 01.763-4.427c.25-1.07.56-2.146.936-3.052.177-.428.388-.838.642-1.229.255-.392.571-.776.993-1.058a1 1 0 00.128-1.548z" clipRule="evenodd" /><path d="M6.031 8.045a1.5 1.5 0 10-3.002.041 1.5 1.5 0 003.002-.041z" /></svg>
                      <span>Debug</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-500 animate-pulse flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                        DEBUGGING ACTIVE
                      </span>
                      <button onClick={stopDebug} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    
                    {/* Scrubbing Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono uppercase tracking-widest">
                        <span>Traverse Execution</span>
                        <span>{stepIndex + 1} / {output?.debugTrace?.length || 1}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={(output?.debugTrace?.length || 1) - 1} 
                        value={stepIndex} 
                        onChange={handleSliderChange}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={continueExecution} 
                        className="flex items-center justify-center gap-1.5 bg-amber-500 text-slate-950 text-xs font-black py-2 rounded-lg hover:bg-amber-400 shadow-lg shadow-amber-500/20 active:scale-95 transition-all group"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Run
                      </button>
                      <button 
                        onClick={stepNext} 
                        className="flex items-center justify-center gap-1.5 bg-slate-800 text-slate-200 text-xs font-bold py-2 rounded-lg hover:bg-slate-700 active:scale-95 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                        Step
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Watch Panel */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col min-h-[200px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Memory Scope</h2>
                {isDebugMode && (
                  <span className="text-[8px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                    PTR: 0x{((stepIndex + 1) * 1024).toString(16).toUpperCase()}
                  </span>
                )}
              </div>
              {isDebugMode && output?.debugTrace ? (
                <ScopeVisualizer 
                  debugTrace={output.debugTrace}
                  stepIndex={stepIndex}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[10px] text-slate-600 text-center italic space-y-2">
                  <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span>Attach debugger to visualize memory state</span>
                </div>
              )}
            </div>

            {/* Metrics Chart Panel */}
            <div className="h-48 shadow-xl">
              <ExecutionChart data={executionChartData} title="Instruction Weights" />
            </div>

            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden shadow-xl min-h-[300px]">
              <Visualizer tokens={output?.tokens || []} />
            </div>
          </div>

          {/* Main IDE Area */}
          <div className="flex-1 flex flex-col gap-6 h-[calc(100vh-140px)]">
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              <div className="flex-1 min-h-0">
                <Editor 
                    code={code} 
                    setCode={setCode} 
                    mode={scriptMode} 
                    errors={errors} 
                    breakpoints={breakpoints}
                    toggleBreakpoint={toggleBreakpoint}
                    currentDebugLine={currentSnapshot?.line}
                />
              </div>

              {/* Interactive Examples Bar */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Interactive Examples</h3>
                        <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
                        <span className="text-[10px] text-slate-600 hidden sm:block">Select to load into editor</span>
                    </div>
                    
                    {/* Snippet Search Bar */}
                    <div className="relative group max-w-xs w-full">
                        <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input 
                            type="text" 
                            placeholder="Search examples..." 
                            value={snippetSearchQuery}
                            onChange={(e) => setSnippetSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        />
                        {snippetSearchQuery && (
                          <button 
                            onClick={() => setSnippetSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar min-h-[90px]">
                    {filteredSnippets.length > 0 ? (
                        filteredSnippets.map((snippet, idx) => (
                            <button
                                key={idx}
                                onClick={() => loadSnippet(snippet)}
                                className="flex-shrink-0 w-48 p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800 transition-all text-left group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-6 h-6 bg-amber-500/10 rounded flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                                    </div>
                                    <span className="text-[8px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">{scriptMode}</span>
                                </div>
                                <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors mb-1 truncate">{snippet.name}</div>
                                <div className="text-[10px] text-slate-500 line-clamp-1">{snippet.description}</div>
                            </button>
                        ))
                    ) : (
                        <div className="flex-1 flex items-center justify-center py-6 text-[10px] text-slate-600 italic border border-dashed border-slate-800 rounded-xl">
                            No examples matching "{snippetSearchQuery}"
                        </div>
                    )}
                </div>
              </div>
            </div>

            {/* Console / Output */}
            <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                    <button 
                        onClick={() => setConsoleTab('STDOUT')}
                        className={`text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest transition-all ${consoleTab === 'STDOUT' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Output
                    </button>
                    <button 
                        onClick={() => setConsoleTab('CPP')}
                        disabled={!output}
                        className={`text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest transition-all ${!output ? 'opacity-30 cursor-not-allowed' : ''} ${consoleTab === 'CPP' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        C++ Source
                    </button>
                    <button 
                        onClick={() => setConsoleTab('LOGIC')}
                        disabled={!output}
                        className={`text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest transition-all ${!output ? 'opacity-30 cursor-not-allowed' : ''} ${consoleTab === 'LOGIC' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Engine Logic
                    </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 mr-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Verbose Log</span>
                    <button 
                      onClick={() => setVerboseMode(!verboseMode)}
                      className={`w-7 h-3.5 rounded-full transition-colors relative ${verboseMode ? 'bg-amber-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${verboseMode ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {output && !isDebugMode && <span className="text-[10px] text-green-500 font-mono hidden sm:inline">Execution Success</span>}
                  {isDebugMode && <span className="text-[10px] text-amber-500 font-mono animate-pulse hidden sm:inline">Debug Active</span>}
                </div>
              </div>
              
              <div className="flex-1 p-4 font-mono text-sm overflow-y-auto whitespace-pre-wrap">
                {engineError && <div className="text-red-400">System Error: {engineError}</div>}
                
                {errors.length > 0 && !isLoading && (
                  <div className="space-y-2 mb-4">
                    <div className="text-red-400 font-bold underline">Syntax Validation Failed:</div>
                    {errors.map((err, idx) => (
                      <div key={idx} className="text-red-400/80 text-xs">
                        • Line {err.line}, Col {err.column}: {err.message}
                      </div>
                    ))}
                  </div>
                )}
                
                {!output && !isLoading && !engineError && errors.length === 0 && <div className="text-slate-600 italic">Ready to process...</div>}
                {isLoading && <div className="text-amber-500/50 animate-pulse">Connecting to Sanskritam Virtual Machine...</div>}
                
                {/* Tab Content: STDOUT */}
                {consoleTab === 'STDOUT' && (
                    <div className="flex flex-col gap-2">
                        {/* Summary for standard run */}
                        {output && !isDebugMode && errors.length === 0 && !verboseMode && (
                            <div className="text-amber-400 font-bold">{output.stdout || '> Execution finished (no output)'}</div>
                        )}
                        
                        {/* Verbose/Debug execution log */}
                        {(isDebugMode || (output && verboseMode)) && output?.debugTrace && (
                            <div className="space-y-1">
                                {output.debugTrace.map((snap, i) => {
                                  const lineContent = codeLines[snap.line - 1] || '';
                                  const isCurrentDebug = isDebugMode && i === stepIndex;
                                  if (isDebugMode && i > stepIndex) return null;
                                  
                                  return (
                                    <div key={i} className={`flex flex-col border-l-2 pl-3 py-1 ${isCurrentDebug ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800'}`}>
                                      <div className="flex items-center gap-2 text-[10px] opacity-60">
                                        <span className="text-amber-500 font-bold">L{snap.line}</span>
                                        <span className="text-slate-400 font-mono italic truncate">{lineContent}</span>
                                      </div>
                                      {/* Only show stdout changes at this specific step */}
                                      {i === 0 ? (
                                          snap.stdout && <div className="text-amber-400 font-bold ml-2 mt-1">{snap.stdout}</div>
                                      ) : (
                                          snap.stdout && snap.stdout !== output.debugTrace[i-1].stdout && (
                                              <div className="text-amber-400 font-bold ml-2 mt-1">
                                                  {snap.stdout.replace(output.debugTrace[i-1].stdout, '')}
                                              </div>
                                          )
                                      )}
                                    </div>
                                  );
                                })}
                                {isDebugMode && <div className="text-amber-500 animate-pulse text-xs font-bold mt-2">_</div>}
                            </div>
                        )}

                        {/* Performance Footer for Run Mode */}
                        {output && !isDebugMode && executionTime !== null && (
                          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800">
                              <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                              Execution Time: <span className="text-amber-400">{executionTime.toFixed(2)}ms</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800">
                              <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                              Engine Power: <span className="text-emerald-400">Gemini-3-Pro-Turbo</span>
                            </div>
                          </div>
                        )}
                    </div>
                )}

                {/* Tab Content: C++ Source */}
                {consoleTab === 'CPP' && output && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-2">
                             <span className="text-slate-500 text-[10px] uppercase tracking-tighter">Transpiled High-Performance C++ Core:</span>
                             <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">OPTIMIZED</span>
                        </div>
                        <pre className="text-slate-300 bg-slate-950/50 p-4 rounded-xl text-xs border border-slate-800 shadow-inner leading-relaxed">
                            {output.transpiled}
                        </pre>
                    </div>
                )}

                {/* Tab Content: Engine Logic */}
                {consoleTab === 'LOGIC' && output && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-slate-500 text-[10px] block mb-2 uppercase tracking-tighter">Virtual Machine Trace & Logic:</span>
                        <div className="text-slate-300 bg-slate-800/30 p-4 rounded-xl border border-slate-800 text-sm leading-relaxed italic">
                            {output.explanation}
                        </div>
                    </div>
                )}

                {isLinting && !isLoading && !isDebugMode && <div className="text-[10px] text-slate-500 absolute bottom-2 right-4 animate-pulse uppercase tracking-widest font-bold">Engine Linting...</div>}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-slate-900 text-slate-600 text-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>© 2024 Sanskritam Language Foundation. Built with AI-optimized Semantic Cores.</div>
        <div className="flex space-x-6">
          <a href="#" className="hover:text-slate-400 transition-colors">GitHub</a>
          <a href="#" className="hover:text-slate-400 transition-colors">Twitter</a>
          <a href="#" className="hover:text-slate-400 transition-colors">Discord</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
