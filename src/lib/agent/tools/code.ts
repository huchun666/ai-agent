import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { CodeExecutionResult, ToolResult } from "@/lib/agent/tools/types";

const FORBIDDEN_PATTERNS = [
  /\bprocess\b/,
  /\brequire\s*\(/,
  /\bimport\s*\(/,
  /\bimport\s+/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bglobalThis\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
  /\bfs\b/,
  /\bchild_process\b/,
  /\bmodule\b/,
  /\bexports\b/,
];

const MAX_CODE_LENGTH = 10_000;
const EXECUTION_TIMEOUT_MS = 5_000;

const SAFE_GLOBALS = {
  Math,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Map,
  Set,
  Promise,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  RegExp,
};

async function runSandboxedCode(
  code: string
): Promise<ToolResult<CodeExecutionResult>> {
  if (code.length > MAX_CODE_LENGTH) {
    return {
      success: false,
      error: `代码长度超过限制（最大 ${MAX_CODE_LENGTH} 字符）`,
      code: "CODE_TOO_LONG",
    };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      return {
        success: false,
        error: "代码包含禁止访问的 API（process、fs、require、import 等）",
        code: "FORBIDDEN_CODE",
      };
    }
  }

  const logs: string[] = [];
  const sandboxConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map((a) => String(a)).join(" "));
    },
  };

  try {
    const wrappedCode = `
      "use strict";
      return (async () => {
        ${code}
      })();
    `;

    const AsyncFunction = Object.getPrototypeOf(
      async function () {}
    ).constructor as new (
      ...args: string[]
    ) => (...fnArgs: unknown[]) => Promise<unknown>;

    const fn = new AsyncFunction(
      ...Object.keys(SAFE_GLOBALS),
      "console",
      wrappedCode
    );

    const result = await Promise.race([
      fn(...Object.values(SAFE_GLOBALS), sandboxConsole),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("代码执行超时")),
          EXECUTION_TIMEOUT_MS
        )
      ),
    ]);

    return {
      success: true,
      data: { result, logs },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "代码执行失败",
      code: "EXECUTION_ERROR",
    };
  }
}

export const runCodeTool = tool(
  async ({ code }) => {
    const result = await runSandboxedCode(code);
    return JSON.stringify(result, null, 2);
  },
  {
    name: "run_code",
    description: `在受限沙箱中执行 JavaScript 代码并返回结果。适用于：
- 数据计算、格式转换、逻辑验证
- 对 JSON 数据进行 map/filter/reduce 处理

安全限制：禁止访问 process、fs、require、import、eval 等。
可用全局对象：Math、Date、JSON、Array、Object 等。
支持 async/await，超时 5 秒。
返回 { result, logs } 或 error 信息。`,
    schema: z.object({
      code: z
        .string()
        .min(1)
        .describe(
          "要执行的 JavaScript 代码。最后一行表达式的值将作为 result 返回，也可用 return 语句"
        ),
    }),
  }
);
