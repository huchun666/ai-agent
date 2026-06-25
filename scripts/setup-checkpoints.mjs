import "dotenv/config";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not configured");
  process.exit(1);
}

const checkpointer = PostgresSaver.fromConnString(url, { schema: "langgraph" });
await checkpointer.setup();
console.log("LangGraph checkpoint tables ready (schema: langgraph)");
