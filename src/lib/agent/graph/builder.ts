import { END, START, StateGraph } from "@langchain/langgraph";
import { GraphState } from "@/lib/agent/state";
import {
  agentNode,
  retrieverNode,
  shouldContinue,
  shouldRetryTools,
  toolsNode,
} from "@/lib/agent/graph/nodes";
import { getCheckpointer } from "@/lib/agent/checkpointer";

let compiledGraph: Awaited<ReturnType<typeof buildGraph>> | null = null;

async function buildGraph() {
  /**
   * getCheckpointer
   * 连接到 PostgreSQL（langgraph schema），用来：
   * 记住对话历史（按 thread_id 区分不同会话）
   * 支持中断恢复：比如 AI 要删文件，先暂停等你点「同意/拒绝」，点完后从断点继续
   * 没有它，多轮对话和工具审批都很难做。
  */
  const checkpointer = await getCheckpointer();

  const workflow = new StateGraph(GraphState)
    .addNode("retriever", retrieverNode) // 检索节点，执行“查资料”这个动作
    .addNode("agent", agentNode)
    .addNode("tools", toolsNode)
    .addEdge(START, "retriever")
    .addEdge("retriever", "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      __end__: END,
    })
    .addConditionalEdges("tools", shouldRetryTools, {
      tools: "tools",
      agent: "agent",
    });

  return workflow.compile({ checkpointer });
}

export async function getAgentGraph() {
  if (!compiledGraph) {
    compiledGraph = await buildGraph();
  }
  return compiledGraph;
}

export function resetAgentGraph() {
  compiledGraph = null;
}
