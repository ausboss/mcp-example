// utils/toolHelpers.ts

import * as logging from "console"; // You can use a real logging library if you prefer

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { callToolWithTimeout } from "./toolUtils.js";

interface ParsedToolCall {
  id: string;
  function: string;
  arguments: any;
}

interface ConversationMessage {
  role: string;
  content: string | null;
  tool_calls?: any[];
  name?: string;
  tool_call_id?: string;
}

// Similar to `parse_tool_response` in Python
export function parseToolResponse(response: string): ParsedToolCall | null {
  const functionRegex = /<function=(\w+)>([\s\S]*?)<\/function>/;
  const match = response.match(functionRegex);

  if (match) {
    const [, functionName, argsString] = match;
    try {
      const args = JSON.parse(argsString);
      return {
        id: `call_${functionName}`,
        function: functionName,
        arguments: args,
      };
    } catch (error: any) {
      logging.debug(`Error parsing function arguments: ${error.message}`);
    }
  }
  return null;
}

/**
 * Handle a single tool call for different formats.
 * @param toolCall - The tool call object. It may have a `function` attribute or
 *                   be a parsed object with `function`.
 * @param conversationHistory - An array of conversation messages.
 * @param client - The MCP client for calling tools.
 */
export async function handleToolCall(
  toolCall: any,
  conversationHistory: ConversationMessage[],
  client: Client
): Promise<void> {
  let toolCallId: string | null = null;
  let toolName = "unknown_tool";
  let rawArguments: any = {};

  try {
    // Check if tool_call is object-style call (like OpenAI/Ollama) or needs parsing
    if (
      (typeof toolCall === "object" &&
        toolCall !== null &&
        "function" in toolCall) ||
      (toolCall?.function?.name && toolCall?.function?.arguments)
    ) {
      // For object-style calls
      if (toolCall.id && toolCall.function?.name) {
        toolCallId = toolCall.id;
        toolName = toolCall.function.name;
        rawArguments = toolCall.function.arguments;
      } else {
        toolCallId = toolCall["id"];
        toolName = toolCall["function"]["name"];
        rawArguments = toolCall["function"]["arguments"];
      }
    } else {
      // Parse from the last message (e.g., Llama format)
      const lastMessage =
        conversationHistory[conversationHistory.length - 1]?.content;
      if (!lastMessage) {
        logging.debug("No last message to parse tool call from.");
        return;
      }

      const parsedTool = parseToolResponse(lastMessage);
      if (!parsedTool) {
        logging.debug("Unable to parse tool call from message.");
        return;
      }

      toolCallId = parsedTool.id;
      toolName = parsedTool.function;
      rawArguments = parsedTool.arguments;
    }

    // Ensure arguments are parsed
    let toolArgs: any;
    if (typeof rawArguments === "string") {
      toolArgs = JSON.parse(rawArguments);
    } else {
      toolArgs = rawArguments;
    }

    // Call the tool
    const toolResponse = await callToolWithTimeout(client, toolName, toolArgs);

    // Format the tool response
    const formattedResponse = formatToolResponse(
      (toolResponse as any)?.content || []
    );
    logging.debug(`Tool '${toolName}' Response: ${formattedResponse}`);

    // Update conversation history with tool call
    conversationHistory.push({
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: toolCallId,
          type: "function",
          function: {
            name: toolName,
            arguments: toolArgs,
          },
        },
      ],
    });

    // Add tool response to conversation history
    conversationHistory.push({
      role: "tool",
      name: toolName,
      content: formattedResponse,
      tool_call_id: toolCallId || undefined,
    });
  } catch (error: any) {
    if (error.name === "SyntaxError") {
      logging.debug(
        `Error decoding arguments for tool '${toolName}': ${rawArguments}`
      );
    } else {
      logging.debug(`Error handling tool call '${toolName}': ${error.message}`);
    }
  }
}

/**
 * Format the response content from a tool.
 * Similar to `format_tool_response` in Python.
 */
export function formatToolResponse(responseContent: any): string {
  if (Array.isArray(responseContent)) {
    return responseContent
      .filter((item: any) => item && item.type === "text")
      .map((item: any) => item.text || "No content")
      .join("\n");
  }
  return String(responseContent);
}

/**
 * Fetch tools from the server. Similar to `fetch_tools` in Python.
 * @param client - The MCP client
 */
export async function fetchTools(client: Client): Promise<any[] | null> {
  logging.debug("Fetching tools for chat mode...");

  // request tool list from the MCP server
  const toolsResponse = await client.request(
    { method: "tools/list", params: {} },
    ListToolsResultSchema
  );
  const tools = toolsResponse?.tools || [];

  // check if tools are valid
  if (
    !Array.isArray(tools) ||
    !tools.every((tool) => typeof tool === "object")
  ) {
    logging.debug("Invalid tools format received.");
    return null;
  }

  return tools;
}

/**
 * Convert tools into OpenAI-compatible function definitions.
 * Similar to `convert_to_openai_tools` in Python.
 */
export function convertToOpenaiTools(tools: any[]): any[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.inputSchema || {},
    },
  }));
}
