import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import {
  updateMcpServer,
  deleteMcpServer,
} from "@/services/mcp-service";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    const { id } = await params;
    const body = await request.json();

    const server = await updateMcpServer(id, userId, body);
    if (!server) {
      return Response.json({ error: "Server not found" }, { status: 404 });
    }
    return Response.json({ server });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    const { id } = await params;
    const deleted = await deleteMcpServer(id, userId);
    if (!deleted) {
      return Response.json({ error: "Server not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
