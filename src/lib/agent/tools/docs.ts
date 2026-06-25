import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { RetrievedDocument, ToolResult } from "@/lib/agent/tools/types";

/** Mock 知识库文档 */
const MOCK_DOCUMENTS: Omit<RetrievedDocument, "score">[] = [
  {
    id: "doc-001",
    title: "退款政策",
    content:
      "用户可在购买后 7 天内申请无理由退款。定制商品不支持退款。退款将在 3-5 个工作日内原路返回。",
    metadata: { category: "policy", updatedAt: "2025-01-15" },
  },
  {
    id: "doc-002",
    title: "配送说明",
    content:
      "标准配送 3-5 个工作日，加急配送 1-2 个工作日。满 99 元免运费，偏远地区可能额外收取运费。",
    metadata: { category: "shipping", updatedAt: "2025-02-01" },
  },
  {
    id: "doc-003",
    title: "会员权益",
    content:
      "VIP 会员享受 9 折优惠、专属客服、生日礼券。会员等级根据年度消费金额自动升级。",
    metadata: { category: "membership", updatedAt: "2025-03-10" },
  },
  {
    id: "doc-004",
    title: "API 认证指南",
    content:
      "所有 API 请求需在 Header 中携带 Authorization: Bearer <token>。Token 可通过 /auth/login 接口获取，有效期 24 小时。",
    metadata: { category: "technical", updatedAt: "2025-04-20" },
  },
  {
    id: "doc-005",
    title: "产品保修条款",
    content:
      "电子产品享受 1 年质保，人为损坏不在保修范围。保修期内免费维修，超期可付费维修。",
    metadata: { category: "policy", updatedAt: "2025-01-20" },
  },
];

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,，。.!?；;]+/)
    .filter((t) => t.length > 0);
}

function scoreDocument(
  doc: Omit<RetrievedDocument, "score">,
  tokens: string[]
): number {
  const text = `${doc.title} ${doc.content}`.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (text.includes(token)) {
      score += token.length >= 2 ? 2 : 1;
    }
  }
  if (doc.title.toLowerCase().includes(tokens.join(" "))) {
    score += 3;
  }
  return score;
}

function retrieveDocuments(
  query: string,
  topK = 3
): ToolResult<{ documents: RetrievedDocument[]; query: string }> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: false, error: "查询内容不能为空", code: "EMPTY_QUERY" };
  }

  const tokens = tokenize(trimmed);
  const scored = MOCK_DOCUMENTS.map((doc) => ({
    ...doc,
    score: scoreDocument(doc, tokens),
  }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return {
    success: true,
    data: { documents: scored, query: trimmed },
  };
}

export const retrieveDocsTool = tool(
  async ({ query, topK }) => {
    const result = retrieveDocuments(query, topK);
    return JSON.stringify(result, null, 2);
  },
  {
    name: "retrieve_docs",
    description: `从知识库中检索与查询最相关的文档（模拟向量检索）。适用于：
- 回答政策、流程、产品说明类问题
- 查找技术文档、FAQ
- 需要引用内部知识而非凭空回答时

基于关键词匹配返回最相关文档，含 title、content、score。
无匹配时返回空列表。`,
    schema: z.object({
      query: z
        .string()
        .min(1)
        .describe("检索查询，描述你想查找的信息"),
      topK: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .default(3)
        .describe("返回的最大文档数量，默认 3"),
    }),
  }
);
