// utils/mcpClient.ts

import * as path from "path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getServerPath } from "../server/serverPath.js"; // Assuming serverPath.ts remains in the server directory

export async function createMcpClient() {
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
