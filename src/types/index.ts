import { ChildProcess } from "child_process";

// You can put custom type definitions and interface declarations here.
// For now, we will place the augmentation for StdioClientTransport here
// so that types are all in one place.

// Add type for transport's childProcess
declare module "@modelcontextprotocol/sdk/client/stdio.js" {
  interface StdioClientTransport {
    childProcess: ChildProcess;
  }
}

// If you have custom interfaces for tool responses or other domain-specific types,
// you can define them here. For example:
// export interface CustomToolResult {
//   content: { type: string; text: string }[];
// }
