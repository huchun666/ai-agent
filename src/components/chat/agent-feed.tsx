"use client";

import { cn } from "@/lib/utils";
import { Bot, Loader2, Wrench, BookOpen } from "lucide-react";

const NODE_LABELS: Record<string, string> = {
  retriever: "检索知识库",
  agent: "思考中",
  tools: "执行工具",
};

interface AgentFeedProps {
  currentNode: string | null;
  isStreaming: boolean;
}

export function AgentFeed({ currentNode, isStreaming }: AgentFeedProps) {
  if (!isStreaming && !currentNode) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
      {currentNode === "tools" ? (
        <Wrench className="h-4 w-4 animate-pulse text-amber-500" />
      ) : currentNode === "retriever" ? (
        <BookOpen className="h-4 w-4 animate-pulse text-green-500" />
      ) : (
        <Bot className="h-4 w-4 animate-pulse text-blue-500" />
      )}
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>
        {currentNode ? NODE_LABELS[currentNode] ?? currentNode : "处理中"}
        …
      </span>
    </div>
  );
}

interface ToolCallBadgeProps {
  name: string;
  args?: Record<string, unknown>;
  className?: string;
}

export function ToolCallBadge({ name, args, className }: ToolCallBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
        className
      )}
    >
      <Wrench className="h-3 w-3" />
      <span className="font-medium">{name}</span>
      {args && (
        <span className="text-amber-600 dark:text-amber-400">
          {JSON.stringify(args).slice(0, 60)}
        </span>
      )}
    </div>
  );
}
