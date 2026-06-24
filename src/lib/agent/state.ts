import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  approvedToolIds: Annotation<string[]>({
    reducer: (current, update) => [...new Set([...current, ...update])],
    default: () => [],
  }),
});

export type AgentGraphState = typeof GraphState.State;

export const REQUIRES_APPROVAL = new Set(["write_note", "delete_note"]);
