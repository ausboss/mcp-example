// utils/toolTypes.ts
// Types for handling tool definitions and executions in the MCP ecosystem

import { Client } from "@modelcontextprotocol/sdk/client/index";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Represents a tool call request from the LLM
 */
export interface ToolCall {
  id?: string;
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * Represents an MCP client connection with its transport
 */
export interface McpClientEntry {
  client: Client;
  transport: StdioClientTransport;
}

/**
 * Describes a parameter in a tool's definition
 */
export interface ToolParameterInfo {
  type: string;
  description?: string;
  items?: {
    type: string;
    properties?: Record<string, ToolParameterInfo>;
  };
  properties?: Record<string, ToolParameterInfo>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

/**
 * Complete tool definition following JSON Schema structure
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameterInfo>;
    required: string[];
    additionalProperties: boolean;
  };
}
