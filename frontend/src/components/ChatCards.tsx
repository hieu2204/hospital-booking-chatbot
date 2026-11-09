import { CalendarClock, CalendarX2, CheckCircle2, ClipboardCheck, Phone, Siren } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { api, ApiError } from "../api";
import { dateTime, money, PAYER_LABEL, WARNING_LABEL } from "../format";
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

function Frame({ icon, title, tone = "brand", children }: { icon: ReactNode; title: string; tone?: "brand" | "rose"; children: ReactNode }) {
  const head = tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-brand-50 text-brand-700";
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <p className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold ${head}`}>
        {icon}
        {title}
      </p>
      <div className="px-4 py-3">{children}</div>
    </div>
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
      <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
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
          <>
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
          </>
        )}
        {appointment?.status === "confirmed" && (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Đặt lịch thành công, số thứ tự <b>{appointment.queue_no}</b>.{" "}
              <Link className="font-semibold underline" to={`/appointments/${appointment.id}/ticket`}>
                Xem phiếu khám
              </Link>
            </span>
          </div>
        )}
      </div>
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
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {props.doneText}
          </p>
        ) : (
          <button className={`${props.danger ? "btn-danger" : "btn-primary"} w-full`} disabled={state === "busy"} onClick={run}>
            {props.confirmLabel}
          </button>
        )}
      </div>
    </Frame>
  );
}

function EmergencyCard({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <p className="flex items-center gap-2 font-semibold text-rose-800">
        <Siren className="h-5 w-5" /> Có thể là tình huống khẩn cấp
      </p>
      <div className="mt-3 grid gap-2">
        <a href="tel:115" className="btn-danger">
          <Phone className="h-4 w-4" /> Gọi cấp cứu 115
        </a>
        <a href="tel:02839525515" className="btn-secondary">
          Khoa Cấp cứu: (028) 3952 5515
        </a>
      </div>
      <button className="mt-3 text-xs text-slate-600 underline hover:text-slate-900" onClick={onContinue}>
        Đây không phải tình huống khẩn cấp, tôi muốn tiếp tục
      </button>
    </div>
  );
}

export default function ChatCard({ card, onEdit, onContinue }: { card: Card; onEdit: () => void; onContinue: () => void }) {
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
