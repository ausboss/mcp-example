// src/utils/commandResolver.ts

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function validateCommand(command: string): Promise<boolean> {
  try {
    // On Windows, use 'where', on Unix use 'which'
    const checkCommand = process.platform === "win32" ? "where" : "which";
    await execAsync(`${checkCommand} ${command}`);
    return true;
  } catch {
    return false;
  }
}

export async function resolveCommand(command: string): Promise<string> {
  // Add .cmd extension for npx on Windows
  const commandToCheck =
    process.platform === "win32" && command === "npx"
      ? `${command}.cmd`
      : command;

  // Common package managers and their executables
  const packageManagers = {
    node: ["node", "npx", "npm"],
    python: ["python", "uvx", "pip"],
  };

  // First try the specified command
  if (await validateCommand(commandToCheck)) {
    return commandToCheck;
  }

  // Try alternatives based on command type
  const alternatives = Object.values(packageManagers).flat();
  for (const alt of alternatives) {
    if (await validateCommand(alt)) {
      console.log(
        `⚠️ Original command '${command}' not found, using '${alt}' instead`
      );
      return alt;
    }
  }

  throw new Error(
    `Could not resolve command '${command}'. Please ensure it's installed and in your PATH.`
  );
}
