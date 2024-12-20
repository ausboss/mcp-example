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
    function: {
      name: string;
      arguments: any;
    };
  }>;
}