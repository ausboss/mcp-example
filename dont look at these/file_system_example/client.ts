import * as fs from "fs";
import * as path from "path";

import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ChildProcess } from "child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Add type for transport's childProcess
declare module "@modelcontextprotocol/sdk/client/stdio.js" {
  interface StdioClientTransport {
    childProcess: ChildProcess;
  }
}

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

// Helper function to handle tool calls with timeout
async function callToolWithTimeout(
  client: Client,
  name: string,
  args: any,
  timeoutMs = 30000
) {
  const toolCallPromise = client.request(
    {
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    },
    // Assuming you have a schema for the tool call result
    CallToolResultSchema
  );

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`Tool call timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    const result = await Promise.race([toolCallPromise, timeoutPromise]);
    return result;
  } catch (error) {
    throw new Error(
      `Tool call failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function main() {
  let transport: StdioClientTransport | undefined;
  let client: Client | undefined;
  let serverProcess: ChildProcess | undefined;

  // Handle cleanup on SIGINT (Ctrl+C)
  process.on("SIGINT", async () => {
    console.log("\nReceived SIGINT. Cleaning up...");
    if (client) {
      await client.close();
    }
    if (transport) {
      await transport.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(0);
  });

  try {
    // Create test directory if it doesn't exist
    const testDir = path.resolve("./test-files");
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create a test file with some content
    const testFile = path.join(testDir, "test.txt");
    const testContent =
      "Hello from MCP filesystem server with timestamps:\n" +
      `Created at: ${new Date().toISOString()}`;
    fs.writeFileSync(testFile, testContent);
    console.log("Created test file:", testFile);

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

    // Store reference to the server process
    serverProcess = transport.childProcess;

    // Handle server process events
    if (serverProcess) {
      serverProcess.on("error", (error: Error) => {
        console.error("Server process error:", error);
      });

      serverProcess.on("exit", (code: number | null) => {
        console.log("Server process exited with code:", code);
        process.exit(0);
      });
    }

    client = new Client(
      {
        name: "example-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {
            call: true,
            list: true,
          },
        },
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

    // Test the read_file tool
    console.log("\nTesting read_file tool...");
    const readFileResult = (await callToolWithTimeout(client, "read_file", {
      path: testFile,
    })) as { content: any[] };

    // Extract text content from the response
    let content = "";
    if (readFileResult.content && Array.isArray(readFileResult.content)) {
      content = (readFileResult as { content: any[] }).content
        .filter((item: any) => item.type === "text")
        .map((item: any) => item.text)
        .join("\n");
    }

    console.log("\nFile content:", content);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    console.log("Cleaning up...");
    if (client) {
      await client.close();
    }
    if (transport) {
      await transport.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(0);
  }
}

main().catch(console.error);
