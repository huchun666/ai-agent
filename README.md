# AI Agent — DeepSeek + LangGraph

通用 AI 助手，基于 Next.js + LangGraph + DeepSeek，支持工具调用、会话持久化、Human-in-the-loop 工具审批、RAG 知识库、MCP 动态工具。

## 功能

| 阶段 | 内容 |
|------|------|
| **P0** | LangGraph ReAct Agent、SSE 流式输出、Chat UI |
| **P1** | PostgreSQL 持久化、Thread 管理、LangGraph Checkpoint |
| **P2** | 内置工具（计算器、时间、笔记读写） |
| **P3** | 敏感工具需用户审批（Human-in-the-loop） |
| **P4** | RAG 知识库：文档上传、分块、向量化、自动检索 |
| **P5** | MCP 动态工具：从数据库加载 MCP 服务器扩展 Agent |

## 技术栈

- Next.js 16 (App Router, Node.js Runtime)
- LangGraph.js + LangChain.js
- DeepSeek API (`deepseek-chat`)
- PostgreSQL + pgvector + Prisma
- `@langchain/mcp-adapters` (MCP)

## 快速开始

### 1. 环境变量

```bash
cp .env.example .env
```

必填：
- `DEEPSEEK_API_KEY` — DeepSeek 对话 API
- `DATABASE_URL` — PostgreSQL 连接串
- `EMBEDDING_API_KEY` — Embedding API（知识库需要，OpenAI 兼容接口）

> DeepSeek 不提供 Embedding API，请使用 OpenAI、SiliconFlow、OpenRouter 等兼容服务。

### 2. 启动数据库

```bash
docker compose up -d
```

使用 pgvector 镜像，默认端口 **5433**。

### 3. 数据库迁移

```bash
npm run db:push
```

pgvector 扩展和 embedding 列在首次索引文档时自动创建。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 页面

| 路径 | 功能 |
|------|------|
| `/chat` | 对话界面 |
| `/knowledge` | 知识库管理（上传/删除文档） |
| `/settings/mcp` | MCP 服务器配置 |

## Agent 图拓扑

```
START → retriever（RAG 检索）→ agent ↔ tools → END
```

- **retriever**：从用户知识库向量检索相关内容
- **agent**：DeepSeek + 内置工具 + MCP 工具
- **tools**：执行工具（敏感操作需审批）

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量（含 `EMBEDDING_*`）
4. `DATABASE_URL` 使用 Neon / Vercel Postgres 连接池 URL

> Vercel 上 **Stdio MCP 不可用**，仅支持 HTTP/SSE 远程 MCP。

## 内置工具

| 工具 | 说明 | 需审批 |
|------|------|--------|
| `calculator` | 数学计算 | 否 |
| `get_current_time` | 当前北京时间 | 否 |
| `read_note` / `list_notes` | 读取笔记 | 否 |
| `write_note` | 保存笔记 | **是** |
| `delete_note` | 删除笔记 | **是** |

MCP 工具的 `write_file` / `delete_file` / `edit_file` 也需审批。

## 测试 RAG

1. 进入「知识库」，上传 `.txt` 或 `.md` 文件
2. 等待状态变为「已就绪」
3. 在对话中提问文档相关内容

## 测试 MCP（本地）

1. 进入「MCP 工具」，添加 Stdio 服务器：
   - Command: `npx`
   - Args: `-y @modelcontextprotocol/server-everything`
2. 点击测试连接
3. 在对话中使用 MCP 提供的工具
