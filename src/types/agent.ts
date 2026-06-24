export type StreamEventType =
  | "thread"
  | "node_start"
  | "node_end"
  | "token"
  | "tool_call"
  | "tool_result"
  | "interrupt"
  | "done"
  | "error";

export interface StreamEvent {
  type: StreamEventType;
  data: Record<string, unknown>;
}

export interface ToolApprovalRequest {
  type: "tool_approval";
  toolCall: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ThreadSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}
