// utils/toolTypes.ts

import { Client } from "@modelcontextprotocol/sdk/client/index";

export interface ToolCall {
  id?: string;
  function: {
    name: string;
    arguments: any;
  };
}

export interface McpClientEntry {
  client: Client;
  transport: any;
}

export interface ToolParameterInfo {
  type: string;
  description?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    properties: Record<string, ToolParameterInfo>;
    required: string[];
  };
}
