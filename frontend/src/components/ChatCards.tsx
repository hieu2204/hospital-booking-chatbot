import { motion } from "framer-motion";
import { CalendarClock, CalendarX2, CheckCircle2, ClipboardCheck, Phone, Siren } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { api, ApiError } from "../api";
import { dateTime, money, PAYER_LABEL, WARNING_LABEL } from "../format";
import { SITE, tel } from "../site";
import type { Appointment, BookingResult, Card, Draft } from "../types";
import { Countdown, ErrorText } from "./ui";

function message(error: unknown): string {
  return error instanceof ApiError ? error.message : "Có lỗi xảy ra, vui lòng thử lại";
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-[13px]">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{children}</span>
    </div>
  );
}

// Thẻ mới (không phải lịch sử) thì hiện có hiệu ứng, kèm độ trễ để nối sau câu trả lời
const Entry = createContext<{ animate: boolean; delay: number }>({ animate: false, delay: 0 });

function useEntry() {
  const { animate, delay } = useContext(Entry);
  return {
    initial: animate ? { opacity: 0, y: 14, scale: 0.97 } : false,
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay },
  } as const;
}

function Frame({ icon, title, tone = "brand", children }: { icon: ReactNode; title: string; tone?: "brand" | "rose"; children: ReactNode }) {
  const head = tone === "rose" ? "from-rose-50 to-white text-rose-700" : "from-brand-50 to-white text-brand-700";
  return (
    <motion.div {...useEntry()} className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <p className={`flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r px-4 py-2.5 text-sm font-semibold ${head}`}>
        {icon}
        {title}
      </p>
      <div className="px-4 py-3">{children}</div>
    </motion.div>
  );
}

/** Dòng báo thành công: dấu tích bật ra, nền xanh mờ dần lên. */
function Success({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
    >
      <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.1 }}>
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      </motion.span>
      <span>{children}</span>
    </motion.div>
  );
}

/**
 * BR-32: thẻ tóm tắt bản nháp. Nút Xác nhận gọi thẳng backend, không qua chatbot.
 * Sau đó thanh toán giả lập ngay trên thẻ.
 */
function BookingDraftCard({ draft, warnings, onEdit }: { draft: Draft; warnings: string[]; onEdit: () => void }) {
  const [status, setStatus] = useState<Draft["status"] | "loading">("loading");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Draft>(`/booking-drafts/${draft.id}`)
      .then((current) => setStatus(current.status))
      .catch(() => setStatus("discarded"));
  }, [draft.id]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame icon={<ClipboardCheck className="h-4 w-4" />} title="Phiếu đặt lịch">
      <Line label="Người khám">{draft.patient_name}</Line>
      <Line label="Khoa">{draft.department}</Line>
      <Line label="Bác sĩ">{draft.doctor_name}</Line>
      <Line label="Thời gian">{dateTime(draft.slot_time)}</Line>
      <Line label="Phòng">{draft.room}</Line>
      <Line label="Thanh toán">{PAYER_LABEL[draft.payer_type]}</Line>
      <Line label="Phí khám">{money(draft.price)}</Line>
      {warnings.map((code) => (
        <p key={code} className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {WARNING_LABEL[code] ?? code}
        </p>
      ))}
      <motion.div layout className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
        <ErrorText error={error} />
        {status === "loading" && <p className="text-sm text-slate-500">Đang kiểm tra...</p>}
        {status === "open" && (
          <>
            <p className="text-xs text-slate-500">
              Lịch chỉ được tạo khi bạn bấm Xác nhận. Phiếu hết hạn sau <Countdown until={draft.expires_at} onExpire={() => setStatus("discarded")} />
            </p>
            <div className="flex gap-2">
              <button
                className="btn-primary flex-1"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const result = await api<BookingResult>(`/booking-drafts/${draft.id}/confirm`, { method: "POST" });
                    setAppointment(result.appointment);
                    setStatus("used");
                  })
                }
              >
                Xác nhận
              </button>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api(`/booking-drafts/${draft.id}/discard`, { method: "POST" });
                    setStatus("discarded");
                    onEdit();
                  })
                }
              >
                Chọn lại
              </button>
            </div>
          </>
        )}
        {status === "used" && !appointment && <p className="text-sm text-slate-600">Phiếu này đã được xác nhận. Xem ở trang Lịch hẹn.</p>}
        {status === "discarded" && <p className="text-sm text-slate-500">Phiếu này không còn hiệu lực.</p>}
        {appointment?.status === "pending_payment" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
            <p className="text-sm text-slate-700">
              Đã giữ chỗ, mã <b>{appointment.code}</b>. Thanh toán trong <Countdown until={appointment.hold_expires_at!} />
            </p>
            <button
              className="btn-primary w-full"
              disabled={busy}
              onClick={() => run(async () => setAppointment(await api<Appointment>(`/appointments/${appointment.id}/pay`, { method: "POST" })))}
            >
              Thanh toán {money(appointment.price)} (giả lập)
            </button>
          </motion.div>
        )}
        {appointment?.status === "confirmed" && (
          <Success>
            Đặt lịch thành công, số thứ tự <b>{appointment.queue_no}</b>.{" "}
            <Link className="font-semibold underline" to={`/appointments/${appointment.id}/ticket`}>
              Xem phiếu khám
            </Link>
          </Success>
        )}
      </motion.div>
    </Frame>
  );
}

function ActionCard(props: {
  icon: ReactNode;
  title: string;
  appointment: Appointment;
  extra?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  action: () => Promise<unknown>;
  doneText: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setState("busy");
    setError(null);
    try {
      await props.action();
      setState("done");
    } catch (err) {
      setError(message(err));
      setState("idle");
    }
  };
  return (
    <Frame icon={props.icon} title={props.title} tone={props.danger ? "rose" : "brand"}>
      <Line label="Mã lịch">{props.appointment.code}</Line>
      <Line label="Người khám">{props.appointment.patient_name}</Line>
      <Line label="Lịch hiện tại">{dateTime(props.appointment.slot_time)}</Line>
      {props.extra}
      <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
        <ErrorText error={error} />
        {state === "done" ? (
          <Success>{props.doneText}</Success>
        ) : (
          <button className={`${props.danger ? "btn-danger" : "btn-primary"} w-full`} disabled={state === "busy"} onClick={run}>
            {props.confirmLabel}
          </button>
        )}
      </div>
    </Frame>
  );
}

/** BR-30: câu chữ cố định; hiệu ứng chỉ để thẻ nổi bật, không làm chậm nút gọi. */
function EmergencyCard({ onContinue }: { onContinue: () => void }) {
  const { animate } = useContext(Entry);
  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.95 } : false}
      animate={{ opacity: 1, scale: 1, x: animate ? [0, -5, 5, -3, 3, 0] : 0 }}
      transition={{ duration: 0.5 }}
      className="relative mt-2 overflow-hidden rounded-2xl border-2 border-rose-300 bg-rose-50 p-4"
    >
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-rose-400"
        animate={{ opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        aria-hidden
      />
      <p className="relative flex items-center gap-2 font-semibold text-rose-800">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white">
          <span className="absolute inset-0 animate-ping rounded-full bg-rose-500 opacity-60" />
          <Siren className="relative h-4 w-4" />
        </span>
        Có thể là tình huống khẩn cấp
      </p>
      <div className="relative mt-3 grid gap-2">
        <a href={tel(SITE.emergencyCall)} className="btn-danger shadow-[0_8px_24px_-8px_rgba(225,29,72,0.6)]">
          <Phone className="h-4 w-4" /> Gọi cấp cứu {SITE.emergencyCall}
        </a>
        <a href={tel(SITE.emergencyPhone)} className="btn-secondary">
          Khoa Cấp cứu: {SITE.emergencyPhone}
        </a>
      </div>
      <button className="relative mt-3 text-xs text-slate-600 underline hover:text-slate-900" onClick={onContinue}>
        Đây không phải tình huống khẩn cấp, tôi muốn tiếp tục
      </button>
    </motion.div>
  );
}

export default function ChatCard(props: { card: Card; onEdit: () => void; onContinue: () => void; animate?: boolean; delay?: number }) {
  return (
    <Entry.Provider value={{ animate: props.animate ?? false, delay: props.delay ?? 0 }}>
      <CardBody {...props} />
    </Entry.Provider>
  );
}

function CardBody({ card, onEdit, onContinue }: { card: Card; onEdit: () => void; onContinue: () => void }) {
  switch (card.type) {
    case "booking_draft":
      return <BookingDraftCard draft={card.draft} warnings={card.warnings} onEdit={onEdit} />;
    case "cancel_confirm":
      return (
        <ActionCard
          icon={<CalendarX2 className="h-4 w-4" />}
          title="Xác nhận hủy lịch"
          appointment={card.appointment}
          confirmLabel="Hủy lịch này"
          danger
          action={() => api(`/appointments/${card.appointment.id}/cancel`, { method: "POST" })}
          doneText="Đã hủy lịch, tiền khám sẽ được hoàn nếu đã thanh toán."
        />
      );
    case "reschedule_confirm":
      return (
        <ActionCard
          icon={<CalendarClock className="h-4 w-4" />}
          title="Xác nhận đổi lịch"
          appointment={card.appointment}
          extra={<Line label="Lịch mới">{dateTime(card.new_slot.slot_time)}</Line>}
          confirmLabel="Đổi sang lịch mới"
          action={() =>
            api(`/appointments/${card.appointment.id}/reschedule`, {
              body: { session_id: card.new_slot.session_id, slot_time: card.new_slot.slot_time },
            })
          }
          doneText="Đã đổi lịch và cấp lại số thứ tự."
        />
      );
    case "emergency":
      return <EmergencyCard onContinue={onContinue} />;
  }
}
