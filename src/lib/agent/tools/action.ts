import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { executeSystemAction } from "@/lib/agent/tools/services/actionService";

const createOrderPayloadSchema = z.object({
  productId: z.string().describe("产品 ID，如 p-001"),
  quantity: z.number().int().min(1).describe("购买数量"),
  userId: z.string().optional().describe("可选的用户 ID"),
});

const sendEmailPayloadSchema = z.object({
  to: z.string().email().describe("收件人邮箱"),
  subject: z.string().min(1).describe("邮件主题"),
  body: z.string().min(1).describe("邮件正文"),
});

export const performActionTool = tool(
  async ({ action, payload }) => {
    const result = await executeSystemAction(action, payload);
    return JSON.stringify(result, null, 2);
  },
  {
    name: "perform_action",
    description: `执行系统级操作（写操作，可能需要用户审批）。适用于：
- create_order: 为用户创建订单，需 productId 和 quantity
- send_email: 发送邮件通知，需 to、subject、body

调用前请确认用户意图。返回结构化 JSON 含 orderId / messageId 或 error。`,
    schema: z.object({
      action: z
        .enum(["create_order", "send_email"])
        .describe("要执行的系统操作类型"),
      payload: z
        .union([createOrderPayloadSchema, sendEmailPayloadSchema])
        .describe("操作参数，create_order 和 send_email 字段不同"),
    }),
  }
);
