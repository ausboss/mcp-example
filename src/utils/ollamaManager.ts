// ollamaManager.ts

import { ManagerResponse, ModelResponse } from "./types/ollamaTypes.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { handleWorkerResponse } from "./workerHandler.js";
import { getManagerResponse } from "./managerHandler.js";
import { callToolWithTimeout } from "./toolUtils.js";

export class OllamaManager {
  private managerMessages: any[] = [];
  private workerMessages: any[] = [];
  private client: Client;
  private model: string;
  private tools: any[];

  constructor(model: string, client: Client, tools: any[]) {
    this.model = model;
    this.client = client;
    this.tools = tools;

    // Initialize manager with simpler, more direct prompt
    this.managerMessages = [
      {
        role: "system",
        content: `You are a task evaluator that makes sure the worker has completed the Core Task. 
Determine if the worker has completed the core task using the tools.
Your response must be JSON with:
{
  "status": "CONTINUE" | "END" | "ERROR",
  "reasoning": "Very brief explanation",
  "nextPrompt": "Next instruction if CONTINUE"
}

Key points:
- If the Core Task is answered, mark it END
- If the worker has not completed the task then mark it CONTINUE`,
      },
    ];
  }

  async initialize() {
    // Get allowed directories
    const dirResponse = await callToolWithTimeout(
      this.client,
      "list_allowed_directories",
      {}
    );
    const allowedDirs = (dirResponse as any)?.content || [];

    // Initialize worker with simpler prompt
    this.workerMessages = [
      {
        role: "system",
        content: `You are an assistant that has access to file system tools and can operate in the following directories: ${JSON.stringify(
          allowedDirs
        )}

Guidelines:
- use \\ or / to separate directories
- use list_directory to verify the names of files in a directory 

Available tools:
${this.tools
  .map((t) => `- ${t.function.name}: ${t.function.description}`)
  .join("\n")}
`,
      },
    ];

    return this;
  }

  async processTask(initialPrompt: string): Promise<string> {
    console.log("Core Task:", initialPrompt);

    this.workerMessages.push({
      role: "user",
      content: initialPrompt,
    });

    while (true) {
      try {
        // Get worker's response
        const workerResponse = await handleWorkerResponse(
          this.model,
          this.workerMessages,
          this.tools,
          this.client
        );
        console.log("Worker response received");

        // Add worker's response to manager's context
        this.managerMessages.push({
          role: "user",
          content: `Worker's response: ${workerResponse.content}`,
        });

        // Get manager's evaluation
        const managerResponse = await getManagerResponse(
          this.model,
          this.managerMessages
        );
        console.log(`Manager status: ${managerResponse.status}`);

        if (managerResponse.status === "END") {
          return workerResponse.content + "\n<END>";
        }

        if (managerResponse.status === "ERROR") {
          throw new Error(managerResponse.reasoning);
        }

        // Continue only if absolutely necessary
        if (managerResponse.nextPrompt) {
          console.log("Continuing with:", managerResponse.nextPrompt);
          this.workerMessages.push({
            role: "user",
            content: managerResponse.nextPrompt,
          });
        }
      } catch (error) {
        console.error("Error in task processing:", error);
        return `Error: ${error.message}\n<END>`;
      }
    }
  }
}

export async function processOllamaToolCalls(
  model: string,
  initialPrompt: string,
  ollamaTools: any[],
  client: Client
): Promise<string> {
  const manager = await new OllamaManager(
    model,
    client,
    ollamaTools
  ).initialize();
  return await manager.processTask(initialPrompt);
}