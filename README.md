# TypeScript MCP with Filesystem Server and Ollama Integration

This project demonstrates how to interact with a [Model Context Protocol (MCP)](https://modelcontextprotocol.org/) server using TypeScript, specifically focusing on the [Filesystem MCP Server](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem). This project leverages the official [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) TypeScript SDK to facilitate communication with MCP servers. It also provides an example of integrating this setup with [Ollama](https://ollama.com/) to create an AI agent capable of interacting with your local file system.

## ✨ Features

- **MCP Client Implementation:** Shows how to create and connect to an MCP server using TypeScript.
- **Filesystem Interaction:** Provides an example of using the Filesystem MCP Server to perform operations like listing directories.
- **Ollama Integration:** Demonstrates how to use Ollama as an AI agent to process prompts and utilize the filesystem tools exposed by the MCP server.
- **Tool Calling:** Implements the concept of tool calling, allowing the AI agent to request and utilize functionalities provided by the MCP server.
- **Interactive Chat Interface:** Offers a simple command-line interface to interact with the Ollama-powered agent.
- **Configuration-Driven:** Uses a `mcp-config.json` file for easy configuration of MCP server details and Ollama settings.

## 🚀 Prerequisites

Before running this project, ensure you have the following installed:

- **Node.js:** (Version 18 or higher recommended)
- **npm** or **yarn:** (Package managers for JavaScript)
- **Ollama:** You need to have Ollama installed and running. You can find installation instructions on the [Ollama website](https://ollama.com/).
- **Globally Installed Filesystem MCP Server:** Install the `@modelcontextprotocol/server-filesystem` package globally:
  ```bash
  npm install -g @modelcontextprotocol/server-filesystem
  # or
  yarn global add @modelcontextprotocol/server-filesystem
  ```
- **`node` or `npx` in your PATH:** The project relies on executing the Filesystem MCP Server. Ensure that either the `node` executable (if running the server directly) or `npx` (to execute the server package) is accessible in your system's PATH environment variable.

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ausboss/mcp-ollama-agent.git
   cd typescript-mcp-ollama-example
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

## ⚙️ Configuration

The project's configuration is managed through the `mcp-config.json` file at the root of the project.

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "./"]
    }
  },
  "ollama": {
    "host": "http://localhost:11434",
    "model": "qwen2.5:latest"
  }
}
```

- **`mcpServers`:** This section defines your MCP servers.
  - **`filesystem`:** This is the configuration for the Filesystem MCP Server.
    - **`command`:** The command to execute the server. Here, we are using `npx` to run the globally installed `@modelcontextprotocol/server-filesystem` package. You can also directly specify the path to the `node` executable if you prefer to run the server script directly.
    - **`args`:** An array of arguments passed to the command. In this case, `./` specifies the root directory that the Filesystem MCP Server will have access to. **Adjust this path carefully to control the server's access.**
- **`ollama`:** This section configures the connection to your Ollama server.
  - **`host`:** The address of your Ollama server. The default is `http://localhost:11434`.
  - **`model`:** The name of the Ollama model you want to use. **Ensure this model supports tool calling (functions).** Popular models like `qwen2.5:latest` often have this capability. You can check the model's documentation or Ollama's available models.

**Important:**

- **Filesystem Access:** Be cautious when configuring the `args` for the Filesystem MCP Server. The path specified here determines the directories the AI agent will be able to interact with. Avoid giving access to sensitive areas.
- **Ollama Model:** Ensure the specified Ollama model supports the concept of "tools" or "functions" in its API. This is crucial for the integration to work correctly.

## ▶️ Running the Application

To start the interactive chat with the Ollama agent, run the following command:

```bash
npm run start
# or
yarn start
```

This command will:

1. Start the Filesystem MCP Server (as configured in `mcp-config.json`).
2. Connect to the MCP server.
3. Fetch the available tools from the server.
4. Initialize the Ollama agent with the fetched tools.
5. Start an interactive chat session where you can provide prompts to the agent.

You will see output indicating the connection to the filesystem server and then a prompt to enter your questions.

## 💬 Usage

Once the application is running, you can interact with the Ollama agent by typing prompts in the terminal. The agent can use the available filesystem tools to perform tasks based on your instructions.

**Example Interactions:**

```
🚀 Chatting with Ollama model: qwen2.5:latest
Type 'exit' to quit.

You: hi
Assistant: Hello! How can I assist you today? If you need to perform any file operations or explore the directory structure, feel free to provide more details.
You: what is inside of the test-files folder?
Attempt 1/5
Tool 'list_directory' with args: {"path":"c:\\users\\austi\\desktop\\mcp-example\\test-files"}
Assistant: The `test-files` folder contains a single file named `test.txt`. Would you like to see the contents of this file or perform any other operations with it?
You: yes
Attempt 1/5
Tool 'read_file' with args: {"path":"c:\\users\\austi\\desktop\\mcp-example\\test-files\\test.txt"}
Assistant: The content of `test.txt` is as follows:


poopoo peepepe


Would you like to perform any further operations with this file?
You: no
Assistant: Alright! If you need help with anything else, feel free to ask.
```

The agent will attempt to understand your requests and, if necessary, use the available filesystem tools (like `list_directory`, `read_file`) to fulfill them.

## 🤝 Contributing

Contributions to this project are welcome! Please feel free to submit pull requests with improvements or bug fixes. For major changes, please open an issue first to discuss what you would like to change.
