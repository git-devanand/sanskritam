
import { KeywordMap } from './types';

export const KEYWORDS: KeywordMap = {
  PRINT: { roman: 'vadatu', devanagari: 'वदतु', meaning: 'Speak/Print', equivalent: 'print()' },
  IF: { roman: 'yadi', devanagari: 'यदि', meaning: 'If', equivalent: 'if' },
  THEN: { roman: 'tarhi', devanagari: 'तर्हि', meaning: 'Then', equivalent: ':' },
  FUNCTION: { roman: 'karyam', devanagari: 'कार्यम्', meaning: 'Function', equivalent: 'def' },
  VALUE: { roman: 'mulyam', devanagari: 'मूल्यम्', meaning: 'Value/Variable', equivalent: 'var' },
  FOR: { roman: 'krute', devanagari: 'कृते', meaning: 'For', equivalent: 'for' },
  WHILE: { roman: 'yavat', devanagari: 'यावत्', meaning: 'While', equivalent: 'while' },
  END: { roman: 'samaptam', devanagari: 'समाप्तम्', meaning: 'End', equivalent: '}' },
  TRUE: { roman: 'satyam', devanagari: 'सत्यम्', meaning: 'True', equivalent: 'true' },
  FALSE: { roman: 'asatyam', devanagari: 'असत्यम्', meaning: 'False', equivalent: 'false' },
};

export const SAMPLE_CODES = {
  ROMAN: `mulyam x = 10\nmulyam y = 20\nvadatu "Sanskritam is powerful"\nyadi x < y tarhi\n  vadatu "X is smaller"\nsamaptam`,
  DEVANAGARI: `मूल्यम् x = १०\nमूल्यम् y = २०\nवदतु "संस्कृतम् अतीव शक्तिशाली अस्ति"\nयदि x < y तर्हि\n  वदतु "x न्यूनम् अस्ति"\nसमाप्तम्`
};

export interface Snippet {
  name: string;
  description: string;
  code: {
    ROMAN: string;
    DEVANAGARI: string;
  };
}

export const SNIPPETS: Snippet[] = [
  {
    name: "Hello World",
    description: "Traditional first program.",
    code: {
      ROMAN: 'vadatu "Namo Namah! Welcome to Sanskritam."',
      DEVANAGARI: 'वदतु "नमो नम:। संस्कृतम् स्वागतम्।"'
    }
  },
  {
    name: "Factorial Logic",
    description: "Recursive mathematical calculation.",
    code: {
      ROMAN: `karyam factorial(n) tarhi\n  yadi n <= 1 tarhi\n    vadatu 1\n  samaptam\n  mulyam res = n * factorial(n - 1)\n  vadatu res\nsamaptam\n\nfactorial(5)`,
      DEVANAGARI: `कार्यम् factorial(n) तर्हि\n  यदि n <= १ तर्हि\n    वदतु १\n  समाप्तम्\n  मूल्यम् res = n * factorial(n - १)\n  वदतु res\nसमाप्तम्\n\nfactorial(५)`
    }
  },
  {
    name: "Iterative Loop",
    description: "Demonstrating the 'yavat' keyword.",
    code: {
      ROMAN: `mulyam counter = 0\nyavat counter < 5 tarhi\n  vadatu "Counting: " + counter\n  counter = counter + 1\nsamaptam`,
      DEVANAGARI: `मूल्यम् counter = ०\nयावत् counter < ५ तर्हि\n  वदतु "गणना: " + counter\n  counter = counter + १\nसमाप्तम्`
    }
  },
  {
    name: "Logical Check",
    description: "Boolean logic and conditionals.",
    code: {
      ROMAN: `mulyam isRaining = satyam\nyadi isRaining tarhi\n  vadatu "Bring an umbrella"\nsamaptam`,
      DEVANAGARI: `मूल्यम् isRaining = सत्यम्\nयदि isRaining तर्हि\n  वदतु "छत्रं आनयतु"\nसमाप्तम्`
    }
  }
];
