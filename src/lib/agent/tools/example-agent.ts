/**
 * LangChain Agent 使用生产级 Tools 的完整示例
 *
 * 运行方式（需配置 DEEPSEEK_API_KEY）：
 *   npx tsx src/lib/agent/tools/example-agent.ts
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { createDeepSeekModel } from "@/lib/llm/deepseek";
import {
  productionTools,
  BASE_SYSTEM_PROMPT,
} from "@/lib/agent/tools";

async function main() {
  const model = createDeepSeekModel();
  const checkpointer = new MemorySaver();

  const agent = createReactAgent({
    llm: model,
    tools: productionTools,
    checkpointSaver: checkpointer,
    messageModifier: new SystemMessage(BASE_SYSTEM_PROMPT),
  });

  const threadId = "example-thread-001";
  const config = { configurable: { thread_id: threadId } };

  const queries = [
    "查询数据库中所有管理员用户",
    "检索退款政策相关文档",
    "用 JavaScript 计算 [1,2,3,4,5] 的平均值",
  ];

  for (const query of queries) {
    console.log("\n" + "=".repeat(60));
    console.log("用户:", query);
    console.log("-".repeat(60));

    const result = await agent.invoke(
      { messages: [new HumanMessage(query)] },
      config
    );

    const lastMessage = result.messages.at(-1);
    const content =
      typeof lastMessage?.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage?.content);

    console.log("助手:", content);
  }
}

main().catch(console.error);

/**
 * ── 在现有 LangGraph 项目中集成 ──────────────────────────────
 *
 * 项目已内置集成，核心代码如下：
 *
 * ```ts
 * import { agentTools } from "@/lib/agent/tools";
 * import { getAllToolsForUser } from "@/lib/agent/toolkit";
 *
 * // 方式 1：仅使用生产级工具
 * import { productionTools } from "@/lib/agent/tools";
 * const model = createDeepSeekModel().bindTools(productionTools);
 *
 * // 方式 2：生产级工具 + MCP 扩展工具（当前 agent 节点用法）
 * const tools = await getAllToolsForUser(userId);
 * const model = createDeepSeekModel().bindTools(tools);
 *
 * // 方式 3：LangGraph ToolNode 执行工具
 * import { ToolNode } from "@langchain/langgraph/prebuilt";
 * const toolNode = new ToolNode(agentTools);
 * const result = await toolNode.invoke({ messages: state.messages });
 * ```
 */
