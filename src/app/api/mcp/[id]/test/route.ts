import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import { testMcpServerById } from "@/services/mcp-service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    const { id } = await params;
    const result = await testMcpServerById(id, userId);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
