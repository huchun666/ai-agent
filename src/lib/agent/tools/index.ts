import { tool } from "@langchain/core/tools";
import { z } from "zod";

const notes = new Map<string, string>();

export const calculatorTool = tool(
  async ({ expression }) => {
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
    if (!sanitized.trim()) {
      return "无效的数学表达式";
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result !== "number" || !Number.isFinite(result)) {
        return "计算结果无效";
      }
      return String(result);
    } catch {
      return "无法计算该表达式";
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
    return new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
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
    return `已保存笔记「${key}」`;
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
      return `未找到笔记「${key}」`;
    }
    return content;
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
    return existed ? `已删除笔记「${key}」` : `未找到笔记「${key}」`;
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
    if (keys.length === 0) return "暂无笔记";
    return keys.map((k) => `- ${k}`).join("\n");
  },
  {
    name: "list_notes",
    description: "列出所有已保存的笔记标题",
    schema: z.object({}),
  }
);

export const agentTools = [
  calculatorTool,
  getCurrentTimeTool,
  writeNoteTool,
  readNoteTool,
  deleteNoteTool,
  listNotesTool,
];

export const SYSTEM_PROMPT = `你是一个通用 AI 助手，由 DeepSeek 驱动。你可以帮助用户回答问题、进行推理、使用工具完成任务。

可用工具：
- calculator: 数学计算
- get_current_time: 获取当前时间
- write_note / read_note / delete_note / list_notes: 笔记管理（写入和删除需要用户审批）

规则：
1. 需要计算时使用 calculator，不要心算
2. 需要知道时间时使用 get_current_time
3. 用户要求保存或删除笔记时使用对应工具
4. 回答使用中文，简洁清晰
5. 工具执行失败时向用户说明原因`;
