// utils/toolFormatters.ts

export function formatToolResponse(responseContent: any): string {
  if (Array.isArray(responseContent)) {
    return responseContent
      .filter((item: any) => item && item.type === "text")
      .map((item: any) => item.text || "No content")
      .join("\n");
  }
  return String(responseContent);
}

export function convertToOpenaiTools(tools: any[]): any[] {
  return tools
    .map((tool) => {
      if (!tool.name) {
        console.warn("Tool missing name:", tool);
        return null;
      }

      return {
        name: tool.name,
        description: tool.description || "",
        parameters: {
          type: "object",
          properties: tool.inputSchema?.properties || {},
          required: tool.inputSchema?.required || [],
        },
      };
    })
    .filter(Boolean); // Remove any null entries
}