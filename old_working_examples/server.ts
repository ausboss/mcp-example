import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "path";
import { readFile } from "fs/promises";

const server = new Server(
  {
    name: "example-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "file://./example.txt",
        name: "Example Resource",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    const relativePath = request.params.uri.replace("file://", "");
    const filePath = join(process.cwd(), relativePath.replace(/^\.\//, ""));
    const content = await readFile(filePath, "utf-8");
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/plain",
          text: content,
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Resource not found: ${error.message}`);
    } else {
      throw new Error("Resource not found: Unknown error");
    }
  }
});
const transport = new StdioServerTransport();
await server.connect(transport);

console.log("MCP Server started.");
