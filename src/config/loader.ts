// src/config/loader.ts

import * as fs from "fs";
import * as path from "path";

import { Config, ServerConfig } from "../types/config";

export async function loadConfig(
  configPath: string,
  serverName: string
): Promise<ServerConfig> {
  try {
    const config: Config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const serverConfig = config.mcpServers[serverName];

    if (!serverConfig) {
      throw new Error(`Server '${serverName}' not found in config`);
    }

    return serverConfig;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
}
