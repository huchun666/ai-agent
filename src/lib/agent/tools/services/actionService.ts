import { randomUUID } from "crypto";
import type {
  ActionPayload,
  CreateOrderPayload,
  EmailResult,
  OrderResult,
  SendEmailPayload,
  SystemAction,
  ToolResult,
} from "@/lib/agent/tools/types";

const mockOrders: OrderResult[] = [];
const mockEmails: EmailResult[] = [];

function createOrder(
  payload: CreateOrderPayload
): ToolResult<OrderResult> {
  if (!payload.productId?.trim()) {
    return { success: false, error: "productId 不能为空", code: "INVALID_PAYLOAD" };
  }
  if (!payload.quantity || payload.quantity < 1) {
    return { success: false, error: "quantity 必须大于 0", code: "INVALID_PAYLOAD" };
  }

  const order: OrderResult = {
    orderId: `o-${randomUUID().slice(0, 8)}`,
    productId: payload.productId,
    quantity: payload.quantity,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  mockOrders.push(order);

  return { success: true, data: order };
}

function sendEmail(
  payload: SendEmailPayload
): ToolResult<EmailResult> {
  if (!payload.to?.trim()) {
    return { success: false, error: "收件人 to 不能为空", code: "INVALID_PAYLOAD" };
  }
  if (!payload.subject?.trim()) {
    return { success: false, error: "邮件主题 subject 不能为空", code: "INVALID_PAYLOAD" };
  }
  if (!payload.body?.trim()) {
    return { success: false, error: "邮件正文 body 不能为空", code: "INVALID_PAYLOAD" };
  }

  const email: EmailResult = {
    messageId: `msg-${randomUUID().slice(0, 8)}`,
    to: payload.to,
    subject: payload.subject,
    status: "sent",
    sentAt: new Date().toISOString(),
  };

  mockEmails.push(email);

  return { success: true, data: email };
}

export async function executeSystemAction(
  action: SystemAction,
  payload: ActionPayload
): Promise<ToolResult<OrderResult | EmailResult>> {
  switch (action) {
    case "create_order":
      return createOrder(payload as CreateOrderPayload);
    case "send_email":
      return sendEmail(payload as SendEmailPayload);
    default:
      return {
        success: false,
        error: `不支持的操作：${action as string}`,
        code: "UNKNOWN_ACTION",
      };
  }
}

/** 测试/调试用途 */
export function getMockActionHistory() {
  return { orders: [...mockOrders], emails: [...mockEmails] };
}
