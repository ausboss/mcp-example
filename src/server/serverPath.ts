import * as fs from "fs";
import * as path from "path";

// Helper function to find node_modules path
export async function getServerPath(): Promise<string> {
  // Try local node_modules first
  const localPath = path.join(
    process.cwd(),
    "node_modules",
    "@modelcontextprotocol",
    "server-filesystem",
    "dist",
    "index.js"
  );

  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // Fall back to global npm location
  const globalPath = path.join(
    process.env.APPDATA || "",
    "npm",
    "node_modules",
    "@modelcontextprotocol",
    "server-filesystem",
    "dist",
    "index.js"
  );

  if (fs.existsSync(globalPath)) {
    return globalPath;
  }

  throw new Error(
    "Could not find @modelcontextprotocol/server-filesystem in local or global node_modules"
  );
}
