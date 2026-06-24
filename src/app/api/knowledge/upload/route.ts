import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth/request";
import {
  createDocumentFromUpload,
  ingestDocument,
} from "@/services/knowledge-service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "文件大小不能超过 5MB" }, { status: 400 });
    }

    const document = await createDocumentFromUpload(userId, file);

    try {
      const ingested = await ingestDocument(document.id, userId);
      return Response.json({ document: ingested });
    } catch (error) {
      return Response.json({
        document,
        ingestError: error instanceof Error ? error.message : "Ingest failed",
      });
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
