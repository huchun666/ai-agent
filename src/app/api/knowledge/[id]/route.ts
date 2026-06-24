import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import { deleteDocument } from "@/services/knowledge-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    const { id } = await params;
    const deleted = await deleteDocument(id, userId);
    if (!deleted) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
