// ollamaAgent.ts

import { handleToolCall, parseToolResponse } from "./toolHelpers";

import { Client } from "@modelcontextprotocol/sdk/client/index";
import { ModelResponse } from "./types/ollamaTypes";
import { Ollama } from "ollama";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";
import { ollamaConfig } from "../config";

const ollama = new Ollama({ host: ollamaConfig.host });

export class OllamaAgent {
  private messages: any[] = [];
  private clients: Map<
    string,
    { client: Client; transport: StdioClientTransport }
  >;
  private model: string;
  private tools: any[];
  private maxIterations: number;

  constructor(
    model: string,
    clients: Map<string, { client: Client; transport: StdioClientTransport }>,
    tools: any[],
    maxIterations: number = 5
  ) {
    this.model = model;
    this.clients = clients;
    this.tools = tools;
    this.maxIterations = maxIterations;

    this.messages = [
      {
        role: "system",
        content: `You are an assistant that has access to various tools and can utilize them to accomplish tasks.

        Guidelines:
        - Use provided tools to gather necessary information or perform actions.
        - Pay close attention to the results of tool calls. The output from tools will be in messages with the role "tool".
        - If you need to interact with a file system, you can use tools to list directories and read/write files.
        - Carefully review the output of tools to understand the results and use that information to continue the conversation or complete the task.
        `,
      },
    ];
  }

  async initialize() {
    return this;
  }

  async executeTask(prompt: string): Promise<string> {
    this.messages.push({ role: "user", content: prompt });

    let iterationCount = 0;

    while (iterationCount < this.maxIterations) {
      try {
        const response: any = await ollama.chat({
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

        const toolCalls = (response.message as ModelResponse).tool_calls || [];

        if (toolCalls.length > 0) {
          console.log(`Attempt ${iterationCount + 1}/${this.maxIterations}`);
          for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            const args = toolCall.function.arguments; // Keep arguments as an object for handleToolCall
            console.log(
              `Tool '${toolName}' with args: ${JSON.stringify(args)}`
            );
            try {
              const clientToUse = this.findClientForTool(toolName);
              if (clientToUse) {
                const toolResult = await handleToolCall(
                  toolCall,
                  this.messages,
                  clientToUse
                );
                console.log(`Tool '${toolName}' result: ${toolResult}`);
                this.messages.push({
                  role: "tool",
                  name: toolName,
                  content: toolResult,
                  tool_call_id: toolCall.id,
                });
              } else {
                console.error(`No client found for tool: ${toolName}`);
                this.messages.push({
                  role: "assistant",
                  content: `Error: No MCP server available for tool '${toolName}'.`,
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
  // Helper function to find the first client that has a tool with the given name
  private findClientForTool(toolName: string): Client | undefined {
    // First validate the tool exists in our tools array
    const tool = this.tools.find((t) => {
      // Handle both function.name and direct name properties
      const name = t.function?.name || t.name;
      return name === toolName;
    });

    if (!tool) {
      console.log(`❌ Tool '${toolName}' not found in available tools.`);
      return undefined;
    }

    // Get the server name from the tool definition
    const serverName = tool.mcp_server || tool.server;
    if (!serverName) {
      console.log(`❌ No server specified for tool '${toolName}'.`);
      return undefined;
    }

    // Get the client for this server
    const clientData = this.clients.get(serverName);
    if (!clientData) {
      console.log(`❌ No client found for server '${serverName}'.`);
      return undefined;
    }

    console.log(
      `✅ Found client for tool '${toolName}' on server: ${serverName}`
    );
    return clientData.client;
  }
}

export async function runOllamaAgent(
  model: string,
  initialPrompt: string,
  ollamaTools: any[],
  clients: Map<string, { client: Client; transport: StdioClientTransport }> // Expect the Map
): Promise<string> {
  const agent = new OllamaAgent(model, clients, ollamaTools); // Pass the Map
  return await agent.executeTask(initialPrompt);
}
