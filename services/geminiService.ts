
import { GoogleGenAI, Type } from "@google/genai";
import { CodeOutput } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function processSanskritamCode(
  code: string, 
  script: string, 
  mode: 'lint' | 'run' | 'debug' = 'run'
): Promise<CodeOutput> {
  const systemInstruction = `
    You are the core engine, linter, and debugger of the "Sanskritam" programming language. 
    Sanskritam is inspired by Sanskrit grammar where word order is flexible.
    
    Keywords:
    - vadatu/वदतु: Speak/Print (equivalent to print)
    - yadi/यदि: If
    - tarhi/तर्हि: Then (starts a block)
    - anyatha/अन्यथा: Else
    - karyam/कार्यम्: Function definition
    - mulyam/मूल्यम्: Variable declaration
    - yavat/यावत्: While loop
    - krute/कृते: For loop
    - anuvartatu/अनुवर्ततु: Continue loop
    - viramatu/विरमतु: Break loop
    - pratyarpayatu/प्रत्यर्पयतु: Return value
    - samaptam/समाप्तम्: End of block
    - satyam/सत्यम्: True boolean
    - asatyam/असत्यम्: False boolean
    - prayatnam/प्रयत्नम्: Try block
    - grihnatu/गृह्णातु: Catch block
    - kshipatu/क्षिपतु: Throw exception
    - shreni/श्रेणी: Class definition
    - anayati/आनयति: Import module
    - shunyam/शून्यम्: Null value
    
    Your task:
    1. Parse the provided code.
    2. Check for syntax errors (e.g., missing 'samaptam', undefined variables).
    3. If mode is 'lint', only return errors and tokens.
    4. If mode is 'run', return stdout, transpiled C++, tokens, and explanation.
    5. If mode is 'debug', additionally return a 'debugTrace'. 
       The 'debugTrace' is an array of snapshots for EACH line executed.
       Each snapshot contains:
       - line: The 1-based line number.
       - variables: An object showing the current state of variables after that line executes.
       - stdout: The cumulative output up to that point.

    Sanskritam also uses Devanagari numerals (०-९). Map them to (0-9).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `[MODE: ${mode.toUpperCase()}] Process this Sanskritam code (${script} script):\n\n${code}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stdout: { type: Type.STRING },
          explanation: { type: Type.STRING },
          transpiled: { type: Type.STRING },
          tokens: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                category: { type: Type.STRING }
              }
            }
          },
          errors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                line: { type: Type.INTEGER },
                column: { type: Type.INTEGER },
                message: { type: Type.STRING },
                word: { type: Type.STRING }
              },
              required: ["line", "column", "message"]
            }
          },
          debugTrace: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                line: { type: Type.INTEGER },
                variables: { type: Type.OBJECT },
                stdout: { type: Type.STRING }
              },
              required: ["line", "variables", "stdout"]
            }
          }
        },
        required: ["stdout", "explanation", "transpiled", "tokens"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Engine malfunction: Could not interpret logic.");
  }
}
