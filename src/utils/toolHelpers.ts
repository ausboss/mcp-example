// utils/toolHelpers.ts

import * as logging from "console";

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

export async function handleToolCall(
  toolCall: any,
  client: Client // Remove conversationHistory here
): Promise<string> {
  let toolCallId: string | null = null;
  let toolName = "unknown_tool";
  let rawArguments: any = {};

  try {
    if (
      (typeof toolCall === "object" &&
        toolCall !== null &&
        "function" in toolCall) ||
      (toolCall?.function?.name && toolCall?.function?.arguments)
    ) {
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
      // This part might still be needed if the tool call info comes from the last message
      // Consider if this parsing logic should be moved to the OllamaAgent as well
      // for better consistency.
      console.warn(
        "Parsing tool call from conversation history is deprecated here. Ensure toolCall object is passed correctly."
      );
      return ""; // Or throw an error to indicate incorrect usage
    }

    let toolArgs: any = rawArguments;
    if (typeof rawArguments === "string") {
      try {
        toolArgs = JSON.parse(rawArguments);
      } catch (error: any) {
        logging.debug(
          `Error parsing arguments string: ${error.message}`,
          rawArguments
        );
        throw error;
      }
    }

    const toolResponse = await callToolWithTimeout(client, toolName, toolArgs);
    const formattedResponse = formatToolResponse(
      (toolResponse as any)?.content || []
    );

    // Remove the message push from here
    // The OllamaAgent.executeTask will handle adding the "tool" message

    return formattedResponse;
  } catch (error: any) {
    if (error.name === "SyntaxError") {
      logging.debug(
        `Error decoding arguments for tool '${toolName}': ${rawArguments}`
      );
    } else {
      logging.debug(`Error handling tool call '${toolName}': ${error.message}`);
    }
    throw error;
  }
}

export function formatToolResponse(responseContent: any): string {
  if (Array.isArray(responseContent)) {
    return responseContent
      .filter((item: any) => item && item.type === "text")
      .map((item: any) => item.text || "No content")
      .join("\n");
  }
  return String(responseContent);
}

export async function fetchTools(client: Client): Promise<any[] | null> {
  try {
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema
    );
    const tools = toolsResponse?.tools || [];

    if (
      !Array.isArray(tools) ||
      !tools.every((tool) => typeof tool === "object")
    ) {
      logging.debug("Invalid tools format received.");
      return null;
    }

    return tools;
  } catch (error) {
    console.error("Error fetching tools:", error);
    return null;
  }
}

export function convertToOpenaiTools(tools: any[]): any[] {
  return tools
    .map((tool) => {
      // Ensure tool has required properties
      if (!tool.name) {
        console.warn("Tool missing name:", tool);
        return null;
      }

      return {
        name: tool.name,
        description: tool.description || "",
        parameters: {
          type: "object",
          properties: tool.inputSchema?.properties || {},
          required: tool.inputSchema?.required || [],
        },
      };
    })
    .filter(Boolean); // Remove any null entries
}
