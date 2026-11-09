import type { ChatReply } from "./types";

const TOKEN_KEY = "token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Trình duyệt chặn localStorage: phiên đăng nhập chỉ còn trong bộ nhớ
  }
}

/** Lỗi từ backend. `code` là mã nghiệp vụ như SLOT_FULL, CANCEL_DEADLINE_PASSED. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    message: string,
  ) {
    super(message);
  }
}

function errorMessage(data: unknown): string {
  const body = data as { message?: string; detail?: unknown } | null;
  if (body?.message) return body.message;
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) return "Thông tin nhập chưa hợp lệ";
  return "Có lỗi xảy ra, vui lòng thử lại";
}

function headers(json: boolean): HeadersInit {
  const token = getToken();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? (options.body || options.form ? "POST" : "GET"),
    headers: headers(options.body !== undefined),
    body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, (data as { code?: string } | null)?.code ?? null, errorMessage(data));
  }
  return data as T;
}

export type ChatEvent =
  | { type: "status"; text: string }
  | ({ type: "reply" } & ChatReply)
  | { type: "error"; message: string };

/** Gửi tin nhắn và nhận dòng trạng thái theo thời gian thực (Server-Sent Events). */
export async function streamChat(
  sessionId: string,
  message: string,
  skipEmergencyCheck: boolean,
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const response = await fetch(`/api/chat/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ message, skip_emergency_check: skipEmergencyCheck }),
  });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, null, errorMessage(data));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (part.startsWith("data: ")) onEvent(JSON.parse(part.slice(6)) as ChatEvent);
    }
  }
}
