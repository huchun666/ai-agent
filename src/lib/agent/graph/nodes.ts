import {
  SystemMessage,
  ToolMessage,
  isAIMessage,
  isHumanMessage,
} from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { interrupt } from "@langchain/langgraph";
import { createDeepSeekModel } from "@/lib/llm/deepseek";
import { agentTools, BASE_SYSTEM_PROMPT } from "@/lib/agent/tools";
import {
  isApprovalRequired,
  type AgentGraphState,
} from "@/lib/agent/state";
import { getAllToolsForUser, getUserIdFromConfig } from "@/lib/agent/toolkit";
import {
  retrieveContext,
  formatRetrievedDocs,
} from "@/lib/rag/retriever";

export async function retrieverNode(
  state: AgentGraphState,
  config?: RunnableConfig
): Promise<Partial<AgentGraphState>> {
  const userId = getUserIdFromConfig(config);

  const lastHuman = [...state.messages]
    .reverse()
    .find((m) => isHumanMessage(m));

  if (!lastHuman) {
    return { retrievedDocs: [] };
  }

  const query =
    typeof lastHuman.content === "string"
      ? lastHuman.content
      : JSON.stringify(lastHuman.content);

  const docs = await retrieveContext(userId, query);
  return { retrievedDocs: docs };
}

export async function agentNode(
  state: AgentGraphState,
  config?: RunnableConfig
): Promise<Partial<AgentGraphState>> {
  const userId = getUserIdFromConfig(config);
  const tools = await getAllToolsForUser(userId);
  const model = createDeepSeekModel().bindTools(tools);

  const ragContext = formatRetrievedDocs(state.retrievedDocs);
  const builtinNames = new Set<string>(agentTools.map((t) => t.name));
  const mcpToolNames = tools
    .map((t) => t.name)
    .filter((n) => !builtinNames.has(n));

  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (ragContext) {
    systemPrompt += `\n\n## 知识库上下文\n${ragContext}`;
  }
  if (mcpToolNames.length > 0) {
    systemPrompt += `\n\n## MCP 扩展工具\n你还可以使用以下 MCP 工具：\n${mcpToolNames.map((n) => `- ${n}`).join("\n")}`;
  }

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages,
  ]);
  return { messages: [response] };
}

export async function toolsNode(
  state: AgentGraphState,
  config?: RunnableConfig
): Promise<Partial<AgentGraphState>> {
  const userId = getUserIdFromConfig(config);
  const tools = await getAllToolsForUser(userId);
  const toolNode = new ToolNode(tools);

  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls?.length) {
    return { messages: [] };
  }

  let approvedIds = [...state.approvedToolIds];

  for (const toolCall of lastMessage.tool_calls) {
    const toolId = toolCall.id;
    if (!toolId) continue;

    if (
      isApprovalRequired(toolCall.name) &&
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
      isApprovalRequired(tc.name) &&
      !state.approvedToolIds.includes(tc.id)
  );

  return pendingApproval ? "tools" : "agent";
}
