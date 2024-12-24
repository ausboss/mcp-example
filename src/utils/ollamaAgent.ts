// ollamaAgent.ts

import { handleToolCall, parseToolResponse } from "./toolHelpers.js";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Ollama } from "ollama";
import { callToolWithTimeout } from "./toolUtils.js";
import { ollamaConfig } from "../config/index.js";

const ollama = new Ollama({ host: ollamaConfig.host });

export class OllamaAgent {
  private messages: any[] = [];
  private client: Client;
  private model: string;
  private tools: any[];
  private maxIterations: number;

  constructor(
    model: string,
    client: Client,
    tools: any[],
    maxIterations: number = 5
  ) {
    this.model = model;
    this.client = client;
    this.tools = tools;
    this.maxIterations = maxIterations;

    this.messages = [
      {
        role: "system",
        content: `You are an assistant that has access to file system tools and can operate in the allowed directories.
        
        Guidelines:
        - use list_directory to verify file names and paths`,
      },
    ];
  }

  async initialize() {
    const dirResponse = await callToolWithTimeout(
      this.client,
      "list_allowed_directories",
      {}
    );
    const allowedDirs = (dirResponse as any)?.content || [];

    this.messages[0].content = `You are an assistant that has access to file system tools and can operate in the following directories: ${JSON.stringify(
      allowedDirs
    )}`;

    return this;
  }

  async executeTask(prompt: string): Promise<string> {
    this.messages.push({ role: "user", content: prompt });

    let iterationCount = 0;

    while (iterationCount < this.maxIterations) {
      try {
        const response = await ollama.chat({
          model: this.model,
          messages: this.messages,
          tools: this.tools,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1000,
          },
        });

        this.messages.push(response.message);

        const toolCalls = response.message.tool_calls || [];

        if (toolCalls.length > 0) {
          console.log(`Attempt ${iterationCount + 1}/${this.maxIterations}`);
          for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            const args = JSON.stringify(toolCall.function.arguments);
            console.log(`Tool '${toolName}' with args: ${args}`);
            try {
              const toolResult = await handleToolCall(
                toolCall,
                this.messages,
                this.client
              );
              //   console.log(`Tool '${toolName}' result: ${toolResult}`); // Concise tool result
            } catch (error) {
              console.error(`Tool '${toolName}' error:`, error);
              this.messages.push({
                role: "assistant",
                content: `Error executing tool ${toolName}: ${error}`,
              });
            }
          }
          iterationCount++; // Increment only if tool calls were made
        } else {
          return response.message.content; // Stop if no tool calls
        }
      } catch (error: unknown) {
        console.error("Error during task execution:", error);
        if (error instanceof Error) {
          return `Error: ${error.message}`;
        }
        return `Error: ${String(error)}`;
      }
    }

    return `Reached maximum attempts (${this.maxIterations})`;
  }
}

export async function runOllamaAgent(
  model: string,
  initialPrompt: string,
  ollamaTools: any[],
  client: Client
): Promise<string> {
  const agent = await new OllamaAgent(model, client, ollamaTools).initialize();
  return await agent.executeTask(initialPrompt);
}
