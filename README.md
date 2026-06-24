# AI Agent — DeepSeek + LangGraph

通用 AI 助手，基于 Next.js + LangGraph + DeepSeek，支持工具调用、会话持久化、Human-in-the-loop 工具审批。

## 功能

- **P0** — LangGraph ReAct Agent、SSE 流式输出、Chat UI
- **P1** — PostgreSQL 持久化、Thread 管理、LangGraph Checkpoint 多轮对话
- **P2** — 内置工具（计算器、时间、笔记读写）
- **P3** — 敏感工具（写/删笔记）需用户审批后执行

## 技术栈

- Next.js 16 (App Router, Node.js Runtime)
- LangGraph.js + LangChain.js
- DeepSeek API (`deepseek-chat`)
- PostgreSQL + Prisma
- Tailwind CSS

## 快速开始

### 1. 环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DATABASE_URL=postgresql://aiagent:aiagent@localhost:5432/aiagent
```

### 2. 启动数据库

```bash
docker compose up -d
```

### 3. 数据库迁移

```bash
npm run db:push
```

LangGraph Checkpoint 表会在首次 API 调用时自动创建。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：
   - `DEEPSEEK_API_KEY`
   - `DATABASE_URL`（推荐 Neon 或 Vercel Postgres，使用连接池 URL）
4. 部署

> API Routes 使用 `runtime = "nodejs"`，`maxDuration = 60` 秒。

## 项目结构

```
src/
├── app/api/
│   ├── agent/stream/    # Agent SSE 流式接口
│   ├── agent/approve/   # 工具审批恢复
│   └── threads/         # 会话 CRUD
├── lib/agent/
│   ├── graph/           # LangGraph 状态图
│   ├── tools/           # 内置工具
│   └── checkpointer.ts  # Postgres Checkpoint
├── components/chat/     # Chat UI 组件
├── hooks/               # useAgentChat
└── services/            # 业务逻辑
```

## 内置工具

| 工具 | 说明 | 需审批 |
|------|------|--------|
| `calculator` | 数学计算 | 否 |
| `get_current_time` | 当前北京时间 | 否 |
| `read_note` / `list_notes` | 读取笔记 | 否 |
| `write_note` | 保存笔记 | **是** |
| `delete_note` | 删除笔记 | **是** |

## 测试工具审批

发送：`帮我保存一条笔记，标题是 shopping，内容是买牛奶和鸡蛋`

Agent 会弹出审批对话框，批准后才会执行写入。
