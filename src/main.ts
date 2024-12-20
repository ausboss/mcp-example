// main.ts

import { convertToOpenaiTools } from "./utils/toolHelpers.js";
import { createMcpClient } from "./utils/mcpClient.js";
import { fetchTools } from "./utils/toolHelpers.js";
import { processOllamaToolCalls } from "./utils/ollamaHelpers.js";

async function runOllamaWithMcpTools(model: string, initialPrompt: string) {
  let client, transport;

  try {
    const mcpClientResult = await createMcpClient();
    client = mcpClientResult.client;
    transport = mcpClientResult.transport;

    const mcpTools = await fetchTools(client);
    // console.log("\n📚 Available MCP Tools:", JSON.stringify(mcpTools, null, 2));

    if (!mcpTools) {
      console.log("❌ No tools fetched from MCP.");
      return;
    }

    const ollamaTools = convertToOpenaiTools(mcpTools);

    console.log("\n🚀 Starting task with prompt:", initialPrompt);

    const result = await processOllamaToolCalls(
      model,
      initialPrompt,
      ollamaTools,
      client
    );

    if (result.endsWith("<END>")) {
      console.log("\n✅ Task completed successfully!");
      console.log("📄 Final result:", result.replace("<END>", ""));
    } else {
      console.log("\n⚠️ Task ended without proper completion marker");
    }
  } catch (error: any) {
    console.error("\n❌ An error occurred:", error);
  } finally {
    if (client) await client.close();
    if (transport) await transport.close();
    process.exit(0);
  }
}

// Open-ended prompt that lets the model decide how to solve the task
// const initialPrompt = `Tell me what the file in the test-file folder says`;
const initialPrompt = `create a file in the test-file folder with the content "Hello, world!"`;

runOllamaWithMcpTools("qwen2.5:latest", initialPrompt).catch((error) =>
  console.error("An error occurred:", error)
);
