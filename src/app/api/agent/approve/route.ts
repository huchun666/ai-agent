import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import { resumeAgentWithApproval } from "@/services/agent-service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const body = await request.json();
    const { threadId, approved } = body as {
      threadId: string;
      approved: boolean;
    };

    if (!threadId) {
      return Response.json({ error: "threadId is required" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => {
          controller.enqueue(encoder.encode(data));
        };

        await resumeAgentWithApproval(threadId, userId, approved, (event) => {
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
