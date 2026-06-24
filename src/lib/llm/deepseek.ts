import { ChatOpenAI } from "@langchain/openai";

export function createDeepSeekModel() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  return new ChatOpenAI({
    model: "deepseek-chat",
    apiKey,
    temperature: 0.7,
    streaming: true,
    configuration: {
      baseURL: "https://api.deepseek.com",
    },
  });
}
