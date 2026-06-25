import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { executeHttpRequest } from "@/lib/agent/tools/services/httpService";

const httpMethodSchema = z.enum(["GET", "POST", "PUT", "DELETE"]);

export const httpRequestTool = tool(
  async ({ url, method, headers, body }) => {
    const result = await executeHttpRequest({ url, method, headers, body });
    return JSON.stringify(result, null, 2);
  },
  {
    name: "http_request",
    description: `发送 HTTP 请求并返回结构化响应。适用于：
- 调用外部 REST API 获取数据
- 向 webhook 发送 POST 请求
- 查询公开 HTTP 接口

支持 GET / POST / PUT / DELETE。GET 请求不需要 body。
返回 JSON 包含 status、headers、body 或 error 信息。`,
    schema: z.object({
      url: z.string().url().describe("完整的请求 URL，必须是 http:// 或 https://"),
      method: httpMethodSchema.describe("HTTP 方法"),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe("可选的请求头，如 { \"Authorization\": \"Bearer xxx\" }"),
      body: z
        .union([z.string(), z.record(z.string(), z.unknown())])
        .optional()
        .describe("请求体，POST/PUT 时使用。可传 JSON 对象或字符串"),
    }),
  }
);
