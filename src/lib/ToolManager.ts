import { convertToOpenaiTools, fetchTools } from "../utils/toolHelpers";
import { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { Client } from "@modelcontextprotocol/sdk/client/index";
import { createMcpClients } from "../utils/mcpClient";

// Define interface for client structure
interface McpClientEntry {
  client: Client;
  transport: any; // Type could be made more specific based on transport type
}

interface ToolParameterInfo {
  type: string;
  description?: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    properties: Record<string, ToolParameterInfo>;
    required: string[];
  }
}

export class ToolManager {
  private toolMap: Map<string, Client> = new Map();
  private clients: Map<string, McpClientEntry> = new Map();
  public tools: any[] = [];

  async initialize() {
    const newClients = await createMcpClients();
    if (!newClients || newClients.size === 0) {
      throw new Error("No MCP clients loaded.");
    }

    this.clients = newClients;
    let allMcpTools: any[] = [];

    // Fetch tools from all clients
    for (const [serverName, { client }] of this.clients.entries()) {
      const mcpTools = await fetchTools(client);
      if (mcpTools) {
        allMcpTools = allMcpTools.concat(mcpTools);
        mcpTools.forEach((tool) => {
          this.toolMap.set(tool.name, client);
        });
      }
    }

    // Convert to OpenAI format for Ollama
    this.tools = convertToOpenaiTools(allMcpTools);
    return this.tools;
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult | undefined> {
    const clientForTool = this.toolMap.get(toolName);
    if (!clientForTool) {
      console.warn(`Tool '${toolName}' not found among available tools.`);
      return undefined;
    }

    try {
      const toolCall = {
        name: toolName,
        arguments: args,
      };

      return (await clientForTool.callTool(toolCall)) as CallToolResult;
    } catch (error) {
      console.error(`Error calling tool '${toolName}':`, error);
      return undefined;
    }
  }

  // Get parameter info for a specific tool
  getToolParameterInfo(toolName: string): ToolDefinition | undefined {
    return this.tools.find(t => t.name === toolName);
  }

  // Suggest parameter mapping for provided arguments
  suggestParameterMapping(toolName: string, providedArgs: Record<string, unknown>): Record<string, string> {
    const tool = this.getToolParameterInfo(toolName);
    if (!tool) return {};

    const mapping: Record<string, string> = {};
    const expectedParams = Object.keys(tool.parameters.properties);
    
    for (const providedParam of Object.keys(providedArgs)) {
      if (expectedParams.includes(providedParam)) {
        continue; // Parameter is already correct
      }

      // Find most similar parameter name
      const mostSimilar = this.findMostSimilarParameter(providedParam, expectedParams);
      if (mostSimilar) {
        mapping[providedParam] = mostSimilar;
      }
    }

    return mapping;
  }

  private findMostSimilarParameter(provided: string, expected: string[]): string | null {
    // Simple string similarity check
    const normalized = provided.toLowerCase().replace(/[_-]/g, '');
    for (const param of expected) {
      const normalizedExpected = param.toLowerCase().replace(/[_-]/g, '');
      if (normalizedExpected.includes(normalized) || normalized.includes(normalizedExpected)) {
        return param;
      }
    }
    return null;
  }

  async cleanup() {
    if (this.clients) {
      for (const { client, transport } of this.clients.values()) {
        await client.close();
        await transport.close();
      }
    }
  }
}