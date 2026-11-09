import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Kind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => undefined);

const STYLE: Record<Kind, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "text-emerald-600" },
  error: { icon: AlertCircle, className: "text-rose-600" },
  info: { icon: Info, className: "text-brand-600" },
};

/** Thông báo nổi góc trên, tự ẩn sau 4 giây. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (text: string, kind: Kind = "success") => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, kind, text }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => {
            const { icon: Icon, className } = STYLE[toast.kind];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-ring backdrop-blur"
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${className}`} />
                <p className="flex-1">{toast.text}</p>
                <button className="text-slate-400 hover:text-slate-600" onClick={() => dismiss(toast.id)} aria-label="Đóng">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
