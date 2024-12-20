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
- If the Core Task is answered, mark it END and include the answer in reasoning
- If the worker has not completed the task then mark it CONTINUE
- If there's an error understanding or executing the task, mark it ERROR`,
      },
    ];
  }

  async initialize() {
    const dirResponse = await callToolWithTimeout(
      this.client,
      "list_allowed_directories",
      {}
    );
    const allowedDirs = (dirResponse as any)?.content || [];

    this.workerMessages = [
      {
        role: "system",
        content: `You are an assistant that has access to file system tools and can operate in the following directories: ${JSON.stringify(
          allowedDirs
        )}

Guidelines:
- Use list_directory first to verify files
- Use exact filenames from directory listings
- Build paths carefully based on directory contents

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

    let iterationCount = 0;
    const MAX_ITERATIONS = 3;

    while (iterationCount < MAX_ITERATIONS) {
      try {
        console.log(`Attempt ${iterationCount + 1}/${MAX_ITERATIONS}`);
        
        const workerResponse = await handleWorkerResponse(
          this.model,
          this.workerMessages,
          this.tools,
          this.client
        );

        if (!workerResponse || !workerResponse.content) {
          throw new Error("No response from worker");
        }

        console.log("Worker response received:", workerResponse.content);

        this.managerMessages.push({
          role: "user",
          content: `Worker's response: ${workerResponse.content}`,
        });

        const managerResponse = await getManagerResponse(
          this.model,
          this.managerMessages
        );
        console.log(`Manager status: ${managerResponse.status}`);

        if (managerResponse.status === "END") {
          return workerResponse.content + "\n<END>";
        }

        if (managerResponse.status === "ERROR") {
          throw new Error(managerResponse.reasoning || "Unknown error occurred");
        }

        if (managerResponse.nextPrompt) {
          console.log("Continuing with:", managerResponse.nextPrompt);
          this.workerMessages.push({
            role: "user",
            content: managerResponse.nextPrompt,
          });
        }

        iterationCount++;
      } catch (error: unknown) {
        console.error("Error in task processing:", error);
        if (error instanceof Error) {
          return `Error: ${error.message}\n<END>`;
        }
        return `Error: ${String(error)}\n<END>`;
      }
    }

    return `Error: Reached maximum number of attempts (${MAX_ITERATIONS})\n<END>`;
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