import {
  ListResourcesResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Import schemas

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["node_modules/tsx/dist/cli.mjs", "server.ts"],
});

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

await client.connect(transport);
console.log("MCP Client connected.");

// List available resources
const resources = await client.request(
  { method: "resources/list" },
  ListResourcesResultSchema
);
console.log("Available resources:", resources);

// Read a specific resource
const resourceContent = await client.request(
  {
    method: "resources/read",
    params: {
      uri: "file://./example.txt",
    },
  },
  ReadResourceResultSchema
);
console.log("Resource content:", resourceContent);

// Exit after we're done with our requests
process.exit(0);
