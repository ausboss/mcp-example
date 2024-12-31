import { ChatInterface } from "./ChatInterface";
import { Ollama } from "ollama";
import { OllamaMessage } from "../utils/types/ollamaTypes";
import { ToolManager } from "./ToolManager";
import { formatToolResponse } from "../utils/toolFormatters";

export class ChatManager {
  private ollama: Ollama;
  private messages: OllamaMessage[] = [];
  private toolManager: ToolManager;
  private chatInterface: ChatInterface;

  constructor(host: string, private model: string) {
    this.ollama = new Ollama({ host });
    this.toolManager = new ToolManager();
    this.chatInterface = new ChatInterface();
  }

  async initialize() {
    await this.toolManager.initialize();
  }

  async start() {
    try {
      console.log('Chat started. Type "exit" to end the conversation.');

      while (true) {
        const userInput = await this.chatInterface.getUserInput();
        if (userInput.toLowerCase() === "exit") break;

        await this.processUserInput(userInput);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      this.cleanup();
    }
  }

  private async processUserInput(userInput: string) {
    this.messages.push({ role: "user", content: userInput });

    // Get initial response
    const response = await this.ollama.chat({
      model: this.model,
      messages: this.messages as any[],
      tools: this.toolManager.tools,
    });

    this.messages.push(response.message as OllamaMessage);

    // If no tool calls, just show the response and we're done
    const toolCalls = response.message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      console.log("Assistant:", response.message.content);
      return;
    }

    // Handle tool calls and potential follow-ups
    await this.handleToolCalls(toolCalls);
  }

  private async handleToolCalls(toolCalls: any[]) {
    console.log("Model is using tools to help answer...");

    for (const toolCall of toolCalls) {
      const args = this.parseToolArguments(toolCall.function.arguments);
      console.log(`Using tool: ${toolCall.function.name}`);
      console.log(`With arguments:`, args);

      // Get parameter mapping suggestions before making the call
      const parameterMappings = this.toolManager.suggestParameterMapping(
        toolCall.function.name,
        args
      );

      // Fix parameters using the suggested mappings
      const fixedArgs = this.fixToolArguments(
        toolCall.function.name,
        args,
        parameterMappings
      );
      const result = await this.toolManager.callTool(
        toolCall.function.name,
        fixedArgs
      );

      if (result) {
        console.log(`Tool result:`, result.content);

        // Check if the result contains an error
        const resultContent = result.content;
        if (
          Array.isArray(resultContent) &&
          resultContent[0]?.type === "text" &&
          resultContent[0]?.text?.includes("Error")
        ) {
          // Get tool parameter information
          const toolInfo = this.toolManager.getToolParameterInfo(
            toolCall.function.name
          );

          // Create detailed error message with parameter information
          const errorMessage = this.createDetailedErrorMessage(
            toolCall.function.name,
            resultContent[0].text,
            toolInfo,
            args,
            parameterMappings
          );

          // Add error message to conversation
          this.messages.push({
            role: "tool",
            content: errorMessage,
            tool_call_id: toolCall.function.name,
          });

          // Let the model know about the error and try again
          const errorResponse = await this.ollama.chat({
            model: this.model,
            messages: this.messages as any[],
            tools: this.toolManager.tools,
          });

          this.messages.push(errorResponse.message as OllamaMessage);

          const newToolCalls = errorResponse.message.tool_calls ?? [];
          if (newToolCalls.length > 0) {
            // Don't recurse if we're retrying the same tool with the same args
            const currentToolName = toolCall.function.name;
            const hasNewToolCalls = newToolCalls.some(
              (call) =>
                call.function.name !== currentToolName ||
                JSON.stringify(call.function.arguments) !==
                  JSON.stringify(toolCall.function.arguments)
            );

            if (hasNewToolCalls) {
              await this.handleToolCalls(newToolCalls);
            } else {
              console.log(
                "Assistant: I apologize, but I'm having trouble with the correct parameter format. Let me try a different approach."
              );
              return;
            }
          }
          return;
        }

        // No error, proceed normally
        this.messages.push({
          role: "tool",
          content: formatToolResponse(result.content),
          tool_call_id: toolCall.function.name,
        });
      }
    }

    // Get final response after all tools in this batch are done
    const finalResponse = await this.ollama.chat({
      model: this.model,
      messages: this.messages as any[],
      tools: this.toolManager.tools,
    });

    // Add the model's response to messages
    this.messages.push(finalResponse.message as OllamaMessage);

    // Print the response regardless of whether there are tool calls
    console.log("Assistant:", finalResponse.message.content);

    // Check for new tool calls
    const newToolCalls = finalResponse.message.tool_calls ?? [];
    if (newToolCalls.length > 0) {
      // Check if the new tool calls are different from the previous ones
      const previousToolNames = new Set(toolCalls.map((t) => t.function.name));
      const hasNewTools = newToolCalls.some(
        (call) => !previousToolNames.has(call.function.name)
      );

      if (hasNewTools) {
        await this.handleToolCalls(newToolCalls);
      }
    }
  }

  private createDetailedErrorMessage(
    toolName: string,
    errorText: string,
    toolInfo: any | undefined,
    providedArgs: Record<string, unknown>,
    suggestedMappings: Record<string, string>
  ): string {
    let message = `Error using tool ${toolName}:\n${errorText}\n\n`;

    if (toolInfo) {
      message += `Expected parameters:\n`;
      message += `Required: ${toolInfo.parameters.required.join(", ")}\n`;
      message += `Available: ${Object.keys(toolInfo.parameters.properties).join(
        ", "
      )}\n\n`;

      if (Object.keys(suggestedMappings).length > 0) {
        message += `Suggested parameter mappings:\n`;
        for (const [provided, suggested] of Object.entries(suggestedMappings)) {
          message += `- ${provided} → ${suggested}\n`;
        }
      }
    }

    return message;
  }

  private fixToolArguments(
    toolName: string,
    args: Record<string, unknown>,
    mappings: Record<string, string>
  ): Record<string, unknown> {
    const fixedArgs: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(args)) {
      const mappedKey = mappings[key] || key;
      fixedArgs[mappedKey] = value;
    }

    return fixedArgs;
  }

  private parseToolArguments(
    args: string | Record<string, unknown>
  ): Record<string, unknown> {
    if (typeof args === "string") {
      try {
        return JSON.parse(args);
      } catch (e) {
        console.error("Failed to parse tool arguments:", e);
        return { value: args };
      }
    }
    return args;
  }

  private cleanup() {
    this.chatInterface.close();
    this.toolManager.cleanup();
  }
}
