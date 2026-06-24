import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  invalidateMcpCache,
  testMcpServer,
} from "@/lib/agent/mcp/loader";

export interface McpServerSummary {
  id: string;
  name: string;
  transport: string;
  command: string | null;
  args: string[] | null;
  url: string | null;
  headers: Record<string, string> | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function toSummary(server: {
  id: string;
  name: string;
  transport: string;
  command: string | null;
  args: unknown;
  url: string | null;
  headers: unknown;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): McpServerSummary {
  return {
    id: server.id,
    name: server.name,
    transport: server.transport,
    command: server.command,
    args: Array.isArray(server.args) ? (server.args as string[]) : null,
    url: server.url,
    headers:
      server.headers && typeof server.headers === "object"
        ? (server.headers as Record<string, string>)
        : null,
    enabled: server.enabled,
    createdAt: server.createdAt.toISOString(),
    updatedAt: server.updatedAt.toISOString(),
  };
}

export async function listMcpServers(userId: string): Promise<McpServerSummary[]> {
  const servers = await prisma.mcpServer.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return servers.map(toSummary);
}

export async function createMcpServer(
  userId: string,
  data: {
    name: string;
    transport: string;
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
    enabled?: boolean;
  }
): Promise<McpServerSummary> {
  const server = await prisma.mcpServer.create({
    data: {
      userId,
      name: data.name,
      transport: data.transport,
      command: data.command ?? null,
      args: data.args ?? undefined,
      url: data.url ?? null,
      headers: (data.headers as Prisma.InputJsonValue) ?? undefined,
      enabled: data.enabled ?? true,
    },
  });
  invalidateMcpCache(userId);
  return toSummary(server);
}

export async function updateMcpServer(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    transport: string;
    command: string | null;
    args: string[] | null;
    url: string | null;
    headers: Record<string, string> | null;
    enabled: boolean;
  }>
): Promise<McpServerSummary | null> {
  const existing = await prisma.mcpServer.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const server = await prisma.mcpServer.update({
    where: { id },
    data: {
      name: data.name,
      transport: data.transport,
      command: data.command,
      args: data.args as Prisma.InputJsonValue | undefined,
      url: data.url,
      headers: data.headers as Prisma.InputJsonValue | undefined,
      enabled: data.enabled,
    },
  });
  invalidateMcpCache(userId);
  return toSummary(server);
}

export async function deleteMcpServer(
  id: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.mcpServer.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.mcpServer.delete({ where: { id } });
  invalidateMcpCache(userId);
  return true;
}

export async function testMcpServerById(id: string, userId: string) {
  const server = await prisma.mcpServer.findFirst({ where: { id, userId } });
  if (!server) throw new Error("MCP server not found");
  return testMcpServer(server);
}
