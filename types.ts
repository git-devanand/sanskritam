
export enum ScriptMode {
  ROMAN = 'ROMAN',
  DEVANAGARI = 'DEVANAGARI'
}

export interface SanskritamError {
  line: number;
  column: number;
  message: string;
  word?: string;
}

export interface DebugSnapshot {
  line: number;
  variables: Record<string, any>;
  stdout: string;
}

export interface CodeOutput {
  stdout: string;
  explanation: string;
  transpiled: string;
  tokens: { word: string; category: string }[];
  errors?: SanskritamError[];
  debugTrace?: DebugSnapshot[];
}

export interface KeywordMap {
  [key: string]: {
    roman: string;
    devanagari: string;
    meaning: string;
    equivalent: string;
  };
}
