import { embedQuery } from "@/lib/rag/embeddings";
import { searchSimilarChunks } from "@/lib/rag/pgvector";

export interface RetrievedDoc {
  content: string;
  filename: string;
  chunkIndex: number;
  similarity: number;
}

const SIMILARITY_THRESHOLD = 0.35;

export async function retrieveContext(
  userId: string,
  query: string,
  limit = 5
): Promise<RetrievedDoc[]> {
  if (!query.trim()) return [];

  try {
    const queryEmbedding = await embedQuery(query);
    const results = await searchSimilarChunks(userId, queryEmbedding, limit);

    return results
      .filter((r) => r.similarity >= SIMILARITY_THRESHOLD)
      .map((r) => ({
        content: r.content,
        filename: r.filename,
        chunkIndex: r.chunkIndex,
        similarity: r.similarity,
      }));
  } catch {
    return [];
  }
}

export function formatRetrievedDocs(docs: RetrievedDoc[]): string {
  if (docs.length === 0) return "";

  const sections = docs.map(
    (doc, i) =>
      `[${i + 1}] 来源: ${doc.filename} (片段 #${doc.chunkIndex + 1}, 相关度 ${(doc.similarity * 100).toFixed(0)}%)\n${doc.content}`
  );

  return `以下是从用户知识库检索到的相关内容，请优先基于这些信息回答。如信息不足请说明。\n\n${sections.join("\n\n---\n\n")}`;
}
