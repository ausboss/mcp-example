// src/utils/mcpClient.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getDefaultEnvironment } from "./environment.js";
import { getServerConfig } from "../server/serverPath.js";
import { resolveCommand } from "./commandResolver.js";

export async function createMcpClient(configPath: string, serverName: string) {
  const config = await getServerConfig(configPath, serverName);

  // Resolve the command to ensure it exists and is executable
  const resolvedCommand = await resolveCommand(config.command);

  const transport = new StdioClientTransport({
    command: resolvedCommand,
    args: config.args || [],
    env:
      (config.env as Record<string, string> | undefined) ||
      getDefaultEnvironment(),
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
