import * as logging from "console";
import * as path from "path";

import {
  convertToOpenaiTools,
  fetchTools,
  formatToolResponse,
} from "./utils/toolHelpers.js";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { callToolWithTimeout } from "./utils/toolUtils.js";
import { getServerPath } from "./server/serverPath.js";
import ollama from "ollama";

// Set up MCP client and connect to server
async function createMcpClient() {
  const serverPath = await getServerPath();
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath, path.resolve("./test-files")],
    env: Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => value !== undefined)
    ) as Record<string, string>,
  });

  const client = new Client(
    { name: "example-client", version: "1.0.0" },
    {
      capabilities: {
        tools: { call: true, list: true },
      },
    }
  );

  await client.connect(transport);
  return { client, transport };
}

async function runOllamaWithMcpTools(model: string) {
  // Initialize MCP client
  const { client, transport } = await createMcpClient();

  try {
    // Fetch tools from MCP
    const mcpTools = await fetchTools(client);
    if (!mcpTools) {
      console.log("No tools fetched from MCP.");
      return;
    }

    // Convert MCP tools to OpenAI-style functions that Ollama can understand
    const ollamaTools = convertToOpenaiTools(mcpTools);

    // Start conversation
    const messages = [
      {
        role: "system",
        content: `
          You are a helpful assistant with access to tools. 
          When asked to read files, you must use the tools available.
          
          Never alter the file path on your own; use the tools to confirm its existence and contents.
        `,
      },
      {
        role: "user",
        content: "Please read the file at `test-files/test.txt`",
      },
    ];

    console.log("Prompt:", messages[0].content);

    // Send initial request to Ollama with the tools available
    const response = await ollama.chat({
      model: model,
      messages: messages,
      tools: ollamaTools,
    });

    // Check if Ollama requested any tool calls
    if (response.message.tool_calls) {
      for (const tool of response.message.tool_calls) {
        const toolName = tool.function.name;
        const toolArgs = tool.function.arguments;

        console.log("Calling MCP tool:", toolName);
        console.log("Arguments:", toolArgs);

        // Call the MCP tool
        const toolResponse = await callToolWithTimeout(
          client,
          toolName,
          toolArgs
        );
        const formattedResponse = formatToolResponse(
          (toolResponse as any)?.content || []
        );
        console.log("Tool output:", formattedResponse);

        // Add the tool call message
        messages.push(response.message);

        // Add the tool response as a 'tool' message in the conversation
        messages.push({
          role: "tool",
          content: formattedResponse.toString(),
        });
      }
      // Log the messages with proper formatting
      console.log(
        `messages before final response: ${JSON.stringify(messages, null, 2)}`
      );

      // After processing tool calls, ask Ollama again for a final response
      const finalResponse = await ollama.chat({
        model: model,
        messages: messages,
      });
      console.log("Final response:", finalResponse.message.content);
    } else {
      console.log("No tool calls returned from model");
    }
    }
  } catch (error: any) {
    console.error("An error occurred:", error);
  } finally {
    // Cleanup MCP client
    await client.close();
    await transport.close();
  }
}

// Example: replace 'llama3.1:8b' with your desired model
runOllamaWithMcpTools("llama3.2:3b").catch((error) =>
  console.error("An error occurred:", error)
);
