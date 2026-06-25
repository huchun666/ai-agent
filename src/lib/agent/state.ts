import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import type { RetrievedDoc } from "@/lib/rag/retriever";

export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  approvedToolIds: Annotation<string[]>({
    reducer: (current, update) => [...new Set([...current, ...update])],
    default: () => [],
  }),
  retrievedDocs: Annotation<RetrievedDoc[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
});

export type AgentGraphState = typeof GraphState.State;

export const REQUIRES_APPROVAL = new Set([
  "write_note",
  "delete_note",
  "perform_action",
]);

export function isApprovalRequired(toolName: string): boolean {
  if (REQUIRES_APPROVAL.has(toolName)) return true;
  // MCP 工具名带 server 前缀，写操作需审批
  const baseName = toolName.includes("__") ? toolName.split("__").pop()! : toolName;
  return ["write_file", "delete_file", "edit_file"].includes(baseName);
}
