# TypeScript MCP Agent with Ollama Integration

This project demonstrates integration between [Model Context Protocol (MCP)](https://modelcontextprotocol.org/) servers and [Ollama](https://ollama.com/), allowing AI models to interact with various tools through a unified interface.

## ✨ Features

- Supports multiple MCP servers (both uvx and npx tested)
- Built-in support for file system operations and web research
- Easy configuration through `mcp-config.json` similar to `claude_desktop_config.json`
- Interactive chat interface with Ollama integration that should support any tools
- Standalone demo mode for testing web and filesystem tools without an LLM

## 🚀 Getting Started

1. **Prerequisites:**

   - Node.js (version 18 or higher)
   - Ollama installed and running
   - Install the MCP tools globally that you want to use:

     ```bash
     # For filesystem operations
     npm install -g @modelcontextprotocol/server-filesystem

     # For web research
     npm install -g @mzxrai/mcp-webresearch
     ```

2. **Clone and install:**

   ```bash
   git clone https://github.com/ausboss/mcp-ollama-agent.git
   cd mcp-ollama-agent
   npm install

   ```

3. **Configure your tools and tool supported Ollama model in `mcp-config.json`:**

   ```json
   {
     "mcpServers": {
       "filesystem": {
         "command": "npx",
         "args": ["@modelcontextprotocol/server-filesystem", "./"]
       },
       "webresearch": {
         "command": "npx",
         "args": ["-y", "@mzxrai/mcp-webresearch"]
       }
     },
     "ollama": {
       "host": "http://localhost:11434",
       "model": "qwen2.5:latest"
     }
   }
   ```

4. **Run the demo to test filesystem and webresearch tools without an LLM:**

   ```bash
   npx tsx ./src/demo.ts
   ```

5. **Or start the chat interface with Ollama:**
   ```bash
   npm start
   ```

## ⚙️ Configuration

- **MCP Servers:** Add any MCP-compatible server to the `mcpServers` section
- **Ollama:** Configure host and model (must support function calling)
- Supports both Python (uvx) and Node.js (npx) MCP servers

## 💡 Example Usage

This example used this model [qwen2.5:latest](https://ollama.com/library/qwen2.5)

```
Chat started. Type "exit" to end the conversation.
You: can you use your list directory tool to see whats in test-directory then use your read file tool to read it to me?
Model is using tools to help answer...
Using tool: list_directory
With arguments: { path: 'test-directory' }
Tool result: [ { type: 'text', text: '[FILE] test.txt' } ]
Assistant:
Model is using tools to help answer...
Using tool: read_file
With arguments: { path: 'test-directory/test.txt' }
Tool result: [ { type: 'text', text: 'rosebud' } ]
Assistant: The content of the file `test.txt` in the `test-directory` is:
rosebud
You: thanks
Assistant: You're welcome! If you have any other requests or need further assistance, feel free to ask.
```

## System Prompts

Some local models may need help with tool selection. Customize the system prompt in `ChatManager.ts` to improve tool usage.

## 🤝 Contributing

Contributions welcome! Feel free to submit issues or pull requests.
