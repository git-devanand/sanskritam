
import React, { useRef, useEffect } from 'react';
import { ScriptMode, SanskritamError } from '../types';
import { KEYWORDS } from '../constants';

interface EditorProps {
  code: string;
  setCode: (code: string) => void;
  mode: ScriptMode;
  errors: SanskritamError[];
}

const Editor: React.FC<EditorProps> = ({ code, setCode, mode, errors }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const highlightCode = (input: string) => {
    const lines = input.split('\n');
    
    const highlightedLines = lines.map((lineText, lineIdx) => {
      let html = lineText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Highlight strings
      html = html.replace(/"(.*?)"/g, '<span class="text-emerald-400">"$1"</span>');

      // Highlight numbers
      html = html.replace(/\b(\d+)\b/g, '<span class="text-blue-400">$1</span>');

      // Highlight keywords
      Object.values(KEYWORDS).forEach((kw) => {
        const target = mode === ScriptMode.DEVANAGARI ? kw.devanagari : kw.roman;
        const regex = mode === ScriptMode.DEVANAGARI 
          ? new RegExp(`${target}`, 'g')
          : new RegExp(`\\b${target}\\b`, 'g');
        html = html.replace(regex, `<span class="text-amber-400 font-bold">${target}</span>`);
      });

      // Highlight operators
      html = html.replace(/([=+\-*/<>!|&])/g, '<span class="text-pink-400">$1</span>');

      // Apply Errors for this specific line
      const lineErrors = errors.filter(e => e.line === lineIdx + 1);
      lineErrors.forEach(err => {
        if (err.word) {
          // If a specific word is provided, wrap it in error styling
          const escapedWord = err.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const errRegex = new RegExp(`(${escapedWord})`, 'g');
          html = html.replace(errRegex, `<span class="border-b-2 border-red-500 bg-red-500/10 cursor-help" title="${err.message}">$1</span>`);
        } else if (err.column > 0) {
          // Fallback to column-based highlighting if word isn't precise
          // This is a simplified approach: wrap from column to end of word or line
          // For a prototype, we'll just indicate the error exists on this line visually
        }
      });

      return html === "" ? "&nbsp;" : html;
    });

    return highlightedLines.join('\n');
  };

  useEffect(() => {
    handleScroll();
  }, [code, errors]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative">
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700 z-10">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex items-center space-x-2">
          {errors.length > 0 && (
            <span className="flex items-center space-x-1 text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 animate-pulse">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span>{errors.length} ISSUE{errors.length > 1 ? 'S' : ''}</span>
            </span>
          )}
          <span className="text-xs font-mono text-slate-400">
            playground.san {mode === ScriptMode.DEVANAGARI ? '(Devanagari)' : '(Roman)'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={highlightRef}
          aria-hidden="true"
          className={`absolute inset-0 p-6 pointer-events-none whitespace-pre-wrap break-words code-font text-lg leading-relaxed overflow-hidden ${mode === ScriptMode.DEVANAGARI ? 'devanagari' : ''}`}
          dangerouslySetInnerHTML={{ __html: highlightCode(code) + '\n' }}
        />
        
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          autoFocus
          className={`absolute inset-0 w-full h-full p-6 bg-transparent resize-none focus:outline-none code-font text-lg leading-relaxed caret-white text-transparent selection:bg-amber-500/30 overflow-auto ${mode === ScriptMode.DEVANAGARI ? 'devanagari' : ''}`}
          placeholder={mode === ScriptMode.DEVANAGARI ? 'अत्र कोडं लिखन्तु...' : 'Write code here...'}
        />
      </div>
      
      <div className="bg-slate-800/50 px-4 py-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-800/50">
        <div className="flex space-x-4">
          <span>LN {code.split('\n').length}</span>
          <span>COL {code.length}</span>
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
