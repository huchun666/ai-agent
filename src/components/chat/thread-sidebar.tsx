"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, MessageSquare, Trash2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ThreadSummary } from "@/types/agent";

interface ThreadSidebarProps {
  threads: ThreadSummary[];
  onNewChat: () => void;
  onDeleteThread: (id: string) => void;
}

export function ThreadSidebar({
  threads,
  onNewChat,
  onDeleteThread,
}: ThreadSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("确定删除此对话？")) return;
    await onDeleteThread(id);
    if (pathname.includes(id)) {
      router.push("/chat");
    }
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
        <Bot className="h-5 w-5 text-blue-600" />
        <span className="font-semibold">AI Agent</span>
      </div>

      <div className="p-3">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          新对话
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {threads.map((thread) => {
            const isActive = pathname === `/chat/${thread.id}`;
            return (
              <Link
                key={thread.id}
                href={`/chat/${thread.id}`}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-zinc-200 dark:bg-zinc-800"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="flex-1 truncate">
                  {thread.title ?? "新对话"}
                </span>
                <button
                  onClick={(e) => handleDelete(e, thread.id)}
                  className="hidden shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-300 hover:text-red-500 group-hover:block dark:hover:bg-zinc-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Link>
            );
          })}
          {threads.length === 0 && (
            <p className="px-3 py-2 text-xs text-zinc-400">暂无对话</p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
