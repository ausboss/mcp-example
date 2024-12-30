import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

export async function callToolWithTimeout(
  client: Client,
  name: string,
  args: any,
  timeoutMs = 30000
): Promise<unknown> {
  // Parse arguments if they're a string
  let parsedArgs = args;
  if (typeof args === 'string') {
    try {
      parsedArgs = JSON.parse(args);
    } catch (e) {
      // If parsing fails, wrap the string in an object
      parsedArgs = { value: args };
    }
  }

  // Ensure args is an object
  if (typeof parsedArgs !== 'object' || parsedArgs === null) {
    parsedArgs = {};
  }

  const toolCallPromise = client.request(
    {
      method: "tools/call",
      params: {
        name,
        arguments: parsedArgs,
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
