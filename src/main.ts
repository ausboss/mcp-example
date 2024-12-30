// main.ts

import * as readline from "node:readline/promises";

import { convertToOpenaiTools, fetchTools } from "./utils/toolHelpers";
import { stdin as input, stdout as output } from "node:process";

import { Client } from "@modelcontextprotocol/sdk/client/index";
import { OllamaAgent } from "./utils/ollamaAgent";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";
import { createMcpClients } from "./utils/mcpClient";
import { ollamaConfig } from "./config";

async function runInteractiveOllama(model: string) {
  let clients:
    | Map<string, { client: Client; transport: StdioClientTransport }>
    | undefined;

  try {
    // Create all MCP clients
    clients = await createMcpClients();

    // Collect all tools from all servers and create a tool map
    const toolMap: Map<string, Client> = new Map();
    const allTools: any[] = [];

    if (clients) {
      for (const [serverName, { client }] of clients) {
        console.log(`\n📚 Fetching MCP tools for ${serverName}...`);
        const mcpTools = await fetchTools(client);

        if (mcpTools && mcpTools.length > 0) {
          const ollamaTools = convertToOpenaiTools(mcpTools);

          // Log the converted tools for debugging
          console.log(
            `Tools from ${serverName}:`,
            ollamaTools.map((t) => t.name)
          );

          ollamaTools.forEach((tool) => {
            if (tool && tool.name) {
              allTools.push(tool);
              toolMap.set(tool.name, client);
            }
          });
        } else {
          console.log(`❌ No tools fetched from MCP server ${serverName}.`);
        }
      }
    }

    if (allTools.length === 0) {
      console.log("❌ No tools fetched from any MCP server.");
      return;
    }

    // Log the final tool configuration
    // console.log("\n🔧 Available tools:");
    // allTools.forEach((tool) => {
    //   console.log(
    //     `- ${tool.name}: ${tool.description}` +
    //       (tool.arguments ? ` (${Object.keys(tool.arguments).join(", ")})` : "")
    //   );
    // });

    // Create agent with validated tools
    const agent = await new OllamaAgent(model, toolMap, allTools).initialize();

    // Create readline interface
    const rl = readline.createInterface({ input, output });

    console.log(`\n🚀 Chatting with Ollama model: ${model}`);
    console.log("Type 'exit' to quit.\n");

    while (true) {
      const userInput = await rl.question("You: ");

      if (userInput.toLowerCase() === "exit") {
        console.log("Goodbye!");
        break;
      }

      const result = await agent.executeTask(userInput);
      console.log(`Assistant: ${result}`);
    }

    rl.close();
  } catch (error) {
    console.error("\n❌ An error occurred:", error);
  } finally {
    if (clients) {
      for (const { client, transport } of clients.values()) {
        await client.close();
        await transport.close();
      }
    }
  }
}

const model = ollamaConfig.model;
runInteractiveOllama(model).catch(console.error);
