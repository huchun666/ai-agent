import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ChatMessage, ThreadSummary } from "@/types/agent";

export async function listThreads(userId: string): Promise<ThreadSummary[]> {
  const threads = await prisma.thread.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return threads.map((t) => ({
    id: t.id,
    title: t.title,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function createThread(userId: string, title?: string) {
  return prisma.thread.create({
    data: { userId, title: title ?? "新对话" },
  });
}

export async function getThread(threadId: string, userId: string) {
  return prisma.thread.findFirst({
    where: { id: threadId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function deleteThread(threadId: string, userId: string) {
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, userId },
  });
  if (!thread) return false;
  await prisma.thread.delete({ where: { id: threadId } });
  return true;
}

export async function saveMessage(
  threadId: string,
  role: string,
  content: string,
  metadata?: Record<string, unknown>
) {
  return prisma.message.create({
    data: {
      threadId,
      role,
      content,
      metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });
}

export async function updateThreadTitle(threadId: string, title: string) {
  return prisma.thread.update({
    where: { id: threadId },
    data: { title },
  });
}

export function toChatMessages(
  messages: Array<{
    id: string;
    role: string;
    content: string;
    metadata: unknown;
    createdAt: Date;
  }>
): ChatMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role as ChatMessage["role"],
    content: m.content,
    metadata: m.metadata as Record<string, unknown> | null,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function ensureThreadAccess(threadId: string, userId: string) {
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, userId },
  });
  if (!thread) {
    throw new Error("Thread not found");
  }
  return thread;
}
