import { Bot, MessageCircle, RotateCcw, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../auth";
import { useChat } from "../chat";
import ChatCard from "./ChatCards";

const SUGGESTIONS = [
  "Không có giấy chuyển tuyến có khám BHYT được không?",
  "Mình bị đau dạ dày thì nên khám khoa nào?",
  "Đặt lịch khám tim mạch sáng thứ 7",
  "Hủy lịch thì bao lâu được hoàn tiền?",
];

/** Trợ lý ảo dạng bong bóng nổi, có mặt ở mọi trang của người bệnh. */
export default function ChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const { open, setOpen, messages, status, error, draft, setDraft, send, restart } = useChat();
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, open]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const busy = Boolean(status);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-600 py-3 pl-4 pr-5 font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-700"
      >
        <MessageCircle className="h-5 w-5" />
        Hỏi trợ lý ảo
      </button>
    );
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex flex-col bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100vh-2.5rem))] sm:w-[410px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-lift">
      <div className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3.5 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold leading-tight">Trợ lý ảo</p>
          <p className="flex items-center gap-1.5 text-xs text-brand-100">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Hỗ trợ thủ tục và đặt lịch 24/7
          </p>
        </div>
        <button className="rounded-lg p-2 hover:bg-white/15" title="Cuộc trò chuyện mới" onClick={() => void restart()} disabled={busy}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <button className="rounded-lg p-2 hover:bg-white/15" title="Thu nhỏ" onClick={() => setOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-4">
        {!user && (
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">
            Bạn hỏi đáp được ngay. Muốn đặt lịch qua trợ lý,{" "}
            <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="font-semibold underline">
              đăng nhập
            </Link>{" "}
            rồi tiếp tục cuộc trò chuyện này.
          </p>
        )}

        {messages.length === 0 && (
          <div className="pt-2">
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm shadow-soft">
                Xin chào! Mình có thể giải đáp thủ tục, gợi ý chuyên khoa và đặt, đổi hoặc hủy lịch khám giúp bạn. Bạn cần hỗ trợ gì?
              </div>
            </div>
            <div className="mt-4 flex flex-col items-start gap-2 pl-10">
              {SUGGESTIONS.map((text) => (
                <button key={text} className="chip" onClick={() => void send(text)}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-brand-600 px-4 py-2.5 text-sm text-white">{message.content}</p>
            </div>
          ) : (
            <div key={index} className="flex gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0 max-w-[88%]">
                <div className="markdown rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed shadow-soft">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                {message.sources.length > 0 && (
                  <p className="mt-1.5 px-1 text-[11px] leading-snug text-slate-400">
                    Tài liệu đã tra:{" "}
                    {message.sources.map((source, i) => (
                      <span key={source.title}>
                        {i > 0 && " · "}
                        {source.url ? (
                          <a href={source.url} target="_blank" rel="noreferrer" className="hover:text-brand-600 hover:underline">
                            {source.title}
                          </a>
                        ) : (
                          source.title
                        )}
                      </span>
                    ))}
                  </p>
                )}
                {message.cards.map((card, i) => (
                  <ChatCard
                    key={i}
                    card={card}
                    onEdit={() => {
                      setDraft("Mình muốn chọn lại giờ khác");
                      input.current?.focus();
                    }}
                    onContinue={() => void send(lastUserText, true)}
                  />
                ))}
              </div>
            </div>
          ),
        )}

        {status && (
          <div className="flex items-center gap-2.5 pl-1 text-sm text-slate-500">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" />
            </span>
            {status}
          </div>
        )}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div ref={bottom} />
      </div>

      <form
        className="border-t border-slate-100 bg-white p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pl-3.5 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
          <textarea
            ref={input}
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
            rows={1}
            maxLength={2000}
            placeholder="Nhập câu hỏi của bạn..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
          />
          <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40" disabled={!draft.trim() || busy} aria-label="Gửi">
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">Trợ lý không chẩn đoán bệnh. Không nhập số CCCD hay thẻ BHYT vào đây.</p>
      </form>
    </div>
  );
}
