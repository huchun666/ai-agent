import { prisma } from "@/lib/db";
import { splitText, extractTextFromBuffer } from "@/lib/rag/chunker";
import { embedTexts } from "@/lib/rag/embeddings";
import { upsertChunkEmbedding } from "@/lib/rag/pgvector";

export interface DocumentSummary {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  status: string;
  errorMessage: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function listDocuments(userId: string): Promise<DocumentSummary[]> {
  const docs = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return docs.map((d) => ({
    id: d.id,
    filename: d.filename,
    mimeType: d.mimeType,
    size: d.size,
    status: d.status,
    errorMessage: d.errorMessage,
    chunkCount: d.chunkCount,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function createDocumentFromUpload(
  userId: string,
  file: File
): Promise<DocumentSummary> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const text = extractTextFromBuffer(buffer, file.type, file.name);

  const doc = await prisma.document.create({
    data: {
      userId,
      filename: file.name,
      mimeType: file.type || "text/plain",
      size: file.size,
      content: text,
      status: "pending",
    },
  });

  return {
    id: doc.id,
    filename: doc.filename,
    mimeType: doc.mimeType,
    size: doc.size,
    status: doc.status,
    errorMessage: doc.errorMessage,
    chunkCount: doc.chunkCount,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function ingestDocument(
  documentId: string,
  userId: string
): Promise<DocumentSummary> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });

  if (!doc) throw new Error("Document not found");
  if (!doc.content?.trim()) throw new Error("文档内容为空");

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "processing", errorMessage: null },
  });

  try {
    await prisma.documentChunk.deleteMany({ where: { documentId } });

    const chunks = await splitText(doc.content);
    const embeddings = await embedTexts(chunks);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = await prisma.documentChunk.create({
        data: {
          documentId,
          content: chunks[i],
          chunkIndex: i,
          tokenCount: Math.ceil(chunks[i].length / 4),
        },
      });
      await upsertChunkEmbedding(chunk.id, embeddings[i]);
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { status: "ready", chunkCount: chunks.length },
    });

    return {
      id: updated.id,
      filename: updated.filename,
      mimeType: updated.mimeType,
      size: updated.size,
      status: updated.status,
      errorMessage: updated.errorMessage,
      chunkCount: updated.chunkCount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { status: "failed", errorMessage: message },
    });
    throw new Error(message);
  }
}

export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<boolean> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });
  if (!doc) return false;
  await prisma.document.delete({ where: { id: documentId } });
  return true;
}
