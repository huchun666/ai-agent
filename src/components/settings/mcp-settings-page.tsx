"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Loader2,
  Trash2,
  Plug,
  Play,
  Power,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { McpServerSummary } from "@/types/knowledge";

const TRANSPORT_OPTIONS = [
  { value: "stdio", label: "Stdio（本地）" },
  { value: "http", label: "HTTP（远程）" },
  { value: "sse", label: "SSE（远程）" },
];

export function McpSettingsPage() {
  const [servers, setServers] = useState<McpServerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    transport: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-everything",
    url: "",
    headers: "",
  });

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/mcp");
    if (res.ok) {
      const data = await res.json();
      setServers(data.servers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleCreate = async () => {
    setError(null);
    const args = form.args
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let headers: Record<string, string> | undefined;
    if (form.headers.trim()) {
      try {
        headers = JSON.parse(form.headers);
      } catch {
        setError("Headers 必须是合法 JSON");
        return;
      }
    }

    const res = await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        transport: form.transport,
        command: form.transport === "stdio" ? form.command : undefined,
        args: form.transport === "stdio" ? args : undefined,
        url: form.transport !== "stdio" ? form.url : undefined,
        headers,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "创建失败");
      return;
    }

    setDialogOpen(false);
    setForm({
      name: "",
      transport: "stdio",
      command: "npx",
      args: "-y @modelcontextprotocol/server-everything",
      url: "",
      headers: "",
    });
    await fetchServers();
  };

  const handleToggle = async (server: McpServerSummary) => {
    await fetch(`/api/mcp/${server.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !server.enabled }),
    });
    await fetchServers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此 MCP 服务器？")) return;
    await fetch(`/api/mcp/${id}`, { method: "DELETE" });
    await fetchServers();
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    const res = await fetch(`/api/mcp/${id}/test`, { method: "POST" });
    const data = await res.json();
    setTesting(null);
    if (data.success) {
      setTestResult(
        `连接成功，发现 ${data.toolCount} 个工具: ${data.tools.join(", ")}`
      );
    } else {
      setTestResult(`连接失败: ${data.error ?? "未知错误"}`);
    }
  };

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h1 className="text-lg font-semibold">MCP 工具</h1>
            <p className="text-sm text-zinc-500">
              动态加载 Model Context Protocol 服务器扩展 Agent 能力
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            添加服务器
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Vercel 部署仅支持 HTTP/SSE 远程 MCP；Stdio 模式仅在本地开发可用。
          </div>

          {testResult && (
            <div className="mb-4 rounded-lg bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-800">
              {testResult}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : servers.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">
              暂无 MCP 服务器，点击右上角添加
            </p>
          ) : (
            <div className="space-y-2">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <Plug className="h-6 w-6 shrink-0 text-purple-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{server.name}</p>
                    <p className="text-xs text-zinc-500">
                      {server.transport.toUpperCase()}
                      {server.transport === "stdio"
                        ? ` · ${server.command} ${server.args?.join(" ") ?? ""}`
                        : ` · ${server.url}`}
                    </p>
                  </div>
                  <span
                    className={
                      server.enabled
                        ? "text-xs text-green-600"
                        : "text-xs text-zinc-400"
                    }
                  >
                    {server.enabled ? "已启用" : "已禁用"}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={testing === server.id}
                      onClick={() => handleTest(server.id)}
                    >
                      {testing === server.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggle(server)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(server.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加 MCP 服务器</DialogTitle>
            <DialogDescription>
              配置 MCP 服务器连接信息，工具将自动加载到 Agent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">名称</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="my-mcp-server"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">传输协议</label>
              <select
                value={form.transport}
                onChange={(e) =>
                  setForm({ ...form, transport: e.target.value })
                }
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {TRANSPORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {form.transport === "stdio" ? (
              <>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Command
                  </label>
                  <Input
                    value={form.command}
                    onChange={(e) =>
                      setForm({ ...form, command: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Args（空格分隔）
                  </label>
                  <Input
                    value={form.args}
                    onChange={(e) =>
                      setForm({ ...form, args: e.target.value })
                    }
                    placeholder="-y @modelcontextprotocol/server-everything"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">URL</label>
                  <Input
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://example.com/mcp"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Headers（JSON，可选）
                  </label>
                  <Input
                    value={form.headers}
                    onChange={(e) =>
                      setForm({ ...form, headers: e.target.value })
                    }
                    placeholder='{"Authorization": "Bearer token"}'
                  />
                </div>
              </>
            )}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <Button onClick={handleCreate} className="w-full">
              添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
