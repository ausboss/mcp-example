import * as readline from "node:readline/promises";

import { convertToOpenaiTools, fetchTools } from "./utils/toolHelpers";
import { stdin as input, stdout as output } from "node:process";

import { OllamaAgent } from "./utils/ollamaAgent";
import { createMcpClient } from "./utils/mcpClient";
import { ollamaConfig } from "./config/index";

async function runInteractiveOllama(model: string) {
  let client;
  let transport;

  try {
    const mcpResult = await createMcpClient("filesystem");
    client = mcpResult.client;
    transport = mcpResult.transport;

    const mcpTools = await fetchTools(client);

    if (!mcpTools) {
      console.log("❌ No tools fetched from MCP.");
      return;
    }

    const ollamaTools = convertToOpenaiTools(mcpTools);
    const agent = await new OllamaAgent(
      model,
      client,
      ollamaTools
    ).initialize();

    const rl = readline.createInterface({ input, output });

    console.log(`\n🚀 Chatting with Ollama model: ${model}`); // More natural wording
    console.log("Type 'exit' to quit.\n");

    while (true) {
      const userInput = await rl.question("You: ");

      if (userInput.toLowerCase() === "exit") {
        console.log("Goodbye!");
        break;
      }
      const result = await agent.executeTask(userInput);
      console.log(`Assistant: ${result}`); // Just print the result
    }

    rl.close();
  } catch (error) {
    console.error("\n❌ An error occurred:", error);
  } finally {
    if (client) await client.close();
    if (transport) await transport.close();
    process.exit(0);
  }
}

const model = ollamaConfig.model;

runInteractiveOllama(model).catch(console.error);
