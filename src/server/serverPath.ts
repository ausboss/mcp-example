// src/server/serverPath.ts

import { loadConfig } from "../config/loader";

export async function getServerConfig(configPath: string, serverName: string) {
  const config = await loadConfig(configPath, serverName);
  return config;
}
