import { ChatInterface } from "./ChatInterface";
import { Ollama } from "ollama";
import { OllamaMessage } from "../utils/types/ollamaTypes.js";
import { ToolManager } from "./ToolManager";
import { formatToolResponse } from "../utils/toolHelpers.js";

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

    const response = await this.ollama.chat({
      model: this.model,
      messages: this.messages as any[],
      tools: this.toolManager.tools,
    });

    this.messages.push(response.message as OllamaMessage);

    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      await this.handleToolCalls(response.message.tool_calls);
    } else {
      console.log("Assistant:", response.message.content);
    }
  }

  private async handleToolCalls(toolCalls: any[]) {
    console.log("Model is using tools to help answer...");

    for (const toolCall of toolCalls) {
      const args = this.parseToolArguments(toolCall.function.arguments);
      const result = await this.toolManager.callTool(
        toolCall.function.name,
        args
      );

      if (result) {
        this.messages.push({
          role: "tool",
          content: formatToolResponse(result.content),
          tool_call_id: toolCall.function.name,
        });
      }
    }

    const finalResponse = await this.ollama.chat({
      model: this.model,
      messages: this.messages as any[],
    });

    this.messages.push(finalResponse.message as OllamaMessage);
    console.log("Assistant:", finalResponse.message.content);
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
