
import { KeywordMap } from './types';

export const KEYWORDS: KeywordMap = {
  PRINT: { roman: 'vadatu', devanagari: 'वदतु', meaning: 'Speak/Print', equivalent: 'print()' },
  IF: { roman: 'yadi', devanagari: 'यदि', meaning: 'If', equivalent: 'if' },
  THEN: { roman: 'tarhi', devanagari: 'तर्हि', meaning: 'Then', equivalent: ':' },
  ELSE: { roman: 'anyatha', devanagari: 'अन्यथा', meaning: 'Otherwise/Else', equivalent: 'else' },
  FUNCTION: { roman: 'karyam', devanagari: 'कार्यम्', meaning: 'Function', equivalent: 'def' },
  VALUE: { roman: 'mulyam', devanagari: 'मूल्यम्', meaning: 'Value/Variable', equivalent: 'var' },
  FOR: { roman: 'krute', devanagari: 'कृते', meaning: 'For', equivalent: 'for' },
  WHILE: { roman: 'yavat', devanagari: 'यावत्', meaning: 'While', equivalent: 'while' },
  CONTINUE: { roman: 'anuvartatu', devanagari: 'अनुवर्ततु', meaning: 'Continue to next iteration', equivalent: 'continue' },
  BREAK: { roman: 'viramatu', devanagari: 'विरमतु', meaning: 'Break out of loop', equivalent: 'break' },
  RETURN: { roman: 'pratyarpayatu', devanagari: 'प्रत्यर्पयतु', meaning: 'Return value from function', equivalent: 'return' },
  END: { roman: 'samaptam', devanagari: 'समाप्तम्', meaning: 'End of block', equivalent: '}' },
  TRUE: { roman: 'satyam', devanagari: 'सत्यम्', meaning: 'True', equivalent: 'true' },
  FALSE: { roman: 'asatyam', devanagari: 'असत्यम्', meaning: 'False', equivalent: 'false' },
  TRY: { roman: 'prayatnam', devanagari: 'प्रयत्नम्', meaning: 'Try block', equivalent: 'try' },
  CATCH: { roman: 'grihnatu', devanagari: 'गृह्णातु', meaning: 'Catch exception', equivalent: 'catch' },
  THROW: { roman: 'kshipatu', devanagari: 'क्षिपतु', meaning: 'Throw exception', equivalent: 'throw' },
  CLASS: { roman: 'shreni', devanagari: 'श्रेणी', meaning: 'Class definition', equivalent: 'class' },
  IMPORT: { roman: 'anayati', devanagari: 'आनयति', meaning: 'Import module', equivalent: 'import' },
  NULL: { roman: 'shunyam', devanagari: 'शून्यम्', meaning: 'Null/Empty value', equivalent: 'null' },
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
      ROMAN: `karyam factorial(n) tarhi\n  yadi n <= 1 tarhi\n    pratyarpayatu 1\n  samaptam\n  pratyarpayatu n * factorial(n - 1)\nsamaptam\n\nvadatu factorial(5)`,
      DEVANAGARI: `कार्यम् factorial(n) तर्हि\n  यदि n <= १ तर्हि\n    प्रत्यर्पयतु १\n  समाप्तम्\n  प्रत्यर्पयतु n * factorial(n - १)\nसमाप्तम्\n\nवदतु factorial(५)`
    }
  },
  {
    name: "Iterative Loop",
    description: "Demonstrating loops and breaks.",
    code: {
      ROMAN: `mulyam counter = 0\nyavat counter < 10 tarhi\n  yadi counter == 5 tarhi\n    viramatu\n  samaptam\n  vadatu "Counting: " + counter\n  counter = counter + 1\nsamaptam`,
      DEVANAGARI: `मूल्यम् counter = ०\nयावत् counter < १० तर्हि\n  यदि counter == ५ तर्हि\n    विरमतु\n  समाप्तम्\n  वदतु "गणना: " + counter\n  counter = counter + १\nसमाप्तम्`
    }
  },
  {
    name: "Logical Check",
    description: "Boolean logic and conditionals.",
    code: {
      ROMAN: `mulyam isRaining = satyam\nyadi isRaining tarhi\n  vadatu "Bring an umbrella"\nanyatha\n  vadatu "Enjoy the sun"\nsamaptam`,
      DEVANAGARI: `मूल्यम् isRaining = सत्यम्\nयदि isRaining तर्हि\n  वदतु "छत्रं आनयतु"\nअन्यथा\n  वदतु "सूर्यप्रकाशस्य आनन्दं लभस्व"\nसमाप्तम्`
    }
  }
];
