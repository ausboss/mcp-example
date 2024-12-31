import { ChatManager } from "./lib/ChatManager";
import { ollamaConfig } from "./config";

async function main() {
  const chatManager = new ChatManager(ollamaConfig);

  try {
    await chatManager.initialize();
    await chatManager.start();
  } catch (error) {
    console.error("Failed to start chat:", error);
  }
}

main().catch(console.error);
