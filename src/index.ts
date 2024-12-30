// main.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { runChatHandler } from "./utils/chatInterface.js";

// 2) Call your runChatHandler
async function startChat() {
  try {
    // Pass in client, plus any custom config for Ollama host or model if different
    await runChatHandler(client, "http://localhost:11411", "llama2");
    console.log("Chat ended.");
  } catch (err) {
    console.error("Fatal error in chat:", err);
  }
}

startChat();
