import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ThreadChatPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return <ChatInterface threadId={threadId} />;
}
