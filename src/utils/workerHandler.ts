// workerHandler.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ModelResponse } from "./types/ollamaTypes.js";
import { callToolWithTimeout } from "./toolUtils.js";
import { formatToolResponse } from "./toolHelpers.js";
import ollama from "ollama";

export async function handleWorkerResponse(
  model: string,
  workerMessages: any[],
  tools: any[],
  client: Client
): Promise<ModelResponse> {
  const response = await ollama.chat({
    model: model,
    messages: [
      ...workerMessages,
      {
        role: "system",
        content: `Do not assume file namess unless you were specifically given a full path to a file.        
Before trying to read any files:
1. ALWAYS use list_directory first to check what files actually exist
2. Use the exact filenames from list_directory results
3. Build complete file paths carefully based on directory contents

Example workflow:
1. list_directory to see available files
2. Check the results to find the correct file
3. Only then attempt to read_file with the verified path`,
      },
    ],
    tools: tools,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 1000,
    },
  });

  if (response.message.tool_calls?.length) {
    console.log(`Processing ${response.message.tool_calls.length} tool calls`);

    // Process tool calls sequentially
    for (const toolCall of response.message.tool_calls) {
      try {
        console.log(`Executing tool: ${toolCall.function.name}`);

        // Add tool call to conversation
        workerMessages.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        });

        // Execute tool
        const toolResponse = await callToolWithTimeout(
          client,
          toolCall.function.name,
          toolCall.function.arguments
        );

        // Add tool response
        const formattedResponse = formatToolResponse(
          toolResponse?.content || []
        );
        console.log("Tool response:", formattedResponse);

        workerMessages.push({
          role: "tool",
          name: toolCall.function.name,
          content: formattedResponse,
          tool_call_id: toolCall.id,
        });

        // If tool execution failed, provide guidance
        if (formattedResponse.includes("ENOENT")) {
          workerMessages.push({
            role: "system",
            content: `The file or directory was not found. Please:
1. Use list_directory to check what files and folders exist
2. Build the path based on actual directory contents
3. Try again with the correct path`,
          });
        }
      } catch (error) {
        console.error(`Tool execution failed:`, error);
        // Add guidance message before throwing the error
        workerMessages.push({
          role: "system",
          content: `Tool execution failed. Remember to:
1. Always use list_directory first to check what exists
2. Use exact names from directory listing
3. Build complete paths carefully`,
        });
        throw error;
      }
    }

    // Get final response after tool usage
    console.log("Getting final response after tool usage");
    const finalResponse = await ollama.chat({
      model: model,
      messages: workerMessages,
    });

    return finalResponse.message;
  }

  return response.message;
}
