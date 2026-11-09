import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

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
  if (!error) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {error}
    </p>
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

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <p className="font-semibold text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
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
