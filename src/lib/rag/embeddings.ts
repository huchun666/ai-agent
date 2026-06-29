import { OpenAIEmbeddings } from "@langchain/openai";

export const EMBEDDING_DIMENSIONS = Number(
  process.env.EMBEDDING_DIMENSIONS ?? 1536
);

const EMBEDDING_TIMEOUT_MS = Number(
  process.env.EMBEDDING_TIMEOUT_MS ?? 30_000
);

export function createEmbeddings() {
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) {
    throw new Error(
      "未配置 EMBEDDING_API_KEY。DeepSeek 不提供 Embedding API，请在 .env 中配置 OpenAI、SiliconFlow、OpenRouter 等兼容服务的密钥"
    );
  }

  const baseURL =
    process.env.EMBEDDING_BASE_URL ?? "https://api.openai.com/v1";

  return new OpenAIEmbeddings({
    model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    apiKey,
    dimensions: EMBEDDING_DIMENSIONS,
    timeout: EMBEDDING_TIMEOUT_MS,
    maxRetries: 1,
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
