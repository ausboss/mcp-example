// src/utils/mcpClient.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getServerConfig } from "../server/serverPath.js";

export async function createMcpClient(configPath: string, serverName: string) {
  const config = await getServerConfig(configPath, serverName);

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args || [],
    env:
      config.env ||
      (Object.fromEntries(
        Object.entries(process.env).filter(([, value]) => value !== undefined)
      ) as Record<string, string>),
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
