import { ChildProcess } from "child_process";

declare module "@modelcontextprotocol/sdk/client/stdio.js" {
  interface StdioClientTransport {
    childProcess: ChildProcess;
  }
}
