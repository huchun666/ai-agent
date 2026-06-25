/** HTTP 方法 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** 工具统一成功响应 */
export interface ToolSuccess<T = unknown> {
  success: true;
  data: T;
}

/** 工具统一失败响应 */
export interface ToolError {
  success: false;
  error: string;
  code?: string;
}

export type ToolResult<T = unknown> = ToolSuccess<T> | ToolError;

/** HTTP 请求参数 */
export interface HttpRequestInput {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
}

/** HTTP 响应结构 */
export interface HttpResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
}

/** 数据库查询结果行 */
export type DbRow = Record<string, unknown>;

/** 检索到的文档 */
export interface RetrievedDocument {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/** 系统操作类型 */
export type SystemAction = "create_order" | "send_email";

/** 创建订单 payload */
export interface CreateOrderPayload {
  productId: string;
  quantity: number;
  userId?: string;
}

/** 发送邮件 payload */
export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export type ActionPayload = CreateOrderPayload | SendEmailPayload;

/** 订单创建结果 */
export interface OrderResult {
  orderId: string;
  productId: string;
  quantity: number;
  status: "pending" | "confirmed";
  createdAt: string;
}

/** 邮件发送结果 */
export interface EmailResult {
  messageId: string;
  to: string;
  subject: string;
  status: "queued" | "sent";
  sentAt: string;
}

/** 代码执行结果 */
export interface CodeExecutionResult {
  result: unknown;
  logs: string[];
}
