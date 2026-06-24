import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { Connection } from "@langchain/mcp-adapters";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { prisma } from "@/lib/db";

type McpServerRecord = {
  id: string;
  name: string;
  transport: string;
  command: string | null;
  args: unknown;
  url: string | null;
  headers: unknown;
};

const cache = new Map<
  string,
  { tools: DynamicStructuredTool[]; expiresAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function buildConnection(server: McpServerRecord): Connection | null {
  const headers =
    server.headers && typeof server.headers === "object"
      ? (server.headers as Record<string, string>)
      : undefined;

  if (server.transport === "stdio") {
    if (!server.command) return null;
    const args = Array.isArray(server.args)
      ? (server.args as string[])
      : [];
    return {
      transport: "stdio",
      command: server.command,
      args,
    };
  }

  if (!server.url) return null;

  if (server.transport === "sse") {
    return {
      transport: "sse",
      url: server.url,
      headers,
    };
  }

  return {
    transport: "http",
    url: server.url,
    headers,
  };
}

export async function loadMcpToolsForUser(
  userId: string
): Promise<DynamicStructuredTool[]> {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tools;
  }

  const servers = await prisma.mcpServer.findMany({
    where: { userId, enabled: true },
  });

  if (servers.length === 0) {
    cache.set(userId, { tools: [], expiresAt: Date.now() + CACHE_TTL_MS });
    return [];
  }

  const mcpServers: Record<string, Connection> = {};
  for (const server of servers) {
    const connection = buildConnection(server);
    if (connection) {
      mcpServers[server.name] = connection;
    }
  }

  if (Object.keys(mcpServers).length === 0) {
    return [];
  }

  try {
    const client = new MultiServerMCPClient({
      mcpServers,
      prefixToolNameWithServerName: true,
      onConnectionError: "ignore",
      throwOnLoadError: false,
    });

    const tools = await client.getTools();
    cache.set(userId, { tools, expiresAt: Date.now() + CACHE_TTL_MS });
    return tools;
  } catch {
    return [];
  }
}

export function invalidateMcpCache(userId: string) {
  cache.delete(userId);
}

export async function testMcpServer(
  server: McpServerRecord
): Promise<{ success: boolean; toolCount: number; tools: string[]; error?: string }> {
  const connection = buildConnection(server);
  if (!connection) {
    return { success: false, toolCount: 0, tools: [], error: "无效的服务器配置" };
  }

  try {
    const client = new MultiServerMCPClient({
      mcpServers: { [server.name]: connection },
      prefixToolNameWithServerName: true,
      onConnectionError: "throw",
    });
    const tools = await client.getTools();
    return {
      success: true,
      toolCount: tools.length,
      tools: tools.map((t) => t.name),
    };
  } catch (error) {
    return {
      success: false,
      toolCount: 0,
      tools: [],
      error: error instanceof Error ? error.message : "连接失败",
    };
  }
}
