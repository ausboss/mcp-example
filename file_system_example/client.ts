import * as fs from "fs";
import * as path from "path";

import {
  ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Helper function to find node_modules path
async function getServerPath() {
  // Try local node_modules first
  const localPath = path.join(
    process.cwd(),
    "node_modules",
    "@modelcontextprotocol",
    "server-filesystem",
    "dist",
    "index.js"
  );

  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // Fall back to global npm location
  const globalPath = path.join(
    process.env.APPDATA || "",
    "npm",
    "node_modules",
    "@modelcontextprotocol",
    "server-filesystem",
    "dist",
    "index.js"
  );

  if (fs.existsSync(globalPath)) {
    return globalPath;
  }

  throw new Error(
    "Could not find @modelcontextprotocol/server-filesystem in local or global node_modules"
  );
}

async function main() {
  let transport;
  let client;

  try {
    // Create test directory if it doesn't exist
    const testDir = path.resolve("./test-files");
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const serverPath = await getServerPath();
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverPath, path.resolve("./test-files")],
      env: Object.fromEntries(
        Object.entries(process.env).filter(
          ([key, value]) => value !== undefined
        )
      ) as Record<string, string>,
    });

    client = new Client(
      {
        name: "example-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {
            call: true,
            list: true
          }
        }
      }
    );

    console.log("Connecting to filesystem server...");
    await client.connect(transport);
    console.log("Connected to filesystem server");

    // List available tools
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema
    );
    console.log("Available tools:", toolsResponse);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    if (transport) {
      await transport.close();
    }
  }
}

main().catch(console.error);