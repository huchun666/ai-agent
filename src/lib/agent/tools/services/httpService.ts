import type {
  HttpRequestInput,
  HttpResponseData,
  ToolResult,
} from "@/lib/agent/tools/types";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BODY_LENGTH = 1_048_576; // 1MB

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function parseResponseBody(
  response: Response
): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (text.length > MAX_BODY_LENGTH) {
    return {
      _truncated: true,
      preview: text.slice(0, 2000),
      totalLength: text.length,
    };
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

export async function executeHttpRequest(
  input: HttpRequestInput
): Promise<ToolResult<HttpResponseData>> {
  const { url, method, headers = {}, body } = input;

  if (!isValidUrl(url)) {
    return {
      success: false,
      error: "无效的 URL，仅支持 http:// 或 https://",
      code: "INVALID_URL",
    };
  }

  const init: RequestInit = {
    method,
    headers: { ...headers },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  };

  if (body !== undefined && method !== "GET") {
    if (typeof body === "object") {
      init.headers = {
        "Content-Type": "application/json",
        ...init.headers,
      };
      init.body = JSON.stringify(body);
    } else {
      init.body = body;
    }
  }

  try {
    const response = await fetch(url, init);
    const responseBody = await parseResponseBody(response);

    return {
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: headersToRecord(response.headers),
        body: responseBody,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "HTTP 请求失败";

    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        success: false,
        error: `请求超时（${DEFAULT_TIMEOUT_MS}ms）`,
        code: "TIMEOUT",
      };
    }

    return {
      success: false,
      error: message,
      code: "REQUEST_FAILED",
    };
  }
}
