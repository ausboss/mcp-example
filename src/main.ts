import { ChatManager } from "./lib/ChatManager";
import { ollamaConfig } from "./config";

async function main() {
  const { model, host } = ollamaConfig;
  const chatManager = new ChatManager(host, model);

  try {
    await chatManager.initialize();
    await chatManager.start();
  } catch (error) {
    console.error("Failed to start chat:", error);
  }
}

main().catch(console.error);
