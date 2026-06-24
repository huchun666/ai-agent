import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 120,
});

export async function splitText(text: string): Promise<string[]> {
  return splitter.splitText(text);
}

export function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): string {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/csv" ||
    ext === "md" ||
    ext === "txt" ||
    ext === "json" ||
    ext === "csv"
  ) {
    return buffer.toString("utf-8");
  }

  if (mimeType === "application/pdf" || ext === "pdf") {
    throw new Error("PDF 解析需要额外依赖，请上传 txt/md/json 文件");
  }

  throw new Error(`不支持的文件类型: ${mimeType || ext}`);
}
