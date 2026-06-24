import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import {
  listThreads,
  createThread,
  toChatMessages,
} from "@/services/thread-service";

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const threads = await listThreads(userId);
    return Response.json({ threads });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const { title } = body as { title?: string };
    const thread = await createThread(userId, title);
    return Response.json({
      thread: {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
