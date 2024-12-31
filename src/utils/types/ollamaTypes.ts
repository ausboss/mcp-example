// ollamaTypes.ts
// Types for Ollama API integration

import { ToolCall } from "./toolTypes";

/**
 * Represents a tool call in Ollama's format
 */
export interface OllamaToolCall extends Omit<ToolCall, "id"> {
  type: "function";
}

/**
 * Represents a message in the Ollama chat format
 */
export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;
  name?: string;
}
