import pg from "pg";

const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

let pool: pg.Pool | null = null;
let initialized = false;

export function getPgPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    pool = new pg.Pool({ connectionString: url });
  }
  return pool;
}

export async function ensurePgVectorSetup(): Promise<void> {
  if (initialized) return;

  const client = await getPgPool().connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    await client.query(`
      ALTER TABLE document_chunks
      ADD COLUMN IF NOT EXISTS embedding vector(${EMBEDDING_DIMENSIONS})
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
      ON document_chunks
      USING hnsw (embedding vector_cosine_ops)
    `);
    initialized = true;
  } catch (error) {
    // 索引在部分环境下可能创建失败，不阻断主流程
    if (error instanceof Error && error.message.includes("embedding_idx")) {
      initialized = true;
      return;
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertChunkEmbedding(
  chunkId: string,
  embedding: number[]
): Promise<void> {
  await ensurePgVectorSetup();
  const vectorLiteral = `[${embedding.join(",")}]`;
  await getPgPool().query(
    `UPDATE document_chunks SET embedding = $1::vector WHERE id = $2`,
    [vectorLiteral, chunkId]
  );
}

export interface SimilarChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  filename: string;
  similarity: number;
}

export async function searchSimilarChunks(
  userId: string,
  queryEmbedding: number[],
  limit = 5
): Promise<SimilarChunk[]> {
  await ensurePgVectorSetup();
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const result = await getPgPool().query<{
    id: string;
    document_id: string;
    content: string;
    chunk_index: number;
    filename: string;
    similarity: number;
  }>(
    `
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.chunk_index,
      d.filename,
      1 - (dc.embedding <=> $1::vector) AS similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE d.user_id = $2
      AND d.status = 'ready'
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $3
    `,
    [vectorLiteral, userId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    chunkIndex: row.chunk_index,
    filename: row.filename,
    similarity: row.similarity,
  }));
}
