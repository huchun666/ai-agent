import { OpenAIEmbeddings } from "@langchain/openai";

export const EMBEDDING_DIMENSIONS = Number(
  process.env.EMBEDDING_DIMENSIONS ?? 1536
);

export function createEmbeddings() {
  const apiKey =
    process.env.EMBEDDING_API_KEY ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "EMBEDDING_API_KEY or DEEPSEEK_API_KEY is required for knowledge base"
    );
  }

  const baseURL =
    process.env.EMBEDDING_BASE_URL ??
    "https://api.openai.com/v1";

  return new OpenAIEmbeddings({
    model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    apiKey,
    dimensions: EMBEDDING_DIMENSIONS,
    configuration: { baseURL },
  });
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings = createEmbeddings();
  return embeddings.embedDocuments(texts);
}

export async function embedQuery(text: string): Promise<number[]> {
  const embeddings = createEmbeddings();
  return embeddings.embedQuery(text);
}
