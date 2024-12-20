import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export function createClient(name: string, version: string): Client {
  return new Client(
    {
      name,
      version,
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
}

export async function connectClient(
  client: Client,
  transport: StdioClientTransport
): Promise<void> {
  console.log("Connecting to filesystem server...");
  await client.connect(transport);
}
