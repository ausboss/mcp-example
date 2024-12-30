import { OllamaMessage, OllamaToolCall } from "./utils/types/ollamaTypes.js";
import {
  convertToOpenaiTools,
  fetchTools,
  formatToolResponse,
} from "./utils/toolHelpers.js";

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Ollama } from "ollama";
import { createMcpClients } from "./utils/mcpClient.js";
import { ollamaConfig } from "./config";
import readline from "readline";

// Create readline interface for user input
function createInputInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Promise-based user input function
function getUserInput(rl: readline.Interface): Promise<string> {
  return new Promise((resolve) => {
    rl.question("You: ", (input) => {
      resolve(input);
    });
  });
}

async function setupTools() {
  // Create MCP clients
  const clients = await createMcpClients();
  if (!clients || clients.size === 0) {
    throw new Error("No MCP clients loaded.");
  }

  // Tool map for execution
  const toolMap = new Map<string, Client>();
  let allMcpTools: any[] = [];

  // Fetch tools from all clients
  for (const [serverName, { client }] of clients.entries()) {
    const mcpTools = await fetchTools(client);
    if (mcpTools) {
      allMcpTools = allMcpTools.concat(mcpTools);
      mcpTools.forEach((tool) => {
        toolMap.set(tool.name, client);
      });
    }
  }

  // Convert to OpenAI format for Ollama
  const openaiTools = convertToOpenaiTools(allMcpTools);

  // Helper function to call tools
  const callAnyTool = async (
    toolName: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult | undefined> => {
    const clientForTool = toolMap.get(toolName);
    if (!clientForTool) {
      console.warn(`Tool '${toolName}' not found among available tools.`);
      return undefined;
    }

    try {
      // Create the properly typed tool call object
      const toolCall = {
        name: toolName,
        arguments: args,
      };

      const result = await clientForTool.callTool(toolCall);
      return result as CallToolResult;
    } catch (error) {
      console.error(`Error calling tool '${toolName}':`, error);
      return undefined;
    }
  };

  return { tools: openaiTools, callAnyTool, clients };
}

async function chat() {
  const { model, host } = ollamaConfig;
  const ollama = new Ollama({ host });
  const { tools, callAnyTool, clients } = await setupTools();
  console.log("tools:", tools);
  let messages: OllamaMessage[] = [];

  // Create readline interface
  const rl = createInputInterface();

  try {
    console.log('Chat started. Type "exit" to end the conversation.');

    // Main chat loop
    while (true) {
      // Get user input
      const userInput = await getUserInput(rl);
      if (userInput.toLowerCase() === "exit") break;

      // Add user message to history
      messages.push({ role: "user", content: userInput });

      // Get model response using Ollama client
      const response = await ollama.chat({
        model,
        messages: messages as any[], // Type assertion needed due to Ollama's type limitations
        tools,
      });

      // Add model's response to history
      messages.push(response.message as OllamaMessage);

      // If there are tool calls, handle them
      if (
        response.message.tool_calls &&
        response.message.tool_calls.length > 0
      ) {
        console.log("Model is using tools to help answer...");

        // Handle each tool call
        for (const toolCall of response.message.tool_calls) {
          let args: Record<string, unknown>;

          if (typeof toolCall.function.arguments === "string") {
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch (e) {
              console.error("Failed to parse tool arguments:", e);
              args = { value: toolCall.function.arguments };
            }
          } else {
            args = toolCall.function.arguments;
          }

          const result = await callAnyTool(toolCall.function.name, args);

          if (result) {
            // Add tool result to message history
            messages.push({
              role: "tool",
              content: formatToolResponse(result.content),
              tool_call_id: toolCall.function.name, // Use function name as id since Ollama doesn't provide an id
            });
          }
        }

        // Get final response from model with tool results
        const finalResponse = await ollama.chat({
          model,
          messages: messages as any[], // Type assertion needed due to Ollama's type limitations
        });

        messages.push(finalResponse.message as OllamaMessage);
        console.log("Assistant:", finalResponse.message.content);
      } else {
        // Model responded without using tools
        console.log("Assistant:", response.message.content);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Clean up
    rl.close();
    if (clients) {
      for (const { client, transport } of clients.values()) {
        await client.close();
        await transport.close();
      }
    }
  }
}

// Start the chat
chat().catch(console.error);
