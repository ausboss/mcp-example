// main.ts

import { convertToOpenaiTools, fetchTools } from "./utils/toolHelpers";

import { createMcpClient } from "./utils/mcpClient";
import { processOllamaToolCalls } from "./utils/ollamaHelpers";

async function runOllamaWithMcpTools(model: string, prompt: string) {
  let client;
  let transport;

  try {
    const mcpResult = await createMcpClient("./mcp-config.json", "filesystem");
    client = mcpResult.client;
    transport = mcpResult.transport;

    const mcpTools = await fetchTools(client);

    if (!mcpTools) {
      console.log("❌ No tools fetched from MCP.");
      return;
    }

    const ollamaTools = convertToOpenaiTools(mcpTools);

    console.log("\n🚀 Starting task with prompt:", prompt);

    const processResult = await processOllamaToolCalls(
      model,
      prompt,
      ollamaTools,
      client
    );

    if (processResult.endsWith("<END>")) {
      console.log("\n✅ Task completed successfully!");
      console.log("📄 Final result:", processResult.replace("<END>", ""));
    } else {
      console.log("\n⚠️ Task ended without proper completion marker");
    }
  } catch (error) {
    console.error("\n❌ An error occurred:", error);
  } finally {
    if (client) await client.close();
    if (transport) await transport.close();
    process.exit(0);
  }
}

// Example usage:
runOllamaWithMcpTools(
  "qwen2.5:latest",
  "create a file with content 'Hello, world!'"
).catch((error) => console.error("An error occurred:", error));
