"use client";

import { AgentFeed } from "@/components/chat/agent-feed";
import { MessageInput } from "@/components/chat/message-input";
import { MessageList } from "@/components/chat/message-list";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ToolApprovalDialog } from "@/components/chat/tool-approval-dialog";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { useEffect, useRef } from "react";

interface ChatInterfaceProps {
  threadId?: string;
}

export function ChatInterface({ threadId: initialThreadId }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    threads,
    streamingContent,
    isStreaming,
    currentNode,
    approvalRequest,
    error,
    sendMessage,
    handleApproval,
    createNewChat,
    deleteThread,
    stopStreaming,
  } = useAgentChat(initialThreadId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex h-screen">
      <AppSidebar
        threads={threads}
        onNewChat={createNewChat}
        onDeleteThread={deleteThread}
      />

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <div>
            <h1 className="text-sm font-medium">通用 AI 助手</h1>
            <p className="text-xs text-zinc-500">DeepSeek · LangGraph · RAG · MCP</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 && !streamingContent ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30">
                <p className="text-lg font-medium">你好，有什么可以帮你的？</p>
                <p className="mt-1 text-sm text-zinc-500">
                  我可以计算、查时间、管理笔记。保存/删除笔记需要你的审批。
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "现在几点了？",
                  "计算 (128 + 256) * 3",
                  "帮我保存一条笔记，标题是 todo，内容是买牛奶",
                ].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => sendMessage(hint)}
                    disabled={isStreaming}
                    className="rounded-full border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <MessageList
              messages={messages}
              streamingContent={streamingContent}
            />
          )}
        </div>

        <AgentFeed currentNode={currentNode} isStreaming={isStreaming} />

        {error && (
          <div className="mx-4 mb-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <MessageInput
          onSend={sendMessage}
          onStop={stopStreaming}
          disabled={!!approvalRequest}
          isStreaming={isStreaming}
        />
      </main>

      <ToolApprovalDialog
        request={approvalRequest}
        open={!!approvalRequest}
        onApprove={() => handleApproval(true)}
        onReject={() => handleApproval(false)}
        isLoading={isStreaming}
      />
    </div>
  );
}
