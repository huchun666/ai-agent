import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import {
  getThread,
  deleteThread,
  toChatMessages,
} from "@/services/thread-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    const { threadId } = await params;
    const thread = await getThread(threadId, userId);

    if (!thread) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    return Response.json({
      thread: {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        messages: toChatMessages(thread.messages),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    const { threadId } = await params;
    const deleted = await deleteThread(threadId, userId);

    if (!deleted) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
