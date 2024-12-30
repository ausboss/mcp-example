// src/demo.ts

import {
  convertToOpenaiTools,
  fetchTools,
  formatToolResponse,
} from "./utils/toolHelpers.js";

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { callToolWithTimeout } from "./utils/toolUtils.js";
import { createMcpClients } from "./utils/mcpClient.js";

async function demonstrateMcpFunctionality() {
  let clients:
    | Map<string, { client: Client; transport: StdioClientTransport }>
    | undefined;
  let allMcpTools: any[] = [];
  const toolMap: Map<string, Client> = new Map(); // Map tool name to client

  try {
    console.log("\n🚀 Creating MCP clients...");
    clients = await createMcpClients();

    if (!clients || clients.size === 0) {
      console.log("❌ No MCP clients loaded.");
      return;
    }

    // Fetch tools from all clients and combine them
    for (const [serverName, { client }] of clients.entries()) {
      console.log(`\n📚 Fetching MCP tools for ${serverName}...`);
      const mcpTools = await fetchTools(client);
      if (mcpTools) {
        allMcpTools = allMcpTools.concat(mcpTools);
        mcpTools.forEach((tool) => {
          toolMap.set(tool.name, client); // Map tool name to its client
        });
      } else {
        console.log(`❌ No tools fetched from MCP server ${serverName}.`);
      }
    }

    // Display all combined tools in OpenAI format
    const openaiTools = convertToOpenaiTools(allMcpTools);
    console.log("\n✨ All combined tools in OpenAI format:");
    console.log(JSON.stringify(openaiTools, null, 2));

    // Helper function to call a tool, finding the right client
    const callAnyTool = async (
      toolName: string,
      args: any
    ): Promise<CallToolResult | undefined> => {
      const clientForTool = toolMap.get(toolName);
      if (clientForTool) {
        console.log(`\n🛠️ Calling tool '${toolName}'...`);
        try {
          return (await callToolWithTimeout(
            clientForTool,
            toolName,
            args
          )) as CallToolResult;
        } catch (error) {
          console.error(`❌ Error calling tool '${toolName}':`, error);
          return undefined;
        }
      } else {
        console.warn(`⚠️ Tool '${toolName}' not found among available tools.`);
        return undefined;
      }
    };

    // Example interactions - these will now use the combined set of tools
    console.log("\n📂 Listing allowed directories (if available)...");
    const allowedDirsResponse = await callAnyTool(
      "list_allowed_directories",
      {}
    );
    if (allowedDirsResponse) {
      console.log(
        "Allowed directories:",
        formatToolResponse(allowedDirsResponse.content)
      );
    }

    console.log(
      "\n📂 Listing contents of test-files directory (if available)..."
    );
    const dirContents = await callAnyTool("list_directory", {
      path: "test-files",
    });
    if (dirContents) {
      console.log(
        "Directory contents:",
        formatToolResponse(dirContents.content)
      );
    }

    console.log("\n📄 Reading test.txt (if available)...");
    const fileContent = await callAnyTool("read_file", {
      path: "test-files/test.txt",
    });
    if (fileContent) {
      console.log("File content:", formatToolResponse(fileContent.content));
    }

    // Visit a webpage and get the content
    console.log("\n🌐 Visiting example.com and getting content...");
    const webpageContent = await callAnyTool("visit_page", {
      url: "https://ollama.com/blog/tool-support",
      takeScreenshot: false,
    });
    if (webpageContent) {
      console.log(
        "Webpage content:",
        formatToolResponse(webpageContent.content)
      );
    }
  } catch (error: unknown) {
    console.error(
      "\n❌ An error occurred during demonstration:",
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    // Clean up all clients
    if (clients) {
      for (const { client, transport } of clients.values()) {
        await client.close();
        await transport.close();
      }
    }
    process.exit(0);
  }
}

demonstrateMcpFunctionality().catch((error) =>
  console.error("Fatal error during demonstration setup:", error)
);
