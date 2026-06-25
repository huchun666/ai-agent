import type { DbRow, ToolResult } from "@/lib/agent/tools/types";

/** Mock 数据库表 */
const MOCK_TABLES: Record<string, DbRow[]> = {
  users: [
    { id: 1, name: "张三", email: "zhangsan@example.com", role: "admin" },
    { id: 2, name: "李四", email: "lisi@example.com", role: "user" },
    { id: 3, name: "王五", email: "wangwu@example.com", role: "user" },
  ],
  products: [
    { id: "p-001", name: "无线耳机", price: 299, stock: 120 },
    { id: "p-002", name: "机械键盘", price: 499, stock: 45 },
    { id: "p-003", name: "显示器", price: 1299, stock: 30 },
  ],
  orders: [
    { id: "o-1001", user_id: 1, product_id: "p-001", quantity: 2, status: "completed" },
    { id: "o-1002", user_id: 2, product_id: "p-002", quantity: 1, status: "pending" },
  ],
};

const DANGEROUS_KEYWORDS =
  /\b(DELETE|UPDATE|INSERT|DROP|ALTER|TRUNCATE|CREATE|REPLACE|MERGE|GRANT|REVOKE|EXEC|EXECUTE)\b/i;

const ALLOWED_KEYWORDS = /^\s*SELECT\b/i;

function extractTableName(sql: string): string | null {
  const match = sql.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function applyLimit(rows: DbRow[], sql: string): DbRow[] {
  const limitMatch = sql.match(/\bLIMIT\s+(\d+)/i);
  if (!limitMatch) return rows;
  const limit = parseInt(limitMatch[1], 10);
  return rows.slice(0, limit);
}

function applyWhereFilter(rows: DbRow[], sql: string): DbRow[] {
  const whereMatch = sql.match(/\bWHERE\s+(.+?)(?:\bORDER\b|\bLIMIT\b|$)/i);
  if (!whereMatch) return rows;

  const condition = whereMatch[1].trim();
  const eqMatch = condition.match(/(\w+)\s*=\s*['"]?([^'"]+)['"]?/i);
  if (!eqMatch) return rows;

  const [, column, value] = eqMatch;
  const parsedValue = /^\d+$/.test(value) ? Number(value) : value;

  return rows.filter((row) => row[column] === parsedValue);
}

export function executeReadOnlyQuery(
  sql: string
): ToolResult<{ rows: DbRow[]; rowCount: number; table: string | null }> {
  const trimmed = sql.trim();

  if (!trimmed) {
    return { success: false, error: "SQL 不能为空", code: "EMPTY_SQL" };
  }

  if (DANGEROUS_KEYWORDS.test(trimmed)) {
    return {
      success: false,
      error: "仅允许只读 SELECT 查询，禁止 DELETE / UPDATE / INSERT 等写操作",
      code: "FORBIDDEN_OPERATION",
    };
  }

  if (!ALLOWED_KEYWORDS.test(trimmed)) {
    return {
      success: false,
      error: "仅支持 SELECT 查询语句",
      code: "INVALID_SQL",
    };
  }

  const tableName = extractTableName(trimmed);
  if (!tableName) {
    return {
      success: false,
      error: "无法解析表名，请使用标准 SELECT ... FROM table_name 语法",
      code: "PARSE_ERROR",
    };
  }

  const table = MOCK_TABLES[tableName];
  if (!table) {
    return {
      success: false,
      error: `表「${tableName}」不存在。可用表：${Object.keys(MOCK_TABLES).join(", ")}`,
      code: "TABLE_NOT_FOUND",
    };
  }

  let rows = [...table];
  rows = applyWhereFilter(rows, trimmed);
  rows = applyLimit(rows, trimmed);

  return {
    success: true,
    data: { rows, rowCount: rows.length, table: tableName },
  };
}
