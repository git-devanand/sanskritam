import { CodeOutput, DebugSnapshot, SanskritamError, Token } from "../types";

const mockOutput: CodeOutput = {
    stdout: "Mocked output from geminiService.ts",
    explanation: "This is a mocked explanation.",
    transpiled: "int main() { return 0; }",
    tokens: [
        { word: "vadatu", category: "keyword" },
        { word: "mock", category: "literal" }
    ] as Token[],
    errors: [] as SanskritamError[],
    debugTrace: [
        {
            line: 1,
            variables: {},
            stdout: ""
        },
        {
            line: 2,
            variables: { 'a': 1 },
            stdout: "Mocked output"
        }
    ] as DebugSnapshot[]
};

export async function processSanskritamCode(
  code: string, 
  script: string, 
  mode: 'lint' | 'run' | 'debug' = 'run'
): Promise<CodeOutput> {
  console.log(`[Mock Gemini] Received code for processing:`, { code, script, mode });
  
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockOutput);
    }, 500);
  });
}