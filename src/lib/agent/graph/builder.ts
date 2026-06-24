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
  const checkpointer = await getCheckpointer();

  const workflow = new StateGraph(GraphState)
    .addNode("retriever", retrieverNode)
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
