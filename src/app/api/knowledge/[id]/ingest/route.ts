import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import { ingestDocument } from "@/services/knowledge-service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    const { id } = await params;
    const document = await ingestDocument(id, userId);
    return Response.json({ document });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
