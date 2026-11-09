import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CalendarPlus, Info, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { api, ApiError } from "../api";
import { ErrorText, Row, Skeleton } from "../components/ui";
import { dateTime, money, PAYER_LABEL, time } from "../format";
import { SITE } from "../site";
import type { Ticket } from "../types";

const EASE = [0.22, 1, 0.36, 1] as const;
const CONFETTI_COLORS = ["#0b63ce", "#4f9bf0", "#14b8a6", "#f59e0b", "#f43f5e", "#a78bfa"];

/** Pháo giấy nhẹ bắn ra từ dấu tích, chạy một lần. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 90 + Math.random() * 110;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          rotate: Math.random() * 540 - 270,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          round: i % 3 === 0,
          delay: Math.random() * 0.12,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute h-2.5 ${p.round ? "w-2.5 rounded-full" : "w-1.5 rounded-sm"}`}
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 80], opacity: [1, 1, 0], scale: 1, rotate: p.rotate }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 0.35 + p.delay, times: [0, 0.5, 1] }}
        />
      ))}
    </div>
  );
}

/** Dấu tích tự vẽ trong vòng tròn, báo đặt lịch thành công. */
function SuccessBanner() {
  const reduce = useReducedMotion();
  return (
    <div className="no-print relative mb-8 flex flex-col items-center text-center">
      {!reduce && <Confetti />}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-[0_12px_40px_-8px_rgba(16,185,129,0.6)]"
      >
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400" />
        <svg viewBox="0 0 24 24" className="relative h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }} />
        </svg>
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-5 text-2xl font-bold">
        Đặt lịch thành công!
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-1 text-sm text-slate-500">
        Lịch hẹn đã được xác nhận. Lưu phiếu khám dưới đây để đưa tại quầy.
      </motion.p>
    </div>
  );
}

/** Đường xé của vé: hai khuyết tròn hai bên và đường gạch đứt ở giữa. */
function TearLine() {
  return (
    <div className="relative h-6" aria-hidden>
      <span className="absolute -left-3 top-0 h-6 w-6 rounded-full border border-slate-200 bg-slate-50 [clip-path:inset(0_0_0_50%)]" />
      <span className="absolute -right-3 top-0 h-6 w-6 rounded-full border border-slate-200 bg-slate-50 [clip-path:inset(0_50%_0_0)]" />
      <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-slate-200" />
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <Skeleton className="h-28 rounded-none" />
      <div className="flex gap-6 p-6">
        <Skeleton className="h-32 w-32" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="space-y-3 p-6">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
    </div>
  );
}

/** BR-17: phiếu khám điện tử có mã QR, số thứ tự, giờ dự kiến và hướng dẫn (BR-25). */
export default function TicketPage() {
  const { id } = useParams();
  const location = useLocation();
  const justPaid = Boolean((location.state as { justPaid?: boolean } | null)?.justPaid);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Ticket>(`/appointments/${id}/ticket`)
      .then(setTicket)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được phiếu khám"));
  }, [id]);

  return (
    <div className="min-h-full bg-slate-50 print:bg-white">
      <div className="mx-auto max-w-md px-4 py-10">
        <Link to="/appointments" className="no-print mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:-translate-x-0.5 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Lịch hẹn của tôi
        </Link>

        {justPaid && ticket && <SuccessBanner />}

        {error ? (
          <ErrorText error={error} />
        ) : !ticket ? (
          <TicketSkeleton />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: 12 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: justPaid ? 0.6 : 0 }}
              style={{ transformPerspective: 1000 }}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-ring print:shadow-none"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 px-6 pb-6 pt-5 text-white">
                <div className="absolute inset-0 bg-dots opacity-20" />
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-brand-100">Phiếu khám bệnh điện tử</p>
                    <p className="mt-1 text-xl font-bold">{ticket.department}</p>
                    <p className="text-sm text-brand-100">{dateTime(ticket.slot_time)}</p>
                  </div>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">{SITE.name}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-5 px-6 pt-6 sm:flex-row sm:items-center">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: justPaid ? 1 : 0.3, type: "spring", stiffness: 200, damping: 18 }}
                  className="rounded-2xl border-2 border-brand-100 bg-white p-3 shadow-soft"
                >
                  <QRCodeSVG value={ticket.qr_payload} size={128} fgColor="#0f2f5c" />
                </motion.div>
                <div className="text-center sm:text-left">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Số thứ tự</p>
                  <p className="text-6xl font-bold leading-none tracking-tight text-brand-700">{ticket.queue_no}</p>
                  {ticket.estimated_time && (
                    <p className="mt-2 text-sm text-slate-600">
                      Giờ dự kiến <b className="text-slate-900">{time(ticket.estimated_time)}</b>
                    </p>
                  )}
                  <p className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{ticket.code}</p>
                </div>
              </div>

              <div className="my-5">
                <TearLine />
              </div>

              <div className="px-6 pb-6">
                <div className="divide-y divide-slate-100">
                  <Row label="Người khám">{ticket.patient_name}</Row>
                  <Row label="Bác sĩ">{ticket.doctor_name}</Row>
                  <Row label="Phòng">{ticket.room}</Row>
                  <Row label="Hình thức">{ticket.service_type}</Row>
                  <Row label="Đối tượng">{PAYER_LABEL[ticket.payer_type]}</Row>
                  <Row label="Đã thanh toán">{money(ticket.price)}</Row>
                </div>
                <p className="mt-4 flex gap-2.5 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  {ticket.instructions}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: justPaid ? 1.1 : 0.3 }}
              className="no-print mt-5 grid gap-3 sm:grid-cols-2"
            >
              <button className="btn-secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> In phiếu khám
              </button>
              <Link to="/booking" className="btn-primary">
                <CalendarPlus className="h-4 w-4" /> Đặt lịch khác
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
