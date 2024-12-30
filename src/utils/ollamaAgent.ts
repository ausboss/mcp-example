// ollamaAgent.ts

import { convertToOpenaiTools, handleToolCall } from "./toolHelpers";

import { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { Client } from "@modelcontextprotocol/sdk/client/index";
import { ModelResponse } from "./types/ollamaTypes";
import { Ollama } from "ollama";
import { callToolWithTimeout } from "./toolUtils";
import { ollamaConfig } from "../config";

const ollama = new Ollama({ host: ollamaConfig.host });

export class OllamaAgent {
  private messages: any[] = [];
  private toolMap: Map<string, Client>;
  private model: string;
  private tools: any[];
  private maxIterations: number;

  constructor(
    model: string,
    toolMap: Map<string, Client>,
    tools: any[],
    maxIterations: number = 5
  ) {
    this.model = model;
    this.toolMap = toolMap;
    this.tools = tools;
    this.maxIterations = maxIterations;

    this.messages = [
      {
        role: "system",
        content: `sYou are a helpful assistant.`,
      },
    ];
  }

  async initialize() {
    console.log("messages: ", this.messages);

    if (this.tools.length === 0) {
      console.warn("No tools available to the agent");
    }
    return this;
  }

  private async callAnyTool(
    toolName: string,
    args: any
  ): Promise<string | undefined> {
    const clientForTool = this.toolMap.get(toolName);
    if (!clientForTool) {
      console.warn(`⚠️ Tool '${toolName}' not found among available tools.`);

      // Immediately push an assistant message to the conversation:
      this.messages.push({
        role: "assistant",
        content: `I don't have a tool called '${toolName}'. Let's continue without it.`,
      });

      // Return a short response so the agent doesn't keep iterating:
      return "No tool found. Continuing conversation.";
    }

    console.log(`\n🛠️ Calling tool '${toolName}'...`);

    try {
      const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
      const finalArgs =
        typeof parsedArgs === "object" && parsedArgs !== null ? parsedArgs : {};

      // Call handleToolCall with the correct arguments
      const toolResult = await handleToolCall(
        {
          id: `call_${toolName}_${Date.now()}`,
          function: {
            name: toolName,
            arguments: finalArgs,
          },
        },
        clientForTool
      );

      return toolResult;
    } catch (error) {
      console.error(`❌ Error calling tool '${toolName}':`, error);
      return undefined;
    }
  }
  async executeTask(prompt: string): Promise<string> {
    this.messages.push({ role: "user", content: prompt });

    let iterationCount = 0;

    while (iterationCount < this.maxIterations) {
      try {
        const response: any = await ollama.chat({
          model: this.model,
          messages: this.messages,
          tools: convertToOpenaiTools(this.tools),
          stream: false,
          options: {
            temperature: 0.3,
          },
        });

        if (response.message.tool_calls) {
          const toolCalls =
            (response.message as ModelResponse).tool_calls || [];
          console.log(`Attempt ${iterationCount + 1}/${this.maxIterations}`);
          for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            const args = toolCall.function.arguments;
            console.log(
              `Tool '${toolName}' with args: ${JSON.stringify(args)}`
            );
            try {
              const clientForTool = this.toolMap.get(toolName);
              if (!clientForTool) {
                console.warn(
                  `⚠️ Tool '${toolName}' not found among available tools.`
                );
                continue;
              }
              // Call handleToolCall with correct arguments
              const toolResult = await handleToolCall(toolCall, clientForTool);
              if (toolResult) {
                console.log(`Tool '${toolName}' result: ${toolResult}`);
                this.messages.push({
                  role: "tool",
                  name: toolName,
                  content: toolResult,
                });
              } else {
                this.messages.push({
                  role: "assistant",
                  content: `I don't have a tool called '${toolName}'. Let's continue.`,
                });
              }
            } catch (error) {
              console.error(`Tool '${toolName}' error:`, error);
              this.messages.push({
                role: "assistant",
                content: `Error executing tool ${toolName}: ${error}`,
              });
            }
          }
          iterationCount++;
          console.log("messages: ", this.messages);
        } else {
          return response.message.content;
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
  toolMap: Map<string, Client>
): Promise<string> {
  const agent = await new OllamaAgent(model, toolMap, ollamaTools).initialize();
  return await agent.executeTask(initialPrompt);
}
