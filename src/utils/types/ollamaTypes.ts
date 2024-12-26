// ollamaTypes.ts

export interface ManagerResponse {
  status: "CONTINUE" | "END" | "ERROR";
  reasoning: string;
  nextPrompt?: string;
}

export interface ModelResponse {
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: Record<string, any>; // Changed 'any' to Record<string, any> for better type safety
    };
  }>;
}
