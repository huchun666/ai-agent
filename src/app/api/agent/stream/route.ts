import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import { streamAgentResponse } from "@/services/agent-service";
import { createThread } from "@/services/thread-service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const body = await request.json();
    const { message, threadId: existingThreadId } = body as {
      message: string;
      threadId?: string;
    };

    if (!message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    let threadId = existingThreadId;
    if (!threadId) {
      const thread = await createThread(userId);
      threadId = thread.id;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => {
          controller.enqueue(encoder.encode(data));
        };

        send(`data: ${JSON.stringify({ type: "thread", data: { threadId } })}\n\n`);

        await streamAgentResponse(threadId!, userId, message.trim(), (event) => {
          send(`data: ${JSON.stringify(event)}\n\n`);
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
