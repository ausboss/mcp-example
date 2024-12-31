// src/demo.ts

import {
  convertToOpenaiTools,
  formatToolResponse,
} from "./utils/toolFormatters";

import { ToolManager } from "./lib/ToolManager";
import { fetchTools } from "./utils/toolUtils";

async function demonstrateMcpFunctionality() {
  let allMcpTools: any[] = [];
  let toolManager: ToolManager | undefined;

  try {
    // Create and initialize ToolManager
    console.log("\n🚀 Creating MCP clients and initializing ToolManager...");
    toolManager = new ToolManager();
    await toolManager.initialize();

    // Get the clients from ToolManager's initialization
    const clients = toolManager.getClients();
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
      } else {
        console.log(`❌ No tools fetched from MCP server ${serverName}.`);
      }
    }

    // Display all combined tools in OpenAI format
    const openaiTools = convertToOpenaiTools(allMcpTools);
    console.log("\n✨ All combined tools in OpenAI format:");
    console.log(JSON.stringify(openaiTools, null, 2));

    // Example interactions using ToolManager
    console.log("\n📂 Listing allowed directories (if available)...");
    const allowedDirsResponse = await toolManager.callTool(
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
      "\n📂 Listing contents of test-directory directory (if available)..."
    );
    const dirContents = await toolManager.callTool("list_directory", {
      path: "test-directory",
    });
    if (dirContents) {
      console.log(
        "Directory contents:",
        formatToolResponse(dirContents.content)
      );
    }

    console.log("\n📄 Reading test.txt (if available)...");
    const fileContent = await toolManager.callTool("read_file", {
      path: "test-directory/test.txt",
    });
    if (fileContent) {
      console.log("File content:", formatToolResponse(fileContent.content));
    }

    // Visit a webpage and get the content
    console.log("\n🌐 Visiting example.com and getting content...");
    const webpageContent = await toolManager.callTool("visit_page", {
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
    // Clean up using ToolManager's cleanup
    if (toolManager) {
      await toolManager.cleanup();
    }
    process.exit(0);
  }
}

demonstrateMcpFunctionality().catch((error) =>
  console.error("Fatal error during demonstration setup:", error)
);
