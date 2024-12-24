# MCP Example Client

A TypeScript-based example client implementing the Model Context Protocol (MCP), demonstrating how to interact with MCP servers using the official SDK.

## Overview

This project provides a reference implementation for building MCP clients, with examples of:

- Configurable server connections
- Tool discovery and execution
- Environment variable handling
- Cross-platform command resolution
- Type-safe MCP communication

## Project Structure

```
src/
├── main.ts                 # Main demo script showing core MCP functionality
├── utils/
│   ├── mcpClient.ts       # MCP client setup and connection management
│   ├── toolHelpers.ts     # Tool-related utilities and type conversions
│   └── toolUtils.ts       # Tool execution utilities with timeout handling
└── types/
    └── config.ts          # TypeScript interfaces for configuration
```

### Key Components

#### main.ts

Demonstrates core MCP functionality:

- Server connection
- Tool discovery
- File system operations
- Response handling

#### utils/mcpClient.ts

Handles MCP client creation and management:

- Server configuration loading
- Connection establishment
- Environment setup
- Error handling

#### utils/toolHelpers.ts

Provides utilities for working with MCP tools:

- Tool response formatting
- OpenAI tool format conversion
- Tool fetching and listing
- Response parsing

#### utils/toolUtils.ts

Implements robust tool execution:

- Timeout handling
- Error management
- Response validation

## Configuration

The client uses a JSON configuration file (`mcp-config.json`) to specify server settings:

```json
{
  "mcpServers": {
    "serverName": {
      "command": "executable",
      "args": ["arg1", "arg2"],
      "env": {}
    }
  }
}
```

## Usage

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-example.git
cd mcp-example

# Install dependencies
npm install

# Build the project
npm run build
```

### Running the Demo

```bash
npm start
```

This will run the main.ts demo script, which:

1. Connects to a configured MCP server
2. Lists available tools
3. Demonstrates file system operations
4. Shows proper response handling

### Configuring Servers

1. Create or modify `mcp-config.json`
2. Add server configurations
3. Specify command, arguments, and environment variables
4. Server names must be unique

Example configuration:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "./"]
    }
  }
}
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

## Key Features

### Tool Execution

- Automatic timeout handling
- Error recovery
- Response formatting
- Type safety

### Configuration Management

- JSON-based configuration
- Environment variable control
- Cross-platform support
- Command resolution

### Response Handling

- Standardized formatting
- Type conversion
- Error handling
- Timeout management

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.
