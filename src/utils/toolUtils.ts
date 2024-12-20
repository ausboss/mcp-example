import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

export async function callToolWithTimeout(
  client: Client,
  name: string,
  args: any,
  timeoutMs = 30000
): Promise<unknown> {
  const toolCallPromise = client.request(
    {
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    },
    CallToolResultSchema
  );

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`Tool call timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    const result = await Promise.race([toolCallPromise, timeoutPromise]);
    return result;
  } catch (error) {
    throw new Error(
      `Tool call failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
