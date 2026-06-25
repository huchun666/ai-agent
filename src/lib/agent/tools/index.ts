import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { httpRequestTool } from "@/lib/agent/tools/http";
import { dbQueryTool } from "@/lib/agent/tools/db";
import { runCodeTool } from "@/lib/agent/tools/code";
import { retrieveDocsTool } from "@/lib/agent/tools/docs";
import { performActionTool } from "@/lib/agent/tools/action";

const notes = new Map<string, string>();

export const calculatorTool = tool(
  async ({ expression }) => {
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
    if (!sanitized.trim()) {
      return JSON.stringify({ success: false, error: "无效的数学表达式" });
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result !== "number" || !Number.isFinite(result)) {
        return JSON.stringify({ success: false, error: "计算结果无效" });
      }
      return JSON.stringify({ success: true, data: { result } });
    } catch {
      return JSON.stringify({ success: false, error: "无法计算该表达式" });
    }
  },
  {
    name: "calculator",
    description: "计算数学表达式，支持 + - * / () 和 %",
    schema: z.object({
      expression: z.string().describe("数学表达式，例如 (2 + 3) * 4"),
    }),
  }
);

export const getCurrentTimeTool = tool(
  async () => {
    const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    return JSON.stringify({ success: true, data: { time: now, timezone: "Asia/Shanghai" } });
  },
  {
    name: "get_current_time",
    description: "获取当前北京时间",
    schema: z.object({}),
  }
);

export const writeNoteTool = tool(
  async ({ key, content }) => {
    notes.set(key, content);
    return JSON.stringify({ success: true, data: { key, saved: true } });
  },
  {
    name: "write_note",
    description: "保存一条笔记（需要用户审批后执行）",
    schema: z.object({
      key: z.string().describe("笔记标题或键名"),
      content: z.string().describe("笔记内容"),
    }),
  }
);

export const readNoteTool = tool(
  async ({ key }) => {
    const content = notes.get(key);
    if (!content) {
      return JSON.stringify({ success: false, error: `未找到笔记「${key}」` });
    }
    return JSON.stringify({ success: true, data: { key, content } });
  },
  {
    name: "read_note",
    description: "读取已保存的笔记",
    schema: z.object({
      key: z.string().describe("笔记标题或键名"),
    }),
  }
);

export const deleteNoteTool = tool(
  async ({ key }) => {
    const existed = notes.delete(key);
    return JSON.stringify({
      success: existed,
      data: existed ? { key, deleted: true } : undefined,
      error: existed ? undefined : `未找到笔记「${key}」`,
    });
  },
  {
    name: "delete_note",
    description: "删除一条笔记（需要用户审批后执行）",
    schema: z.object({
      key: z.string().describe("要删除的笔记键名"),
    }),
  }
);

export const listNotesTool = tool(
  async () => {
    const keys = [...notes.keys()];
    return JSON.stringify({ success: true, data: { keys, count: keys.length } });
  },
  {
    name: "list_notes",
    description: "列出所有已保存的笔记标题",
    schema: z.object({}),
  }
);

// ── 生产级核心工具（re-export）──────────────────────────────────
export {
  httpRequestTool,
  dbQueryTool,
  runCodeTool,
  retrieveDocsTool,
  performActionTool,
};

/** 5 个生产级核心工具 */
export const productionTools = [
  httpRequestTool,
  dbQueryTool,
  runCodeTool,
  retrieveDocsTool,
  performActionTool,
];

/** 全部内置工具（含笔记、计算器等） */
export const agentTools = [
  ...productionTools,
  calculatorTool,
  getCurrentTimeTool,
  writeNoteTool,
  readNoteTool,
  deleteNoteTool,
  listNotesTool,
];

export const BASE_SYSTEM_PROMPT = `你是一个通用 AI 助手，由 DeepSeek 驱动。你可以帮助用户回答问题、进行推理、使用工具完成任务。

## 核心工具
- http_request: 调用外部 HTTP API（GET/POST/PUT/DELETE）
- db_query: 只读数据库查询（SELECT），表：users / products / orders
- run_code: 沙箱执行 JavaScript 进行计算或数据处理
- retrieve_docs: 从知识库检索政策、流程、技术文档
- perform_action: 系统写操作（create_order / send_email，需用户审批）

## 辅助工具
- calculator: 数学计算
- get_current_time: 获取当前时间
- write_note / read_note / delete_note / list_notes: 笔记管理（写入和删除需要用户审批）

## 规则
1. 需要调用 API 时使用 http_request，不要编造 API 响应
2. 需要查业务数据时使用 db_query，仅使用 SELECT
3. 复杂计算或数据转换优先使用 run_code 或 calculator
4. 回答政策/流程类问题前先使用 retrieve_docs 检索
5. 创建订单或发邮件必须使用 perform_action
6. 如提供了知识库上下文，优先基于上下文回答并注明来源
7. 回答使用中文，简洁清晰
8. 工具返回 JSON，解析后向用户说明结果；失败时说明原因`;

/** @deprecated use BASE_SYSTEM_PROMPT */
export const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;
