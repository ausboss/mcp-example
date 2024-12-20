// managerHandler.ts

import { ManagerResponse } from "./types/ollamaTypes.js";
import ollama from "ollama";

export async function getManagerResponse(
  model: string,
  managerMessages: any[]
): Promise<ManagerResponse> {
  const response = await ollama.chat({
    model: model,
    messages: managerMessages,
    format: "json",
  });

  try {
    const parsedResponse = JSON.parse(response.message.content);
    return parsedResponse as ManagerResponse;
  } catch (e) {
    console.error("Failed to parse manager response:", e);
    return {
      status: "ERROR",
      reasoning: "Failed to parse manager response",
    };
  }
}