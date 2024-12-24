// run this with npx `tsx .\src\demo.ts` to see the functions in

import {
  convertToOpenaiTools,
  fetchTools,
  formatToolResponse,
} from "./utils/toolHelpers.js";

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { callToolWithTimeout } from "./utils/toolUtils.js";
import { createMcpClient } from "./utils/mcpClient.js";

async function demonstrateMcpFunctionality() {
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;

  try {
    console.log("\n🚀 Creating MCP client...");
    const mcpResult = await createMcpClient("filesystem");
    client = mcpResult.client;
    transport = mcpResult.transport;

    // Fetch and display tools as OpenAI format
    console.log("\n📚 Fetching MCP tools...");
    const mcpTools = await fetchTools(client);
    if (!mcpTools) {
      console.log("❌ No tools fetched from MCP.");
      return;
    }
    const openaiTools = convertToOpenaiTools(mcpTools);
    console.log("\nTools in OpenAI format:");
    console.log(JSON.stringify(openaiTools, null, 2));

    // List allowed directories
    console.log("\n📂 Listing allowed directories...");
    const allowedDirsResponse = (await callToolWithTimeout(
      client,
      "list_allowed_directories",
      {}
    )) as CallToolResult;
    console.log(
      "Allowed directories:",
      formatToolResponse(allowedDirsResponse.content)
    );

    // List contents of test-files directory
    console.log("\n📂 Listing contents of test-files directory...");
    const dirContents = (await callToolWithTimeout(client, "list_directory", {
      path: "test-files",
    })) as CallToolResult;
    console.log("Directory contents:", formatToolResponse(dirContents.content));

    // Read test.txt file
    console.log("\n📄 Reading test.txt...");
    const fileContent = (await callToolWithTimeout(client, "read_file", {
      path: "test-files/test.txt",
    })) as CallToolResult;
    console.log("File content:", formatToolResponse(fileContent.content));
  } catch (error: unknown) {
    console.error(
      "\n❌ An error occurred:",
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    // Clean up
    if (client) await client.close();
    if (transport) await transport.close();
    process.exit(0);
  }
}

// Run the demonstration
demonstrateMcpFunctionality().catch((error) =>
  console.error("Fatal error:", error)
);
