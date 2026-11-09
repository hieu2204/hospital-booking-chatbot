import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, MessageCircle, RotateCcw, SendHorizontal, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const GREETING_KEY = "chat_greeting_dismissed";
const EASE = [0.22, 1, 0.36, 1] as const;

function greetingDismissed(): boolean {
  try {
    return sessionStorage.getItem(GREETING_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissGreeting() {
  try {
    sessionStorage.setItem(GREETING_KEY, "1");
  } catch {
    // Không lưu được thì lần tải trang sau lời chào hiện lại, không sao
  }
}

function BotAvatar({ small }: { small?: boolean }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm ${small ? "h-7 w-7" : "h-8 w-8"}`}>
      <Bot className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </div>
  );
}

/** Ba chấm nhảy kèm dòng trạng thái (đang tra tài liệu, đang kiểm tra lịch...). */
function TypingBubble({ status }: { status: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex items-end gap-2.5">
      <BotAvatar />
      <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-brand-400"
                animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </span>
          <AnimatePresence mode="wait">
            <motion.span key={status} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} className="text-xs text-slate-500">
              {status}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/** Nút mở trợ lý: vòng sóng lan ra và lời chào nhỏ hiện sau vài giây. */
function Launcher({ onOpen }: { onOpen: () => void }) {
  const [greeting, setGreeting] = useState(false);

  useEffect(() => {
    if (greetingDismissed()) return;
    const timer = setTimeout(() => setGreeting(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const closeGreeting = () => {
    setGreeting(false);
    dismissGreeting();
  };

  return (
    <div className="no-print fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {greeting && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="relative w-64 origin-bottom-right rounded-2xl border border-slate-100 bg-white p-4 pr-8 text-sm shadow-ring"
          >
            <button className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={closeGreeting} aria-label="Ẩn lời chào">
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="font-semibold text-slate-900">Xin chào 👋</p>
            <p className="mt-1 text-slate-600">Bạn cần đặt lịch khám hay hỏi thủ tục? Mình hỗ trợ ngay.</p>
            <button
              className="mt-2 text-sm font-semibold text-brand-700 hover:underline"
              onClick={() => {
                closeGreeting();
                onOpen();
              }}
            >
              Bắt đầu trò chuyện →
            </button>
            <span className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 border-b border-r border-slate-100 bg-white" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          closeGreeting();
          onOpen();
        }}
        className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 p-4 font-semibold text-white shadow-glow sm:py-3 sm:pl-4 sm:pr-5"
        aria-label="Hỏi trợ lý ảo"
      >
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500" aria-hidden />
        <span className="relative flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Hỏi trợ lý ảo</span>
        </span>
      </motion.button>
    </div>
  );
}

/** Trợ lý ảo dạng bong bóng nổi, có mặt ở mọi trang của người bệnh. */
export default function ChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const { open, setOpen, messages, status, error, draft, setDraft, send, restart } = useChat();
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  // Tin nhắn có sẵn lúc mở khung (lịch sử) thì hiện ngay, chỉ tin mới mới có hiệu ứng trượt vào
  // Chốt ngay trong lúc render của lần mở khung, để lịch sử không chớp hiệu ứng ở khung hình đầu
  const historyCount = useRef(0);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) historyCount.current = messages.length;
  wasOpen.current = open;

  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status, open]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // Ô nhập tự giãn theo nội dung
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft, open]);

  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const busy = Boolean(status);

  return (
    <>
      <AnimatePresence>{!open && <Launcher key="launcher" onOpen={() => setOpen(true)} />}</AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="no-print fixed inset-0 z-50 flex origin-bottom-right flex-col bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100vh-2.5rem))] sm:w-[410px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-ring"
            role="dialog"
            aria-label="Trợ lý ảo"
          >
            <div className="relative overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-4 py-3.5 text-white">
              <div className="pointer-events-none absolute inset-0 bg-dots opacity-20" />
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />
              <div className="relative flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
                    <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-brand-600 bg-emerald-300" />
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold leading-tight">Trợ lý ảo</p>
                  <p className="text-xs text-brand-100">Hỗ trợ thủ tục và đặt lịch 24/7</p>
                </div>
                <motion.button
                  whileTap={{ rotate: -180 }}
                  className="rounded-lg p-2 transition hover:bg-white/15 disabled:opacity-50"
                  title="Cuộc trò chuyện mới"
                  onClick={() => {
                    historyCount.current = 0;
                    void restart();
                  }}
                  disabled={busy}
                >
                  <RotateCcw className="h-4 w-4" />
                </motion.button>
                <button className="rounded-lg p-2 transition hover:bg-white/15" title="Thu nhỏ" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-4">
              {!user && (
                <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-800">
                  Bạn hỏi đáp được ngay. Muốn đặt lịch qua trợ lý,{" "}
                  <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="font-semibold underline">
                    đăng nhập
                  </Link>{" "}
                  rồi tiếp tục cuộc trò chuyện này.
                </motion.p>
              )}

              {messages.length === 0 && (
                <div className="pt-2">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex items-end gap-2.5">
                    <BotAvatar />
                    <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm shadow-soft">
                      Xin chào! Mình có thể giải đáp thủ tục, gợi ý chuyên khoa và đặt, đổi hoặc hủy lịch khám giúp bạn. Bạn cần hỗ trợ gì?
                    </div>
                  </motion.div>
                  <motion.div
                    className="mt-4 flex flex-col items-start gap-2 pl-10"
                    initial="hidden"
                    animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } } }}
                  >
                    {SUGGESTIONS.map((text) => (
                      <motion.button
                        key={text}
                        variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                        whileHover={{ x: 3 }}
                        className="chip"
                        onClick={() => void send(text)}
                      >
                        {text}
                      </motion.button>
                    ))}
                  </motion.div>
                </div>
              )}

              {messages.map((message, index) => {
                const fresh = index >= historyCount.current;
                return message.role === "user" ? (
                  <motion.div
                    key={index}
                    initial={fresh ? { opacity: 0, x: 20, scale: 0.96 } : false}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="flex origin-right justify-end"
                  >
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-2.5 text-sm text-white shadow-sm">{message.content}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={index}
                    initial={fresh ? { opacity: 0, y: 12 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="flex items-start gap-2.5"
                  >
                    <BotAvatar />
                    <div className="min-w-0 max-w-[88%]">
                      <div className="markdown rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed shadow-soft">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.sources.length > 0 && (
                        <motion.p
                          initial={fresh ? { opacity: 0 } : false}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.25 }}
                          className="mt-1.5 flex flex-wrap items-center gap-1 px-1 text-[11px] leading-snug text-slate-400"
                        >
                          <ShieldCheck className="h-3 w-3 text-accent-600" /> Tài liệu đã tra:
                          {message.sources.map((source, i) => (
                            <span key={source.title}>
                              {i > 0 && "· "}
                              {source.url ? (
                                <a href={source.url} target="_blank" rel="noreferrer" className="hover:text-brand-600 hover:underline">
                                  {source.title}
                                </a>
                              ) : (
                                source.title
                              )}
                            </span>
                          ))}
                        </motion.p>
                      )}
                      {message.cards.map((card, i) => (
                        <ChatCard
                          key={i}
                          card={card}
                          animate={fresh}
                          delay={0.15 + i * 0.1}
                          onEdit={() => {
                            setDraft("Mình muốn chọn lại giờ khác");
                            input.current?.focus();
                          }}
                          onContinue={() => void send(lastUserText, true)}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}

              <AnimatePresence>{status && <TypingBubble key="typing" status={status} />}</AnimatePresence>
              <AnimatePresence>
                {error && (
                  <motion.p key="error" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }} className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <div ref={bottom} />
            </div>

            <form
              className="border-t border-slate-100 bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pl-3.5 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
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
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: draft.trim() && !busy ? 1 : 0.92 }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-sm transition-opacity disabled:opacity-40"
                  disabled={!draft.trim() || busy}
                  aria-label="Gửi"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                </motion.button>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">Trợ lý không chẩn đoán bệnh. Không nhập số CCCD hay thẻ BHYT vào đây.</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
