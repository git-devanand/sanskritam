
import { GoogleGenAI, Type } from "@google/genai";
import { CodeOutput } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function processSanskritamCode(code: string, script: string, isLintOnly: boolean = false): Promise<CodeOutput> {
  const systemInstruction = `
    You are the core engine and linter of the "Sanskritam" programming language. 
    Sanskritam is inspired by Sanskrit grammar where word order is flexible.
    
    Keywords:
    - vadatu/वदतु: Print
    - yadi/यदि: If
    - tarhi/तर्हि: Then
    - karyam/कार्यम्: Function
    - mulyam/मूल्यम्: Variable declaration
    - samaptam/समाप्तम्: End of block
    - satyam/सत्यम्: True
    - asatyam/असत्यम्: False
    
    Your task:
    1. Parse the provided code.
    2. If there are syntax errors (missing 'tarhi' after 'yadi', unclosed strings, invalid keywords, mismatched 'samaptam'), identify them.
    3. Return an array of errors with line, column, and message.
    4. If no errors, simulate execution (stdout), provide C++ transpilation, and list semantic tokens.
    5. If 'isLintOnly' is requested, focus primarily on errors and tokenization.

    CRITICAL: For errors, provide the 'word' causing the error if possible.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `${isLintOnly ? "[LINT MODE] " : ""}Process this Sanskritam code (${script} script):\n\n${code}`,
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
