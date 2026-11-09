import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { forwardRef, useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";

import { STATUS_LABEL, STATUS_STYLE } from "../format";
import type { AppointmentStatus } from "../types";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {error && (
        <motion.p
          key={error}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto", x: [0, -5, 5, -2, 0] }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-2 overflow-hidden rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** Ô nhập có biểu tượng bên trái. */
export const IconInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }>(function IconInput({ icon, className = "", ...props }, ref) {
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-brand-600">{icon}</span>
      <input ref={ref} className={`input pl-10 ${className}`} {...props} />
    </div>
  );
});

/** Ô mật khẩu có nút hiện/ẩn. */
export function PasswordInput({ icon, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-brand-600">{icon}</span>
      <input {...props} type={shown ? "text" : "password"} className="input pl-10 pr-11" />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        onClick={() => setShown(!shown)}
        aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Spinner({ label = "Đang tải..." }: { label?: string }) {
  return (
    <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </p>
  );
}

/** Khối giữ chỗ có vệt sáng chạy qua, dùng thay Spinner khi biết trước bố cục. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block overflow-hidden rounded-xl bg-slate-100 ${className}`}>
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Trạng thái trống: biểu tượng nằm giữa các vòng tròn đồng tâm trôi nhẹ. */
export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card relative flex flex-col items-center overflow-hidden px-6 py-14 text-center">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-brand-100" />
        <span className="absolute inset-3 rounded-full border border-brand-100 bg-brand-50/50" />
        <motion.span
          className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-accent-500/70"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute bottom-4 left-0 h-2 w-2 rounded-full bg-brand-400/70"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow"
        >
          {icon}
        </motion.div>
      </div>
      <p className="relative font-semibold text-slate-900">{title}</p>
      {text && <p className="relative mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="relative mt-5">{action}</div>}
    </motion.div>
  );
}

/** Nút chuyển tab dạng viên thuốc, nền trượt theo tab đang chọn. */
export function Tabs<T extends string>({ value, onChange, items, id }: { value: T; onChange: (value: T) => void; items: [T, string][]; id: string }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {items.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)} className={`relative rounded-lg px-4 py-2 text-sm font-medium transition ${value === key ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
          {value === key && <motion.span layoutId={id} className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{children}</span>
    </div>
  );
}

/** Đếm ngược thời gian giữ chỗ (BR-16) hoặc hạn của bản nháp. */
export function Countdown({ until, onExpire }: { until: string; onExpire?: () => void }) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      const value = new Date(until).getTime() - Date.now();
      setLeft(value);
      if (value <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [until, onExpire]);
  if (left <= 0) return <span className="font-semibold text-rose-600">đã hết hạn</span>;
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return (
    <span className="font-mono font-semibold tabular-nums text-amber-700">
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}
