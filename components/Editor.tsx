
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

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const highlightCode = (input: string) => {
    const lines = input.split('\n');
    
    const highlightedLines = lines.map((lineText, lineIdx) => {
      const isCurrentLine = currentDebugLine === lineIdx + 1;
      let html = lineText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Highlight comments
      if (html.trim().startsWith('//')) {
        html = `<span class="text-slate-500 italic">${html}</span>`;
      } else {
        // Highlight strings
        html = html.replace(/"(.*?)"/g, '<span class="text-emerald-400">"$1"</span>');

        // Highlight numbers
        html = html.replace(/\b(\d+)\b/g, '<span class="text-blue-400">$1</span>');

        // Highlight keywords with script-specific styling
        Object.values(KEYWORDS).forEach((kw) => {
          const isDevanagari = mode === ScriptMode.DEVANAGARI;
          const target = isDevanagari ? kw.devanagari : kw.roman;
          
          const keywordClass = isDevanagari 
            ? "text-amber-100 font-black drop-shadow-[0_0_3px_rgba(245,158,11,0.6)]" 
            : "text-amber-400 font-bold";

          const regex = isDevanagari 
            ? new RegExp(`${target}`, 'g')
            : new RegExp(`\\b${target}\\b`, 'g');
          
          html = html.replace(regex, `<span class="${keywordClass}">${target}</span>`);
        });

        // Highlight operators
        html = html.replace(/([=+\-*/<>!|&])/g, '<span class="text-pink-400">$1</span>');
      }

      // Apply Errors
      const lineErrors = errors.filter(e => e.line === lineIdx + 1);
      lineErrors.forEach(err => {
        if (err.word) {
          const escapedWord = err.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const errRegex = new RegExp(`(${escapedWord})`, 'g');
          html = html.replace(errRegex, `<span class="border-b-2 border-red-500 bg-red-500/10 cursor-help" title="${err.message}">$1</span>`);
        }
      });

      const lineContent = html === "" ? "&nbsp;" : html;
      return `<div class="w-full ${isCurrentLine ? 'bg-amber-500/20' : ''}">${lineContent}</div>`;
    });

    return highlightedLines.join('');
  };

  const handleAction = async (action: 'copy' | 'cut' | 'paste' | 'comment' | 'copy-devanagari') => {
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
        break;
      case 'copy-devanagari':
        {
          const textToConvert = selectedText || code.split('\n')[code.substring(0, start).split('\n').length - 1];
          let converted = textToConvert;
          Object.values(KEYWORDS).forEach(kw => {
            const regex = new RegExp(`\\b${kw.roman}\\b`, 'g');
            converted = converted.replace(regex, kw.devanagari);
          });
          await navigator.clipboard.writeText(converted);
        }
        break;
      case 'cut':
        if (selectedText) {
          await navigator.clipboard.writeText(selectedText);
          const newCode = code.substring(0, start) + code.substring(end);
          setCode(newCode);
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
        const lines = code.split('\n');
        const currentLineIdx = code.substring(0, start).split('\n').length - 1;
        const line = lines[currentLineIdx];
        if (line.trim().startsWith('//')) {
          lines[currentLineIdx] = line.replace('// ', '').replace('//', '');
        } else {
          lines[currentLineIdx] = '// ' + line;
        }
        setCode(lines.join('\n'));
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
        {/* Gutter Layer */}
        <div 
          ref={gutterRef}
          className="w-12 bg-slate-950 border-r border-slate-800 select-none overflow-hidden py-6 flex flex-col items-center z-10"
        >
          {Array.from({ length: linesCount }).map((_, i) => {
            const lineNum = i + 1;
            const hasBreakpoint = breakpoints.has(lineNum);
            const isExecuting = currentDebugLine === lineNum;
            return (
              <div 
                key={i} 
                onClick={() => toggleBreakpoint(lineNum)}
                className={`h-7 w-full flex items-center justify-center cursor-pointer transition-colors group ${isExecuting ? 'bg-amber-500/20' : 'hover:bg-slate-800'}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full transition-all ${hasBreakpoint ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-transparent group-hover:bg-red-500/20'}`}></div>
                <span className={`text-[10px] font-mono ml-1.5 w-4 text-right transition-colors ${isExecuting ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>
                  {lineNum}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex-1 relative overflow-hidden">
          {/* Syntax Highlighting Layer */}
          <div
            ref={highlightRef}
            aria-hidden="true"
            className={`absolute inset-0 px-4 py-6 pointer-events-none whitespace-pre-wrap break-words code-font text-lg leading-7 overflow-hidden ${mode === ScriptMode.DEVANAGARI ? 'devanagari' : ''}`}
            dangerouslySetInnerHTML={{ __html: highlightCode(code) + '\n' }}
          />
          
          {/* Transparent Textarea Layer */}
          <textarea
            ref={textareaRef}
            value={code}
            onContextMenu={handleContextMenu}
            onChange={(e) => setCode(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            className={`absolute inset-0 w-full h-full px-4 py-6 bg-transparent resize-none focus:outline-none code-font text-lg leading-7 caret-white text-transparent selection:bg-amber-500/30 overflow-auto ${mode === ScriptMode.DEVANAGARI ? 'devanagari' : ''}`}
            placeholder={mode === ScriptMode.DEVANAGARI ? 'अत्र कोडं लिखन्तु...' : 'Write code here...'}
          />
        </div>
      </div>

      {/* Custom Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed z-[100] w-64 py-1.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => handleAction('copy')}
            className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group"
          >
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            Copy
            <span className="ml-auto opacity-40 text-[10px]">Ctrl+C</span>
          </button>
          <button 
            onClick={() => handleAction('copy-devanagari')}
            className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group"
          >
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            Copy as Devanagari
          </button>
          <button 
            onClick={() => handleAction('cut')}
            className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group"
          >
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" /></svg>
            Cut
            <span className="ml-auto opacity-40 text-[10px]">Ctrl+X</span>
          </button>
          <button 
            onClick={() => handleAction('paste')}
            className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group"
          >
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Paste
            <span className="ml-auto opacity-40 text-[10px]">Ctrl+V</span>
          </button>
          <div className="my-1 border-t border-slate-800 mx-2"></div>
          <button 
            onClick={() => handleAction('comment')}
            className="w-full px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors group"
          >
            <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
            Comment / Uncomment
            <span className="ml-auto opacity-40 text-[10px]">Ctrl+/</span>
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
          {errors.length > 0 && (
            <span className="text-red-400 font-bold truncate max-w-[200px]">{errors[0].message}</span>
          )}
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
