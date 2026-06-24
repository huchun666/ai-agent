import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import { listDocuments } from "@/services/knowledge-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const documents = await listDocuments(userId);
    return Response.json({ documents });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
