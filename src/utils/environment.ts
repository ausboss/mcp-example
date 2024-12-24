// src/utils/environment.ts

// Default environment variables to inherit based on platform
const DEFAULT_INHERITED_ENV_VARS =
  process.platform === "win32"
    ? [
        "APPDATA",
        "HOMEDRIVE",
        "HOMEPATH",
        "LOCALAPPDATA",
        "PATH",
        "PROCESSOR_ARCHITECTURE",
        "SYSTEMDRIVE",
        "SYSTEMROOT",
        "TEMP",
        "USERNAME",
        "USERPROFILE",
      ]
    : ["HOME", "LOGNAME", "PATH", "SHELL", "TERM", "USER"];

export function getDefaultEnvironment(): Record<string, string> {
  // Filter process.env to only include default variables
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) =>
        DEFAULT_INHERITED_ENV_VARS.includes(key) &&
        value !== undefined &&
        !value.startsWith("()")
    )
  ) as Record<string, string>;
}
