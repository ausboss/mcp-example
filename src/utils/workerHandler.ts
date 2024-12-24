// workerHandler.ts

import { Client } from "@modelcontextprotocol/sdk/client/index";
import { ModelResponse } from "./types/ollamaTypes";
import { handleToolCall } from "./toolHelpers";
import ollama from "ollama";
import { parseToolResponse } from "./toolHelpers";

export async function handleWorkerResponse(
  model: string,
  workerMessages: any[],
  tools: any[],
  client: Client
): Promise<ModelResponse> {
  try {
    console.log("Sending request to Ollama...");
    const response = await ollama.chat({
      model: model,
      messages: [
        ...workerMessages,
        {
          role: "system",
          content: `You are an assistant that helps with file operations. Before trying to read any files:
                    1. ALWAYS use list_directory first to check what files exist
                    2. Use the exact filenames from list_directory results
                    3. Build complete file paths carefully based on directory contents`,
        },
      ],
      tools: tools,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 1000,
      },
    });

    console.log("Received response from Ollama:", response.message);

    const toolCalls = response.message.tool_calls || [];

    // Use parseToolResponse as a fallback for inline tool calls
    if (response.message.content) {
      const parsedTool = parseToolResponse(response.message.content);
      if (parsedTool) {
        toolCalls.push({
          function: {
            name: parsedTool.function,
            arguments: parsedTool.arguments,
          },
        });
      }
    }

    if (toolCalls.length > 0) {
      console.log(`Processing ${toolCalls.length} tool calls`);
      for (const toolCall of toolCalls) {
        try {
          await handleToolCall(toolCall, workerMessages, client);
        } catch (error) {
          console.error("Tool execution error:", error);
          throw error;
        }
      }

      console.log("Getting final response after tool usage...");
      const finalResponse = await ollama.chat({
        model: model,
        messages: workerMessages,
      });

      if (!finalResponse.message || !finalResponse.message.content) {
        throw new Error("No final response content from Ollama");
      }

      return {
        content: finalResponse.message.content,
        tool_calls: finalResponse.message.tool_calls?.map((call) => ({
          id: String(Math.random()),
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        })),
      };
    }

    return {
      content: response.message.content,
      tool_calls: response.message.tool_calls?.map((call) => ({
        id: String(Math.random()),
        function: {
          name: call.function.name,
          arguments: call.function.arguments,
        },
      })),
    };
  } catch (error) {
    console.error("Worker handler error:", error);
    throw new Error("Worker failed to process the request");
  }
}
