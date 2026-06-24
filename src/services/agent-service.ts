import { HumanMessage, isAIMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { getAgentGraph } from "@/lib/agent/graph/builder";
import {
  saveMessage,
  updateThreadTitle,
  ensureThreadAccess,
} from "@/services/thread-service";
import type { StreamEvent, ToolApprovalRequest } from "@/types/agent";
import { truncate } from "@/lib/utils";

export async function streamAgentResponse(
  threadId: string,
  userId: string,
  userMessage: string,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  await ensureThreadAccess(threadId, userId);
  await saveMessage(threadId, "user", userMessage);

  const graph = await getAgentGraph();
  const config = { configurable: { thread_id: threadId, user_id: userId } };

  let assistantContent = "";
  let currentNode = "";

  try {
    const stream = await graph.stream(
      { messages: [new HumanMessage(userMessage)] },
      { ...config, streamMode: ["messages", "updates"] as const }
    );

    for await (const chunk of stream) {
      if (Array.isArray(chunk)) {
        const [mode, data] = chunk as [string, unknown];

        if (mode === "updates" && data && typeof data === "object") {
          const updates = data as Record<string, unknown>;

          if ("agent" in updates) {
            onEvent({ type: "node_end", data: { node: "agent" } });
          }
          if ("retriever" in updates) {
            onEvent({ type: "node_end", data: { node: "retriever" } });
          }
          if ("tools" in updates) {
            onEvent({ type: "node_end", data: { node: "tools" } });
          }

          const interrupt = (updates as { __interrupt__?: unknown[] })
            .__interrupt__;
          if (interrupt?.length) {
            const payload = interrupt[0] as { value: ToolApprovalRequest };
            onEvent({
              type: "interrupt",
              data: payload.value as unknown as Record<string, unknown>,
            });
            return;
          }
        }

        if (mode === "messages") {
          const [messageChunk, metadata] = data as [
            { content?: string | unknown[]; tool_call_chunks?: unknown[] },
            { langgraph_node?: string }
          ];

          const node = metadata?.langgraph_node ?? "";
          if (node && node !== currentNode) {
            currentNode = node;
            onEvent({ type: "node_start", data: { node } });
          }

          if (typeof messageChunk.content === "string" && messageChunk.content) {
            // 仅转发 agent 节点的文本，避免工具返回值混入聊天流
            if (node === "agent") {
              assistantContent += messageChunk.content;
              onEvent({ type: "token", data: { content: messageChunk.content } });
            }
          }

          if (messageChunk.tool_call_chunks?.length) {
            onEvent({
              type: "tool_call",
              data: { chunks: messageChunk.tool_call_chunks },
            });
          }
        }
      }
    }

    const finalState = await graph.getState(config);

    const interruptValue = extractInterrupt(finalState);
    if (interruptValue) {
      onEvent({
        type: "interrupt",
        data: interruptValue as unknown as Record<string, unknown>,
      });
      return;
    }

    const lastMsg = finalState.values.messages?.at(-1);
    if (lastMsg && isAIMessage(lastMsg)) {
      const content =
        typeof lastMsg.content === "string"
          ? lastMsg.content
          : assistantContent;
      if (content) {
        await saveMessage(threadId, "assistant", content);
        await maybeUpdateTitle(threadId, userMessage);
      }
    }

    onEvent({ type: "done", data: {} });
  } catch (error) {
    onEvent({
      type: "error",
      data: {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export async function resumeAgentWithApproval(
  threadId: string,
  userId: string,
  approved: boolean,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  await ensureThreadAccess(threadId, userId);

  const graph = await getAgentGraph();
  const config = { configurable: { thread_id: threadId, user_id: userId } };

  let assistantContent = "";

  try {
    const stream = await graph.stream(
      new Command({ resume: { approved } }),
      { ...config, streamMode: ["messages", "updates"] as const }
    );

    for await (const chunk of stream) {
      if (!Array.isArray(chunk)) continue;
      const [mode, data] = chunk as [string, unknown];

      if (mode === "updates" && data && typeof data === "object") {
        const updates = data as Record<string, unknown>;
        const interrupt = (updates as { __interrupt__?: unknown[] })
          .__interrupt__;
        if (interrupt?.length) {
          const payload = interrupt[0] as { value: ToolApprovalRequest };
          onEvent({
            type: "interrupt",
            data: payload.value as unknown as Record<string, unknown>,
          });
          return;
        }
      }

      if (mode === "messages") {
        const [messageChunk, metadata] = data as [
          { content?: string },
          { langgraph_node?: string }
        ];
        if (metadata?.langgraph_node) {
          onEvent({
            type: "node_start",
            data: { node: metadata.langgraph_node },
          });
        }
        if (typeof messageChunk.content === "string" && messageChunk.content) {
          assistantContent += messageChunk.content;
          onEvent({ type: "token", data: { content: messageChunk.content } });
        }
      }
    }

    const finalState = await graph.getState(config);

    const interruptValue = extractInterrupt(finalState);
    if (interruptValue) {
      onEvent({
        type: "interrupt",
        data: interruptValue as unknown as Record<string, unknown>,
      });
      return;
    }

    const lastMsg = finalState.values.messages?.at(-1);
    if (lastMsg && isAIMessage(lastMsg)) {
      const content =
        typeof lastMsg.content === "string"
          ? lastMsg.content
          : assistantContent;
      if (content) {
        await saveMessage(threadId, "assistant", content);
      }
    }

    onEvent({ type: "done", data: {} });
  } catch (error) {
    onEvent({
      type: "error",
      data: {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

async function maybeUpdateTitle(threadId: string, firstMessage: string) {
  const title = truncate(firstMessage, 30);
  await updateThreadTitle(threadId, title);
}

function extractInterrupt(
  state: Awaited<ReturnType<Awaited<ReturnType<typeof getAgentGraph>>["getState"]>>
): ToolApprovalRequest | null {
  for (const task of state.tasks ?? []) {
    if (task.interrupts?.length) {
      const value = task.interrupts[0]?.value;
      if (
        value &&
        typeof value === "object" &&
        "type" in value &&
        (value as ToolApprovalRequest).type === "tool_approval"
      ) {
        return value as ToolApprovalRequest;
      }
    }
  }
  return null;
}
