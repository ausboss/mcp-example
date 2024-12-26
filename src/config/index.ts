// src/config/index.ts

import * as fs from "fs";

import { Config } from "../types/config"; // Import the main Config type

// Load config once at startup
const configPath = "./mcp-config.json";
let config: Config;

try {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (error) {
  if (error instanceof Error) {
    throw new Error(`Failed to load config: ${error.message}`);
  }
  throw error;
}

// Export the full config and specific sections
export const getConfig = () => config;
export const ollamaConfig = config.ollama;
