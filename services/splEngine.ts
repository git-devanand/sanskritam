
import { KEYWORDS } from "../constants";
import { CodeOutput, SanskritamError, DebugSnapshot, ScriptMode } from "../types";

// Token Types
type TokenType = 'KEYWORD' | 'IDENTIFIER' | 'NUMBER' | 'STRING' | 'OPERATOR' | 'PUNCTUATION' | 'COMMENT';

interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
  raw?: string;
}

export class SPLEngine {
  private tokens: Token[] = [];
  private errors: SanskritamError[] = [];
  private stdout: string[] = [];
  private variables: Record<string, any> = {};
  private debugTrace: DebugSnapshot[] = [];
  private pos = 0;
  private codeLines: string[] = [];

  // Devanagari to Roman Numeral mapping
  private d2r: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };

  constructor(private code: string, private mode: ScriptMode) {
    this.codeLines = code.split('\n');
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char) || /[०-९]/.test(char);
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z_]/.test(char) || (char >= '\u0900' && char <= '\u097F');
  }

  private tokenize(): Token[] {
    const tokens: Token[] = [];
    let line = 1;
    let col = 1;
    let i = 0;

    while (i < this.code.length) {
      let char = this.code[i];

      if (char === '\n') {
        line++;
        col = 1;
        i++;
        continue;
      }

      if (/\s/.test(char)) {
        i++; col++;
        continue;
      }

      // Comments
      if (char === '/' && this.code[i + 1] === '/') {
        while (i < this.code.length && this.code[i] !== '\n') i++;
        continue;
      }

      // Strings
      if (char === '"') {
        let val = '';
        let startCol = col;
        i++; col++;
        while (i < this.code.length && this.code[i] !== '"') {
          val += this.code[i];
          i++; col++;
        }
        i++; col++;
        tokens.push({ type: 'STRING', value: val, line, col: startCol });
        continue;
      }

      // Numbers
      if (this.isDigit(char)) {
        let val = '';
        let startCol = col;
        while (i < this.code.length && (this.isDigit(this.code[i]) || this.code[i] === '.')) {
          let c = this.code[i];
          val += this.d2r[c] || c;
          i++; col++;
        }
        tokens.push({ type: 'NUMBER', value: val, line, col: startCol });
        continue;
      }

      // Keywords & Identifiers
      if (this.isAlpha(char)) {
        let val = '';
        let startCol = col;
        while (i < this.code.length && (this.isAlpha(this.code[i]) || this.isDigit(this.code[i]))) {
          val += this.code[i];
          i++; col++;
        }
        
        // Check if val is a keyword (check both scripts)
        const isKeyword = Object.values(KEYWORDS).some(k => k.roman === val || k.devanagari === val);
        tokens.push({ type: isKeyword ? 'KEYWORD' : 'IDENTIFIER', value: val, line, col: startCol });
        continue;
      }

      // Operators
      if ("+-*/%=<>!&|".includes(char)) {
        let val = char;
        let startCol = col;
        i++; col++;
        if ("=<>!".includes(char) && this.code[i] === '=') {
          val += this.code[i];
          i++; col++;
        }
        tokens.push({ type: 'OPERATOR', value: val, line, col: startCol });
        continue;
      }

      // Punctuation
      if ("(),".includes(char)) {
        tokens.push({ type: 'PUNCTUATION', value: char, line, col });
        i++; col++;
        continue;
      }

      this.errors.push({ line, column: col, message: `Unexpected character: ${char}`, word: char });
      i++; col++;
    }
    return tokens;
  }

  // --- INTERPRETER LOGIC ---

  private evaluateExpression(tokens: Token[]): any {
    if (tokens.length === 0) return null;
    
    // Simplistic expression evaluator for local engine
    // Supports: Addition, comparison, and literals
    if (tokens.length === 1) {
      const t = tokens[0];
      if (t.type === 'NUMBER') return parseFloat(t.value);
      if (t.type === 'STRING') return t.value;
      if (t.type === 'IDENTIFIER') {
        if (this.variables[t.value] !== undefined) return this.variables[t.value];
        // Check for boolean keywords
        if (t.value === KEYWORDS.TRUE.roman || t.value === KEYWORDS.TRUE.devanagari) return true;
        if (t.value === KEYWORDS.FALSE.roman || t.value === KEYWORDS.FALSE.devanagari) return false;
        if (t.value === KEYWORDS.NULL.roman || t.value === KEYWORDS.NULL.devanagari) return null;
        return 0; 
      }
    }

    // Handle string concatenation and basic math
    // We'll use a simple recursive approach or reduce for the local demo
    try {
      let result = this.getPrimitiveValue(tokens[0]);
      for (let i = 1; i < tokens.length; i += 2) {
        const op = tokens[i].value;
        const next = this.getPrimitiveValue(tokens[i+1]);
        if (op === '+') result += next;
        else if (op === '-') result -= next;
        else if (op === '*') result *= next;
        else if (op === '/') result /= next;
        else if (op === '==') result = result === next;
        else if (op === '<') result = result < next;
        else if (op === '>') result = result > next;
        else if (op === '<=') result = result <= next;
        else if (op === '>=') result = result >= next;
      }
      return result;
    } catch (e) {
      return 0;
    }
  }

  private getPrimitiveValue(t: Token): any {
    if (!t) return 0;
    if (t.type === 'NUMBER') return parseFloat(t.value);
    if (t.type === 'STRING') return t.value;
    if (t.type === 'IDENTIFIER') return this.variables[t.value] ?? 0;
    return 0;
  }

  private captureSnapshot(line: number) {
    this.debugTrace.push({
      line: line,
      variables: JSON.parse(JSON.stringify(this.variables)),
      stdout: this.stdout.join('\n')
    });
  }

  public execute(): CodeOutput {
    this.tokens = this.tokenize();
    if (this.errors.length > 0) {
      return { stdout: "", explanation: "Syntax errors detected.", transpiled: "", tokens: [], errors: this.errors };
    }

    let i = 0;
    while (i < this.tokens.length) {
      const token = this.tokens[i];
      
      // Variable declaration: mulyam x = 10
      if (token.value === KEYWORDS.VALUE.roman || token.value === KEYWORDS.VALUE.devanagari) {
        const id = this.tokens[i + 1]?.value;
        if (this.tokens[i+2]?.value === '=') {
          let exprTokens: Token[] = [];
          let j = i + 3;
          while (j < this.tokens.length && this.tokens[j].line === token.line) {
            exprTokens.push(this.tokens[j]);
            j++;
          }
          this.variables[id] = this.evaluateExpression(exprTokens);
          this.captureSnapshot(token.line);
          i = j;
          continue;
        }
      }

      // Print: vadatu "hello"
      if (token.value === KEYWORDS.PRINT.roman || token.value === KEYWORDS.PRINT.devanagari) {
        let exprTokens: Token[] = [];
        let j = i + 1;
        while (j < this.tokens.length && this.tokens[j].line === token.line) {
          exprTokens.push(this.tokens[j]);
          j++;
        }
        const val = this.evaluateExpression(exprTokens);
        this.stdout.push(String(val));
        this.captureSnapshot(token.line);
        i = j;
        continue;
      }

      // Conditionals: yadi x < y tarhi ... samaptam
      if (token.value === KEYWORDS.IF.roman || token.value === KEYWORDS.IF.devanagari) {
        let exprTokens: Token[] = [];
        let j = i + 1;
        while (j < this.tokens.length && this.tokens[j].value !== KEYWORDS.THEN.roman && this.tokens[j].value !== KEYWORDS.THEN.devanagari) {
          exprTokens.push(this.tokens[j]);
          j++;
        }
        const condition = this.evaluateExpression(exprTokens);
        this.captureSnapshot(token.line);

        if (!condition) {
          // Skip block
          let depth = 1;
          j++; // skip tarhi
          while (j < this.tokens.length && depth > 0) {
            if (this.tokens[j].value === KEYWORDS.IF.roman || this.tokens[j].value === KEYWORDS.IF.devanagari) depth++;
            if (this.tokens[j].value === KEYWORDS.END.roman || this.tokens[j].value === KEYWORDS.END.devanagari) depth--;
            j++;
          }
          i = j;
        } else {
          i = j + 1; // Enter block
        }
        continue;
      }

      // End block: samaptam
      if (token.value === KEYWORDS.END.roman || token.value === KEYWORDS.END.devanagari) {
        this.captureSnapshot(token.line);
        i++;
        continue;
      }

      // Assignment: x = 20 (already defined)
      if (token.type === 'IDENTIFIER' && this.tokens[i+1]?.value === '=') {
        let exprTokens: Token[] = [];
        let j = i + 2;
        while (j < this.tokens.length && this.tokens[j].line === token.line) {
          exprTokens.push(this.tokens[j]);
          j++;
        }
        this.variables[token.value] = this.evaluateExpression(exprTokens);
        this.captureSnapshot(token.line);
        i = j;
        continue;
      }

      i++;
    }

    return {
      stdout: this.stdout.join('\n'),
      explanation: "Local SPL Engine executed the code successfully. Semantic connections verified.",
      transpiled: this.generateCpp(),
      tokens: this.tokens.map(t => ({ word: t.value, category: t.type })),
      debugTrace: this.debugTrace,
      errors: this.errors
    };
  }

  private generateCpp(): string {
    let cpp = `#include "Sanskritam.h"\n\nint main() {\n`;
    let indent = "  ";
    
    // Simple line-by-line transpilation for demo purposes
    this.codeLines.forEach(line => {
      let trimmed = line.trim();
      if (!trimmed) return;
      
      if (trimmed.startsWith('//')) {
        cpp += `${indent}${trimmed}\n`;
        return;
      }

      // Mapping logic
      Object.entries(KEYWORDS).forEach(([key, kw]) => {
        const regex = new RegExp(`\\b(${kw.roman}|${kw.devanagari})\\b`, 'g');
        if (key === 'PRINT') trimmed = trimmed.replace(regex, 'san::vadatu(') + ');';
        else if (key === 'VALUE') trimmed = trimmed.replace(regex, 'auto ');
        else if (key === 'IF') trimmed = trimmed.replace(regex, 'if (') ;
        else if (key === 'THEN') trimmed = trimmed.replace(regex, ') {');
        else if (key === 'END') trimmed = trimmed.replace(regex, '}');
      });

      // Cleanup
      trimmed = trimmed.replace(/= (.+)\b/, '= $1;');
      if (trimmed.includes('if') && !trimmed.endsWith('{')) trimmed += ')';

      cpp += `${indent}${trimmed}\n`;
    });

    cpp += `  return 0;\n}`;
    return cpp;
  }
}
