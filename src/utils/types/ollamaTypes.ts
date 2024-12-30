// ollamaTypes.ts

export interface OllamaToolCall {
  type: "function";
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface OllamaFunction {
  name: string;
  arguments: Record<string, unknown>;
}

export interface OllamaMessage {
  role: string;
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ModelResponse {
  content: string;
  tool_calls?: OllamaToolCall[];
}

export interface ChatResponse {
  message: OllamaMessage;
  model: string;
  created_at: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}
