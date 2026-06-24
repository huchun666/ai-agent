"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ChatMessage,
  StreamEvent,
  ThreadSummary,
  ToolApprovalRequest,
} from "@/types/agent";

async function consumeSSE(
  response: Response,
  onEvent: (event: StreamEvent & { type: string }) => void
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {
          // skip malformed
        }
      }
    }
  }
}

export function useAgentChat(initialThreadId?: string) {
  const router = useRouter();
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [approvalRequest, setApprovalRequest] =
    useState<ToolApprovalRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const threadIdRef = useRef<string | undefined>(initialThreadId);

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const fetchThreads = useCallback(async () => {
    const res = await fetch("/api/threads");
    if (res.ok) {
      const data = await res.json();
      setThreads(data.threads);
    }
  }, []);

  const fetchThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/threads/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.thread.messages);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (initialThreadId) {
      setThreadId(initialThreadId);
      fetchThread(initialThreadId);
    }
  }, [initialThreadId, fetchThread]);

  const handleStreamEvent = useCallback(
    (event: StreamEvent & { type: string }) => {
      switch (event.type) {
        case "thread":
          if (event.data.threadId) {
            const newId = event.data.threadId as string;
            setThreadId(newId);
            threadIdRef.current = newId;
            // 仅更新 URL，避免 router.replace 触发页面重挂载导致 SSE 流中断
            window.history.replaceState(null, "", `/chat/${newId}`);
            fetchThreads();
          }
          break;
        case "node_start":
          setCurrentNode(event.data.node as string);
          break;
        case "node_end":
          break;
        case "token":
          setStreamingContent((prev) => prev + (event.data.content as string));
          break;
        case "interrupt":
          setApprovalRequest(event.data as unknown as ToolApprovalRequest);
          setIsStreaming(false);
          setCurrentNode(null);
          break;
        case "done":
          setStreamingContent((content) => {
            if (content) {
              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content,
                  createdAt: new Date().toISOString(),
                },
              ]);
            }
            return "";
          });
          setIsStreaming(false);
          setCurrentNode(null);
          fetchThreads();
          if (threadIdRef.current) {
            fetchThread(threadIdRef.current);
          }
          break;
        case "error":
          setError(event.data.message as string);
          setIsStreaming(false);
          setCurrentNode(null);
          setStreamingContent("");
          break;
      }
    },
    [fetchThreads, fetchThread]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      setError(null);
      setIsStreaming(true);
      setStreamingContent("");
      setCurrentNode(null);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: message,
          createdAt: new Date().toISOString(),
        },
      ]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/agent/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, threadId }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Request failed");
        }

        await consumeSSE(res, handleStreamEvent);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "发送失败");
        setIsStreaming(false);
      }
    },
    [threadId, handleStreamEvent]
  );

  const handleApproval = useCallback(
    async (approved: boolean) => {
      if (!threadId) return;

      setApprovalRequest(null);
      setIsStreaming(true);
      setStreamingContent("");
      setError(null);

      try {
        const res = await fetch("/api/agent/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, approved }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Approval failed");
        }

        await consumeSSE(res, handleStreamEvent);
      } catch (err) {
        setError(err instanceof Error ? err.message : "审批处理失败");
        setIsStreaming(false);
      }
    },
    [threadId, handleStreamEvent]
  );

  const createNewChat = useCallback(() => {
    setThreadId(undefined);
    setMessages([]);
    setStreamingContent("");
    setError(null);
    router.push("/chat");
  }, [router]);

  const deleteThread = useCallback(
    async (id: string) => {
      await fetch(`/api/threads/${id}`, { method: "DELETE" });
      await fetchThreads();
    },
    [fetchThreads]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setCurrentNode(null);
  }, []);

  return {
    threadId,
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
  };
}
