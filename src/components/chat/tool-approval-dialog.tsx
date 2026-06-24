"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToolCallBadge } from "@/components/chat/agent-feed";
import type { ToolApprovalRequest } from "@/types/agent";
import { AlertTriangle } from "lucide-react";

interface ToolApprovalDialogProps {
  request: ToolApprovalRequest | null;
  open: boolean;
  onApprove: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

export function ToolApprovalDialog({
  request,
  open,
  onApprove,
  onReject,
  isLoading,
}: ToolApprovalDialogProps) {
  if (!request) return null;

  return (
    <Dialog open={open}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            工具执行审批
          </DialogTitle>
          <DialogDescription>
            Agent 请求执行以下敏感操作，是否允许？
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <ToolCallBadge
            name={request.toolCall.name}
            args={request.toolCall.args}
            className="w-full flex-wrap"
          />
          <pre className="max-h-40 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
            {JSON.stringify(request.toolCall.args, null, 2)}
          </pre>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isLoading}
          >
            拒绝
          </Button>
          <Button onClick={onApprove} disabled={isLoading}>
            {isLoading ? "处理中…" : "批准执行"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
