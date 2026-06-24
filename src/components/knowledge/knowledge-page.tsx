"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DocumentSummary } from "@/types/knowledge";

const STATUS_MAP: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  pending: { label: "待处理", icon: Clock, className: "text-zinc-500" },
  processing: { label: "处理中", icon: Loader2, className: "text-blue-500" },
  ready: { label: "已就绪", icon: CheckCircle2, className: "text-green-600" },
  failed: { label: "失败", icon: XCircle, className: "text-red-500" },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function KnowledgePage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/knowledge");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "上传失败");
      } else if (data.ingestError) {
        setError(`「${file.name}」上传成功但索引失败: ${data.ingestError}`);
      }
    }

    await fetchDocuments();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReingest = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/knowledge/${id}/ingest`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "重新索引失败");
    }
    await fetchDocuments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此文档？")) return;
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    await fetchDocuments();
  };

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <main className="flex flex-1 flex-col">
        <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h1 className="text-lg font-semibold">知识库</h1>
          <p className="text-sm text-zinc-500">
            上传文档后自动分块、向量化。对话时 Agent 会自动检索相关内容。
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div
            className={cn(
              "mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 p-10 transition-colors dark:border-zinc-700",
              uploading && "opacity-60"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleUpload(e.dataTransfer.files);
            }}
          >
            <Upload className="mb-3 h-8 w-8 text-zinc-400" />
            <p className="mb-1 text-sm font-medium">拖拽文件到此处，或点击上传</p>
            <p className="mb-4 text-xs text-zinc-400">
              支持 txt、md、json、csv，最大 5MB
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.json,.csv,text/*,application/json"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  上传中…
                </>
              ) : (
                "选择文件"
              )}
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">暂无文档</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const status = STATUS_MAP[doc.status] ?? STATUS_MAP.pending;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <FileText className="h-8 w-8 shrink-0 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{doc.filename}</p>
                      <p className="text-xs text-zinc-500">
                        {formatSize(doc.size)}
                        {doc.chunkCount > 0 && ` · ${doc.chunkCount} 个片段`}
                      </p>
                      {doc.errorMessage && (
                        <p className="mt-1 text-xs text-red-500">
                          {doc.errorMessage}
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs",
                        status.className
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "h-3.5 w-3.5",
                          doc.status === "processing" && "animate-spin"
                        )}
                      />
                      {status.label}
                    </div>
                    <div className="flex gap-1">
                      {doc.status === "failed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReingest(doc.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
