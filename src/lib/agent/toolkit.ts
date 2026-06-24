import type { RunnableConfig } from "@langchain/core/runnables";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { agentTools } from "@/lib/agent/tools";
import { loadMcpToolsForUser } from "@/lib/agent/mcp/loader";

export async function getAllToolsForUser(
  userId: string
): Promise<DynamicStructuredTool[]> {
  const mcpTools = await loadMcpToolsForUser(userId);
  return [...agentTools, ...mcpTools];
}

export function getUserIdFromConfig(config?: RunnableConfig): string {
  const userId = config?.configurable?.user_id;
  if (typeof userId !== "string" || !userId) {
    throw new Error("user_id is required in graph configurable");
  }
  return userId;
}
