import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { executeReadOnlyQuery } from "@/lib/agent/tools/services/dbService";

export const dbQueryTool = tool(
  async ({ sql }) => {
    const result = executeReadOnlyQuery(sql);
    return JSON.stringify(result, null, 2);
  },
  {
    name: "db_query",
    description: `执行只读数据库查询（SELECT），返回 JSON 结果集。适用于：
- 查询用户、产品、订单等业务数据
- 获取统计信息（配合 LIMIT）

仅支持 SELECT 语句，禁止 DELETE / UPDATE / INSERT 等写操作。
可用表：users, products, orders。
示例：SELECT * FROM users WHERE role = 'admin' LIMIT 10`,
    schema: z.object({
      sql: z
        .string()
        .min(1)
        .describe("只读 SQL 查询语句，必须是 SELECT 开头"),
    }),
  }
);
