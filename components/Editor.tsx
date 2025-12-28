
import React, { useRef, useEffect, useState } from 'react';
import { ScriptMode, SanskritamError } from '../types';
import { KEYWORDS } from '../constants';

interface EditorProps {
  code: string;
  setCode: (code: string) => void;
  mode: ScriptMode;
  errors: SanskritamError[];
  breakpoints: Set<number>;
  toggleBreakpoint: (line: number) => void;
  currentDebugLine?: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface HoverDoc {
  name: string;
  roman: string;
  devanagari: string;
  meaning: string;
  equivalent: string;
  x: number;
  y: number;
}

const Editor: React.FC<EditorProps> = ({ 
  code, 
  setCode, 
  mode, 
  errors, 
  breakpoints, 
  toggleBreakpoint,
  currentDebugLine 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<SanskritamError | null>(null);
  const [hoveredDoc, setHoveredDoc] = useState<HoverDoc | null>(null);

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current && gutterRef.current) {
      const top = textareaRef.current.scrollTop;
      const left = textareaRef.current.scrollLeft;
      highlightRef.current.scrollTop = top;
      highlightRef.current.scrollLeft = left;
      gutterRef.current.scrollTop = top;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const getCharIndexFromPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!textareaRef.current) return -1;
    const el = textareaRef.current;
    const rect = el.getBoundingClientRect();
    
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left - 16; 
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top - 24 + el.scrollTop;
    
    const lineHeight = 28; 
    const charWidth = 10.8; 
    
    const lineNum = Math.floor(y / lineHeight);
    const colNum = Math.floor(x / charWidth);
    
    const lines = code.split('\n');
    if (lineNum < 0 || lineNum >= lines.length) return -1;
    
    let index = 0;
    for (let i = 0; i < lineNum; i++) {
      index += lines[i].length + 1;
    }
    
    const targetIndex = index + Math.max(0, Math.min(colNum, lines[lineNum].length));
    return targetIndex;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!textareaRef.current) return;
    
    const charIdx = getCharIndexFromPos(e);
    if (charIdx === -1) {
      setHoveredDoc(null);
      return;
    }

    const leftPart = code.slice(0, charIdx).split(/[\s()\[\]{}+=*/<>!,;.]+/).pop() || "";
    const rightPart = code.slice(charIdx).split(/[\s()\[\]{}+=*/<>!,;.]+/)[0] || "";
    const word = (leftPart + rightPart).trim();

    if (!word) {
      setHoveredDoc(null);
      return;
    }

    const keywordEntry = Object.entries(KEYWORDS).find(([key, val]) => 
      val.roman === word || val.devanagari === word
    );

    if (keywordEntry) {
      const [name, info] = keywordEntry;
      setHoveredDoc({
        name,
        ...info,
        x: e.clientX,
        y: e.clientY
      });
    } else {
      setHoveredDoc(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    closeContextMenu();
    
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const lines = code.substring(0, pos).split('\n');
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length + 1;

    const errorAtClick = errors.find(err => {
      if (err.line !== lineNum) return false;
      if (!err.word) return err.column === colNum;
      
      const lineText = code.split('\n')[lineNum - 1];
      const wordIdx = lineText.indexOf(err.word);
      if (wordIdx === -1) return err.column === colNum;
      
      const wordStartCol = wordIdx + 1;
      const wordEndCol = wordStartCol + err.word.length;
      return colNum >= wordStartCol && colNum <= wordEndCol;
    });

    if (errorAtClick) {
      setActiveError(errorAtClick);
    } else {
      setActiveError(null);
    }
  };

  useEffect(() => {
    const handleGlobalClick = () => closeContextMenu();
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const highlightCode = (input: string) => {
    const lines = input.split('\n');
    
    const highlightedLines = lines.map((lineText, lineIdx) => {
      const isCurrentLine = currentDebugLine === lineIdx + 1;
      let html = lineText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      if (html.trim().startsWith('//')) {
        html = `<span class="text-slate-500 italic">${html}</span>`;
      } else {
        html = html.replace(/"(.*?)"/g, '<span class="text-emerald-400">"$1"</span>');
        html = html.replace(/\b(\d+)\b/g, '<span class="text-blue-400">$1</span>');

        Object.values(KEYWORDS).forEach((kw) => {
          const isDevanagari = mode === ScriptMode.DEVANAGARI;
          const target = isDevanagari ? kw.devanagari : kw.roman;
          
          const keywordClass = isDevanagari 
            ? "text-amber-300 font-black drop-shadow-[0_0_2px_rgba(251,191,36,0.9)]" 
            : "text-amber-400 font-bold";

          const regex = isDevanagari 
            ? new RegExp(`${target}`, 'g')
            : new RegExp(`\\b${target}\\b`, 'g');
          
          html = html.replace(regex, `<span class="${keywordClass}">${target}</span>`);
        });

        html = html.replace(/([=+\-*/<>!|&])/g, '<span class="text-pink-400">$1</span>');
      }

      const lineErrors = errors.filter(e => e.line === lineIdx + 1);
      lineErrors.forEach(err => {
        if (err.word) {
          const escapedWord = err.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const errRegex = new RegExp(`(${escapedWord})`, 'g');
          html = html.replace(errRegex, `<span class="border-b-2 border-red-500 bg-red-500/10 cursor-help" title="Click to inspect error">$1</span>`);
        }
      });

      const lineContent = html === "" ? "&nbsp;" : html;
      return `<div class="w-full ${isCurrentLine ? 'bg-amber-500/20' : ''}">${lineContent}</div>`;
    });

    return highlightedLines.join('');
  };

  const showFeedback = (msg: string) => {
    setCopiedStatus(msg);
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  const convertToDevanagari = (text: string) => {
    let converted = text;
    // Replace keywords
    Object.values(KEYWORDS).forEach(kw => {
      const regex = new RegExp(`\\b${kw.roman}\\b`, 'g');
      converted = converted.replace(regex, kw.devanagari);
    });
    // Replace numbers
    const numMap: Record<string, string> = {
      '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
      '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
    };
    converted = converted.replace(/[0-9]/g, (m) => numMap[m]);
    return converted;
  };

  const handleAction = async (action: 'copy' | 'cut' | 'paste' | 'comment' | 'copy-devanagari' | 'auto-format' | 'convert-to-devanagari') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = code.substring(start, end);

    switch (action) {
      case 'copy':
        if (selectedText) {
          await navigator.clipboard.writeText(selectedText);
        } else {
          const lines = code.split('\n');
          const currentLineIdx = code.substring(0, start).split('\n').length - 1;
          await navigator.clipboard.writeText(lines[currentLineIdx]);
        }
        showFeedback("Copied!");
        break;
      case 'copy-devanagari':
        {
          const textToConvert = selectedText || code.split('\n')[code.substring(0, start).split('\n').length - 1];
          const converted = convertToDevanagari(textToConvert);
          await navigator.clipboard.writeText(converted);
          showFeedback("Copied as Devanagari!");
        }
        break;
      case 'convert-to-devanagari':
        {
          const converted = convertToDevanagari(code);
          setCode(converted);
          showFeedback("Script Converted!");
        }
        break;
      case 'cut':
        if (selectedText) {
          await navigator.clipboard.writeText(selectedText);
          const newCode = code.substring(0, start) + code.substring(end);
          setCode(newCode);
          showFeedback("Cut to clipboard");
        }
        break;
      case 'paste':
        try {
          const text = await navigator.clipboard.readText();
          const newCode = code.substring(0, start) + text + code.substring(end);
          setCode(newCode);
        } catch (err) {
          console.error('Failed to read clipboard', err);
        }
        break;
      case 'comment':
        {
          const lines = code.split('\n');
          const currentLineIdx = code.substring(0, start).split('\n').length - 1;
          const line = lines[currentLineIdx];
          if (line.trim().startsWith('//')) {
            lines[currentLineIdx] = line.replace('// ', '').replace('//', '');
          } else {
            lines[currentLineIdx] = '// ' + line;
          }
          setCode(lines.join('\n'));
        }
        break;
      case 'auto-format':
        {
          const lines = code.split('\n');
          let indentLevel = 0;
          const formattedLines = lines.map((line) => {
            const trimmed = line.trim();
            if (trimmed === '') return '';
            if (trimmed.includes(KEYWORDS.END.roman) || trimmed.includes(KEYWORDS.END.devanagari)) {
              indentLevel = Math.max(0, indentLevel - 1);
            }
            const result = '  '.repeat(indentLevel) + trimmed;
            if (trimmed.endsWith(KEYWORDS.THEN.roman) || trimmed.endsWith(KEYWORDS.THEN.devanagari)) {
              indentLevel++;
            }
            return result;
          });
          setCode(formattedLines.join('\n'));
          showFeedback("Code Formatted");
        }
        break;
    }
    closeContextMenu();
    textarea.focus();
  };

  useEffect(() => {
    handleScroll();
  }, [code, errors, currentDebugLine]);

  const linesCount = code.split('\n').length;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative">
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700 z-20">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex items-center space-x-2">
          {currentDebugLine && (
            <span className="flex items-center space-x-1 text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold">
              DEBUGGING LINE {currentDebugLine}
            </span>
          )}
          <span className="text-xs font-mono text-slate-400">
            playground.san {mode === ScriptMode.DEVANAGARI ? '(Devanagari)' : '(Roman)'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 flex relative overflow-hidden">
        <div ref={gutterRef} className="w-12 bg-slate-950 border-r border-slate-800 select-none overflow-hidden py-6 flex flex-col items-center z-10">
          {Array.from({ length: linesCount }).map((_, i) => {
            const lineNum = i + 1;
            const hasBreakpoint = breakpoints.has(lineNum);
            const isExecuting = currentDebugLine === lineNum;
            const hasError = errors.some(e => e.line === lineNum);

            return (
              <div key={i} onClick={() => toggleBreakpoint(lineNum)} className={`h-7 w-full flex items-center justify-center cursor-pointer transition-colors group ${isExecuting ? 'bg-amber-500/20' : 'hover:bg-slate-800'}`}>
                {hasError && !hasBreakpoint && <div className="absolute left-1 w-1 h-4 bg-red-500/50 rounded-full"></div>}
                <div className={`w-2.5 h-2.5 rounded-full transition-all ${hasBreakpoint ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-transparent group-hover:bg-red-500/20'}`}></div>
                <span className={`text-[10px] font-mono ml-1.5 w-4 text-right transition-colors ${isExecuting ? 'text-amber-400 font-bold' : hasError ? 'text-red-400' : 'text-slate-600'}`}>{lineNum}</span>
              </div>
            );
          })}
        </div>

        <div className="flex-1 relative overflow-hidden">
          <div ref={highlightRef} aria-hidden="true" className={`absolute inset-0 px-4 py-6 pointer-events-none whitespace-pre-wrap break-words code-font text-lg leading-7 overflow-hidden ${mode === ScriptMode.DEVANAGARI ? 'devanagari' : ''}`} dangerouslySetInnerHTML={{ __html: highlightCode(code) + '\n' }} />
          <textarea ref={textareaRef} value={code} onContextMenu={handleContextMenu} onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredDoc(null)} onClick={handleClick} onChange={(e) => { setCode(e.target.value); setActiveError(null); }} onScroll={handleScroll} spellCheck={false} className={`absolute inset-0 w-full h-full px-4 py-6 bg-transparent resize-none focus:outline-none code-font text-lg leading-7 caret-white text-transparent selection:bg-amber-500/30 overflow-auto ${mode === ScriptMode.DEVANAGARI ? 'devanagari' : ''}`} placeholder={mode === ScriptMode.DEVANAGARI ? 'अत्र कोडं लिखन्तु...' : 'Write code here...'} />

          {hoveredDoc && !contextMenu.visible && (
            <div className="fixed z-[150] w-64 p-4 bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none" style={{ top: hoveredDoc.y + 15, left: hoveredDoc.x + 15 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{hoveredDoc.name}</span>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">{hoveredDoc.equivalent}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-bold text-white">{hoveredDoc.roman}</span>
                <span className="text-lg font-bold text-amber-400 devanagari">{hoveredDoc.devanagari}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">{hoveredDoc.meaning}</p>
            </div>
          )}

          {activeError && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[120] w-80 bg-slate-900/95 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-200">
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Error Insight</span>
                  </div>
                  <button onClick={() => setActiveError(null)} className="text-slate-500 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               <div className="space-y-4">
                  <div className="text-sm font-medium text-slate-200 leading-relaxed">{activeError.message}</div>
                  {activeError.word && (
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                       <span className="text-[9px] text-slate-500 uppercase block mb-1">Offending Word:</span>
                       <code className="text-amber-400 font-mono text-xs">{activeError.word}</code>
                    </div>
                  )}
               </div>
               <div className="mt-5 flex justify-end">
                  <button onClick={() => setActiveError(null)} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-all">Dismiss</button>
               </div>
            </div>
          )}
        </div>
      </div>

      {copiedStatus && (
        <div className="absolute bottom-12 right-6 z-[110] bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg font-bold text-xs shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            {copiedStatus}
          </div>
        </div>
      )}

      {contextMenu.visible && (
        <div className="fixed z-[100] w-64 py-1.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleAction('auto-format')} className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-colors group">
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Auto-format Code
          </button>
          <div className="my-1 border-t border-slate-800 mx-2"></div>
          <button onClick={() => handleAction('copy')} className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group">
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            Copy <span className="ml-auto opacity-40 text-[10px]">Ctrl+C</span>
          </button>
          <button onClick={() => handleAction('copy-devanagari')} className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group">
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            Copy as Devanagari
          </button>
          <button onClick={() => handleAction('convert-to-devanagari')} className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors group">
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Translate Buffer to Devanagari
          </button>
          <button onClick={() => handleAction('cut')} className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group">
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" /></svg>
            Cut <span className="ml-auto opacity-40 text-[10px]">Ctrl+X</span>
          </button>
          <button onClick={() => handleAction('paste')} className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group">
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Paste <span className="ml-auto opacity-40 text-[10px]">Ctrl+V</span>
          </button>
          <div className="my-1 border-t border-slate-800 mx-2"></div>
          <button onClick={() => handleAction('comment')} className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group">
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
            Comment / Uncomment <span className="ml-auto opacity-40 text-[10px]">Ctrl+/</span>
          </button>
        </div>
      )}
      
      <div className="bg-slate-800/50 px-4 py-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-800/50">
        <div className="flex space-x-4">
          <span>LN {linesCount}</span>
          <span>COL {code.length}</span>
          <span>BP {breakpoints.size}</span>
        </div>
        <div className="flex items-center space-x-2">
          {errors.length > 0 && <span className="text-red-400 font-bold truncate max-w-[200px]">{errors[0].message}</span>}
          <div className="flex items-center space-x-1">
            <div className={`w-1.5 h-1.5 rounded-full ${errors.length > 0 ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
            <span>{errors.length > 0 ? 'SYNTAX ERROR' : 'ENGINE READY'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
