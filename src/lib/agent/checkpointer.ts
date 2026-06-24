import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

let checkpointer: PostgresSaver | null = null;
let setupPromise: Promise<void> | null = null;

export async function getCheckpointer(): Promise<PostgresSaver> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!checkpointer) {
    checkpointer = PostgresSaver.fromConnString(url);
  }

  if (!setupPromise) {
    setupPromise = checkpointer.setup().catch((err) => {
      setupPromise = null;
      throw err;
    });
  }

  await setupPromise;
  return checkpointer;
}
