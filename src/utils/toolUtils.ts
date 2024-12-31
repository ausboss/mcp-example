// utils/toolUtils.ts
import { Client } from "@modelcontextprotocol/sdk/client/index";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types";

export async function fetchTools(client: Client): Promise<any[] | null> {
  try {
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema
    );
    const tools = toolsResponse?.tools || [];

    if (
      !Array.isArray(tools) ||
      !tools.every((tool) => typeof tool === "object")
    ) {
      console.debug("Invalid tools format received.");
      return null;
    }

    return tools;
  } catch (error) {
    console.error("Error fetching tools:", error);
    return null;
  }
}
