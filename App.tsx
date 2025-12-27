
import React, { useState, useCallback, useEffect } from 'react';
import { ScriptMode, CodeOutput, SanskritamError } from './types';
import { KEYWORDS, SAMPLE_CODES, SNIPPETS, Snippet } from './constants';
import Editor from './components/Editor';
import Visualizer from './components/Visualizer';
import { processSanskritamCode } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'PLAYGROUND'>('HOME');
  const [scriptMode, setScriptMode] = useState<ScriptMode>(ScriptMode.ROMAN);
  const [code, setCode] = useState<string>(SAMPLE_CODES.ROMAN);
  const [output, setOutput] = useState<CodeOutput | null>(null);
  const [errors, setErrors] = useState<SanskritamError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinting, setIsLinting] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);

  const toggleScript = () => {
    const newMode = scriptMode === ScriptMode.ROMAN ? ScriptMode.DEVANAGARI : ScriptMode.ROMAN;
    setScriptMode(newMode);
    setCode(newMode === ScriptMode.DEVANAGARI ? SAMPLE_CODES.DEVANAGARI : SAMPLE_CODES.ROMAN);
    setOutput(null);
    setErrors([]);
  };

  const loadSnippet = (snippet: Snippet) => {
    setCode(scriptMode === ScriptMode.ROMAN ? snippet.code.ROMAN : snippet.code.DEVANAGARI);
    setOutput(null);
    setEngineError(null);
    setErrors([]);
  };

  // Real-time linting effect
  useEffect(() => {
    if (activeTab !== 'PLAYGROUND') return;

    const timer = setTimeout(async () => {
      if (!code.trim()) {
        setErrors([]);
        return;
      }

      setIsLinting(true);
      try {
        const result = await processSanskritamCode(code, scriptMode, true);
        setErrors(result.errors || []);
      } catch (err) {
        console.warn("Linting failed", err);
      } finally {
        setIsLinting(false);
      }
    }, 1000); // 1s debounce to prevent API spam

    return () => clearTimeout(timer);
  }, [code, scriptMode, activeTab]);

  const runCode = async () => {
    setIsLoading(true);
    setEngineError(null);
    try {
      const result = await processSanskritamCode(code, scriptMode);
      setOutput(result);
      setErrors(result.errors || []);
    } catch (err: any) {
      setEngineError(err.message || 'Execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-xl z-50">
        <div className="flex items-center space-x-3">
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
          <a href="#" className="hover:text-amber-400 transition-colors">Documentation</a>
          <button className="px-5 py-2 bg-amber-500 text-slate-950 rounded-full font-bold hover:bg-amber-400 transition-all transform active:scale-95">
            Download Core v1.0
          </button>
        </div>
      </nav>

      {activeTab === 'HOME' ? (
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
              <button className="px-8 py-4 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-bold text-lg hover:bg-slate-700 transition-all">
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
      ) : (
        <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 bg-slate-950 overflow-hidden">
          {/* Sidebar / Tools */}
          <div className="w-full md:w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Primary Script</label>
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
                <button 
                  onClick={runCode}
                  disabled={isLoading || isLinting}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-black rounded-xl transition-all shadow-xl shadow-amber-500/10 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <span>{errors.length > 0 ? 'Fix Errors' : 'Execute Code'}</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Snippets Panel */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Snippet Library</h2>
              <div className="space-y-3">
                {SNIPPETS.map((snippet, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadSnippet(snippet)}
                    className="w-full text-left p-3 rounded-xl border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors mb-1">{snippet.name}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-2">{snippet.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden shadow-xl min-h-[300px]">
              <Visualizer tokens={output?.tokens || []} />
            </div>
          </div>

          {/* Main IDE Area */}
          <div className="flex-1 flex flex-col gap-6 h-[calc(100vh-140px)]">
            <div className="flex-1 min-h-0">
              <Editor code={code} setCode={setCode} mode={scriptMode} errors={errors} />
            </div>

            {/* Console / Output */}
            <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Output Console</span>
                {output && <span className="text-[10px] text-green-500 font-mono">Process finished successfully</span>}
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
                {isLoading && <div className="text-amber-500/50 animate-pulse">Initializing Sanskritam Virtual Machine...</div>}
                {isLinting && !isLoading && <div className="text-[10px] text-slate-500 animate-pulse">Linting engine active...</div>}
                {output && errors.length === 0 && (
                  <div className="space-y-4">
                    <div className="text-amber-400 font-bold">{output.stdout || '> Output is empty'}</div>
                    <div className="pt-4 border-t border-slate-800/50">
                      <span className="text-slate-500 text-xs block mb-1 uppercase tracking-tighter">Underlying C++ Implementation:</span>
                      <pre className="text-slate-300 bg-slate-950 p-3 rounded-lg text-xs border border-slate-800">{output.transpiled}</pre>
                    </div>
                    <div className="pt-2">
                      <span className="text-slate-500 text-xs block mb-1 uppercase tracking-tighter">Engine Logic:</span>
                      <p className="text-slate-400 text-xs italic">{output.explanation}</p>
                    </div>
                  </div>
                )}
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
