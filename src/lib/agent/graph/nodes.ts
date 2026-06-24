import {
  SystemMessage,
  ToolMessage,
  isAIMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { interrupt } from "@langchain/langgraph";
import { createDeepSeekModel } from "@/lib/llm/deepseek";
import { agentTools, SYSTEM_PROMPT } from "@/lib/agent/tools";
import { REQUIRES_APPROVAL, type AgentGraphState } from "@/lib/agent/state";

const toolNode = new ToolNode(agentTools);

function getBoundModel() {
  return createDeepSeekModel().bindTools(agentTools);
}

export async function agentNode(
  state: AgentGraphState
): Promise<Partial<AgentGraphState>> {
  const response = await getBoundModel().invoke([
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages,
  ]);
  return { messages: [response] };
}

export async function toolsNode(
  state: AgentGraphState
): Promise<Partial<AgentGraphState>> {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls?.length) {
    return { messages: [] };
  }

  let approvedIds = [...state.approvedToolIds];

  for (const toolCall of lastMessage.tool_calls) {
    const toolId = toolCall.id;
    if (!toolId) continue;

    if (
      REQUIRES_APPROVAL.has(toolCall.name) &&
      !approvedIds.includes(toolId)
    ) {
      const decision = interrupt({
        type: "tool_approval",
        toolCall: {
          id: toolId,
          name: toolCall.name,
          args: toolCall.args,
        },
      }) as { approved: boolean };

      if (!decision.approved) {
        return {
          messages: [
            new ToolMessage({
              content: "用户拒绝了此工具调用。",
              tool_call_id: toolId,
              name: toolCall.name,
            }),
          ],
        };
      }

      approvedIds = [...approvedIds, toolId];
    }
  }

  const result = await toolNode.invoke({
    ...state,
    approvedToolIds: approvedIds,
  });

  const updates: Partial<AgentGraphState> = {
    messages: result.messages,
  };

  if (approvedIds.length > state.approvedToolIds.length) {
    updates.approvedToolIds = approvedIds.filter(
      (id) => !state.approvedToolIds.includes(id)
    );
  }

  return updates;
}

export function shouldContinue(state: AgentGraphState): "tools" | "__end__" {
  const lastMessage = state.messages.at(-1);
  if (
    lastMessage &&
    isAIMessage(lastMessage) &&
    lastMessage.tool_calls?.length
  ) {
    return "tools";
  }
  return "__end__";
}

export function shouldRetryTools(state: AgentGraphState): "tools" | "agent" {
  const lastMessage = state.messages.at(-1);
  if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls?.length) {
    return "agent";
  }

  const pendingApproval = lastMessage.tool_calls.some(
    (tc) =>
      tc.id &&
      REQUIRES_APPROVAL.has(tc.name) &&
      !state.approvedToolIds.includes(tc.id)
  );

  return pendingApproval ? "tools" : "agent";
}

export function getLastAIMessageContent(state: AgentGraphState): string {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const msg = state.messages[i];
    if (isAIMessage(msg)) {
      const content =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
      return content;
    }
  }
  return "";
}
