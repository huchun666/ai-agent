import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

/** LangGraph checkpoint 专用 schema，避免被 Prisma db push 误删 */
const CHECKPOINT_SCHEMA = "langgraph";

let checkpointer: PostgresSaver | null = null;

export async function getCheckpointer(): Promise<PostgresSaver> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!checkpointer) {
    checkpointer = PostgresSaver.fromConnString(url, {
      schema: CHECKPOINT_SCHEMA,
    });
  }

  // setup 幂等：表不存在时创建，已存在时仅跑增量 migration
  await checkpointer.setup();
  return checkpointer;
}
