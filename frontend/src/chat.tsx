import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { api, ApiError, streamChat } from "./api";
import { useAuth } from "./auth";
import type { ChatMessage } from "./types";

const SESSION_KEY = "chat_session";

interface ChatState {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: ChatMessage[];
  status: string | null;
  error: string | null;
  draft: string;
  setDraft: (text: string) => void;
  send: (text: string, skipEmergencyCheck?: boolean) => Promise<void>;
  /** Mở trợ lý và gửi luôn câu hỏi, dùng cho các nút trên trang chủ. */
  ask: (text: string) => void;
  restart: () => Promise<void>;
}

const ChatContext = createContext<ChatState | null>(null);

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function saveSession(id: string) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    // Trình duyệt chặn localStorage: phiên chat chỉ giữ đến khi tải lại trang
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const sessionId = useRef<string | null>(null);
  const pending = useRef<string | null>(null);

  const restart = useCallback(async () => {
    const { id } = await api<{ id: string }>("/chat/sessions", { method: "POST" });
    saveSession(id);
    sessionId.current = id;
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(async (text: string, skipEmergencyCheck = false) => {
    const message = text.trim();
    if (!message) return;
    if (!sessionId.current) {
      pending.current = message;
      return;
    }
    setError(null);
    setDraft("");
    setMessages((current) => [...current, { role: "user", content: message, cards: [], sources: [] }]);
    setStatus("Đang suy nghĩ...");
    try {
      await streamChat(sessionId.current, message, skipEmergencyCheck, (event) => {
        if (event.type === "status") setStatus(event.text);
        if (event.type === "error") setError(event.message);
        if (event.type === "reply") {
          setMessages((current) => [...current, { role: "assistant", content: event.reply, cards: event.cards, sources: event.sources }]);
        }
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không kết nối được tới trợ lý");
    } finally {
      setStatus(null);
    }
  }, []);

  // Mở lại cuộc trò chuyện cũ; khách đăng nhập giữa chừng vẫn giữ phiên (A2)
  useEffect(() => {
    const ready = () => {
      if (pending.current) {
        const text = pending.current;
        pending.current = null;
        void send(text);
      }
    };
    const saved = readSession();
    if (!saved) {
      void restart().then(ready);
      return;
    }
    api<ChatMessage[]>(`/chat/sessions/${saved}/messages`)
      .then((history) => {
        sessionId.current = saved;
        setMessages(history);
        ready();
      })
      .catch(() => void restart().then(ready));
  }, [user?.id, restart, send]);

  const ask = (text: string) => {
    setOpen(true);
    void send(text);
  };

  return (
    <ChatContext.Provider value={{ open, setOpen, messages, status, error, draft, setDraft, send, ask, restart }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatState {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat phải nằm trong ChatProvider");
  return value;
}
