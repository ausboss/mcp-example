import * as fs from "fs";
import * as path from "path";

export function ensureTestDirectory(testDir: string) {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
}

export function createTestFile(testFile: string) {
  const testContent =
    "Hello from MCP filesystem server with timestamps:\n" +
    `Created at: ${new Date().toISOString()}`;
  fs.writeFileSync(testFile, testContent);
  console.log("Created test file:", testFile);
}
