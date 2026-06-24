import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import { listMcpServers, createMcpServer } from "@/services/mcp-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const servers = await listMcpServers(userId);
    return Response.json({ servers });
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
    const body = await request.json();
    const { name, transport, command, args, url, headers, enabled } = body;

    if (!name || !transport) {
      return Response.json(
        { error: "name and transport are required" },
        { status: 400 }
      );
    }

    const server = await createMcpServer(userId, {
      name,
      transport,
      command,
      args,
      url,
      headers,
      enabled,
    });

    return Response.json({ server });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
