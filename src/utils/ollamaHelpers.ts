// ollamaHelpers.ts

import { convertToOpenaiTools, formatToolResponse } from "./toolHelpers.js";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { callToolWithTimeout } from "./toolUtils.js";
import ollama from "ollama";

interface ModelResponse {
  content: string;
  tool_calls?: any[];
}

interface ManagerResponse {
  status: "CONTINUE" | "END" | "ERROR";
  reasoning: string;
  nextPrompt?: string;
}

export class OllamaManager {
  private managerMessages: any[] = [];
  private workerMessages: any[] = [];
  private client: Client;
  private model: string;
  private tools: any[];

  constructor(model: string, client: Client, tools: any[]) {
    this.model = model;
    this.client = client;
    this.tools = tools;

    // Initialize manager with simpler, more direct prompt
    this.managerMessages = [
      {
        role: "system",
        content: `You are a task evaluator focused on efficiency. Analyze if the core task is complete.

Your response must be JSON with:
{
  "status": "CONTINUE" | "END" | "ERROR",
  "reasoning": "Very brief explanation",
  "nextPrompt": "Next instruction if CONTINUE"
}

Key points:
- If the core question is answered, mark it END
- Only CONTINUE if essential information is missing
- Prefer brevity and directness
- Don't suggest additional analysis unless explicitly requested`
      },
    ];
  }

  async initialize() {
    // Get allowed directories
    const dirResponse = await callToolWithTimeout(
      this.client,
      "list_allowed_directories",
      {}
    );
    const allowedDirs = (dirResponse as any)?.content || [];

    // Initialize worker with simpler prompt
    this.workerMessages = [
      {
        role: "system",
        content: `You are a direct and efficient assistant with access to these directories: ${JSON.stringify(allowedDirs)}

Guidelines:
- Get straight to the point
- Use tools only when needed
- Keep responses brief and contextual
- Format simply unless specific formatting is requested
- Match your tone to the context

Available tools:
${this.tools.map((t) => `- ${t.function.name}: ${t.function.description}`).join('\n')}`
      },
    ];

    return this;
  }

  async processTask(initialPrompt: string): Promise<string> {
    console.log("Starting task:", initialPrompt);

    this.workerMessages.push({
      role: "user",
      content: initialPrompt,
    });

    while (true) {
      try {
        // Get worker's response
        const workerResponse = await this.getWorkerResponse();
        console.log("Worker response received");

        // Add worker's response to manager's context
        this.managerMessages.push({
          role: "user",
          content: `Worker's response: ${workerResponse.content}`,
        });

        // Get manager's evaluation
        const managerResponse = await this.getManagerResponse();
        console.log(`Manager status: ${managerResponse.status}`);

        if (managerResponse.status === "END") {
          return workerResponse.content + "\n<END>";
        }

        if (managerResponse.status === "ERROR") {
          throw new Error(managerResponse.reasoning);
        }

        // Continue only if absolutely necessary
        if (managerResponse.nextPrompt) {
          console.log("Continuing with:", managerResponse.nextPrompt);
          this.workerMessages.push({
            role: "user",
            content: managerResponse.nextPrompt,
          });
        }
      } catch (error) {
        console.error("Error in task processing:", error);
        return `Error: ${error.message}\n<END>`;
      }
    }
  }

  private async getWorkerResponse(): Promise<ModelResponse> {
    const response = await ollama.chat({
      model: this.model,
      messages: this.workerMessages,
      tools: this.tools,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 1000,
      },
    });

    if (response.message.tool_calls?.length) {
      console.log(`Processing ${response.message.tool_calls.length} tool calls`);
      
      // Process tool calls sequentially
      for (const toolCall of response.message.tool_calls) {
        try {
          console.log(`Executing tool: ${toolCall.function.name}`);
          
          // Add tool call to conversation
          this.workerMessages.push({
            role: "assistant",
            content: null,
            tool_calls: [toolCall]
          });

          // Execute tool
          const toolResponse = await callToolWithTimeout(
            this.client,
            toolCall.function.name,
            toolCall.function.arguments
          );

          // Add tool response
          const formattedResponse = formatToolResponse(toolResponse?.content || []);
          console.log("Tool response:", formattedResponse);
          
          this.workerMessages.push({
            role: "tool",
            name: toolCall.function.name,
            content: formattedResponse,
            tool_call_id: toolCall.id
          });
        } catch (error) {
          console.error(`Tool execution failed:`, error);
          throw error;
        }
      }

      // Get final response after tool usage
      console.log("Getting final response after tool usage");
      const finalResponse = await ollama.chat({
        model: this.model,
        messages: this.workerMessages,
      });

      return finalResponse.message;
    }

    return response.message;
  }

  private async getManagerResponse(): Promise<ManagerResponse> {
    const response = await ollama.chat({
      model: this.model,
      messages: this.managerMessages,
      format: "json",
    });

    try {
      const parsedResponse = JSON.parse(response.message.content);
      return parsedResponse as ManagerResponse;
    } catch (e) {
      console.error("Failed to parse manager response:", e);
      return {
        status: "ERROR",
        reasoning: "Failed to parse manager response",
      };
    }
  }
}

export async function processOllamaToolCalls(
  model: string,
  initialPrompt: string,
  ollamaTools: any[],
  client: Client
): Promise<string> {
  const manager = await new OllamaManager(
    model,
    client,
    ollamaTools
  ).initialize();
  return await manager.processTask(initialPrompt);
}
