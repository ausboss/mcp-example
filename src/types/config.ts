/**
 * Configuration for an MCP server process
 */
export interface ServerConfig {
  /** Command to start the server */
  command: string;
  /** Optional command line arguments */
  args?: string[];
  /** Optional environment variables */
  env?: Record<string, string>;
  /** Optional working directory for the server process */
  cwd?: string;
}

/**
 * Configuration for Ollama integration
 */
export interface OllamaConfig {
  /** Ollama API host URL (e.g. http://localhost:11434) */
  host: string;
  /** Model to use for chat completions (e.g. llama2, mistral) */
  model: string;
  /** Optional API parameters */
  parameters?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

/**
 * Root configuration object
 */
export interface Config {
  /** Map of MCP server configurations by name */
  mcpServers: Record<string, ServerConfig>;
  /** Ollama configuration */
  ollama: OllamaConfig;
}
