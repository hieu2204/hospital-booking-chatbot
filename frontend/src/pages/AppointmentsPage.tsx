import { CalendarClock, CalendarPlus, DoorOpen, QrCode, Stethoscope, UserRound, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, ApiError } from "../api";
import SlotPicker from "../components/SlotPicker";
import { Countdown, EmptyState, ErrorText, PageHeader, Spinner, StatusBadge } from "../components/ui";
import { money, PAYER_LABEL, time } from "../format";
import type { Appointment, Slot } from "../types";

const ACTIVE = ["pending_payment", "confirmed", "need_reschedule"];

function DateBlock({ iso }: { iso: string }) {
  const value = new Date(iso);
  const zone = { timeZone: "Asia/Ho_Chi_Minh" } as const;
  return (
    <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 py-3 text-brand-700">
      <span className="text-xs font-semibold uppercase">{new Intl.DateTimeFormat("vi-VN", { weekday: "short", ...zone }).format(value)}</span>
      <span className="text-3xl font-bold leading-none">{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", ...zone }).format(value)}</span>
      <span className="text-xs">tháng {new Intl.DateTimeFormat("vi-VN", { month: "numeric", ...zone }).format(value)}</span>
      <span className="mt-1 text-sm font-bold">{time(iso)}</span>
    </div>
  );
}

function AppointmentCard({ appointment, onChange }: { appointment: Appointment; onChange: () => void }) {
  const [rescheduling, setRescheduling] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setRescheduling(false);
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  const active = ACTIVE.includes(appointment.status);
  const canReschedule = appointment.status === "need_reschedule" || (appointment.status === "confirmed" && appointment.edit_count === 0);

  return (
    <div className={`card p-5 ${active ? "" : "opacity-75"}`}>
      <div className="flex gap-5">
        <DateBlock iso={appointment.slot_time} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-slate-900">{appointment.department}</p>
              <p className="font-mono text-xs text-slate-400">{appointment.code}</p>
            </div>
            <StatusBadge status={appointment.status} />
          </div>
          <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-slate-600 sm:grid-cols-2">
            <span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" />{appointment.patient_name}</span>
            <span className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-slate-400" />{appointment.doctor_name}</span>
            <span className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-slate-400" />{appointment.room} · {appointment.service_type}</span>
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-slate-400" />
              {money(appointment.price)} · {PAYER_LABEL[appointment.payer_type]}
              {appointment.payment_status === "refunded" && " · đã hoàn tiền"}
            </span>
          </div>
        </div>
      </div>

      {appointment.status === "pending_payment" && appointment.hold_expires_at && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Thanh toán trong <Countdown until={appointment.hold_expires_at} onExpire={onChange} /> để giữ chỗ.
        </p>
      )}
      {appointment.status === "need_reschedule" && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">Bác sĩ nghỉ ca này. Vui lòng chọn lịch khác hoặc hủy để được hoàn tiền.</p>
      )}

      {active && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <ErrorText error={error} />
          <div className="flex flex-wrap gap-2">
            {appointment.status === "pending_payment" && (
              <button className="btn-primary" disabled={busy} onClick={() => run(() => api(`/appointments/${appointment.id}/pay`, { method: "POST" }))}>
                <Wallet className="h-4 w-4" /> Thanh toán (giả lập)
              </button>
            )}
            {appointment.status === "confirmed" && (
              <Link className="btn-primary" to={`/appointments/${appointment.id}/ticket`}>
                <QrCode className="h-4 w-4" /> Phiếu khám
              </Link>
            )}
            {canReschedule && (
              <button className="btn-secondary" onClick={() => setRescheduling(!rescheduling)}>
                <CalendarClock className="h-4 w-4" /> Đổi lịch
              </button>
            )}
            <button
              className="btn-ghost text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              disabled={busy}
              onClick={() => window.confirm("Bạn chắc chắn muốn hủy lịch này?") && void run(() => api(`/appointments/${appointment.id}/cancel`, { method: "POST" }))}
            >
              Hủy lịch
            </button>
          </div>
          {rescheduling && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-4 text-sm text-slate-600">Chọn giờ mới trong cùng khoa và hình thức khám. Mỗi lịch chỉ được đổi 1 lần, trước 16:30 ngày hôm trước.</p>
              <SlotPicker departmentId={appointment.department_id} serviceTypeId={appointment.service_type_id} selected={slot} onSelect={setSlot} />
              <button
                className="btn-primary mt-4"
                disabled={!slot || busy}
                onClick={() => run(() => api(`/appointments/${appointment.id}/reschedule`, { body: { session_id: slot!.session_id, slot_time: slot!.slot_time } }))}
              >
                Xác nhận đổi lịch
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const load = useCallback(() => void api<Appointment[]>("/appointments").then(setItems), []);
  useEffect(load, [load]);

  const upcoming = (items ?? []).filter((a) => ACTIVE.includes(a.status)).sort((a, b) => a.slot_time.localeCompare(b.slot_time));
  const past = (items ?? []).filter((a) => !ACTIVE.includes(a.status));
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Lịch hẹn của tôi"
        subtitle="Thanh toán, xem phiếu khám, đổi hoặc hủy lịch."
        action={<Link to="/booking" className="btn-primary"><CalendarPlus className="h-4 w-4" /> Đặt lịch mới</Link>}
      />
      <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
        {([["upcoming", `Sắp tới (${upcoming.length})`], ["past", `Đã qua, đã hủy (${past.length})`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            {label}
          </button>
        ))}
      </div>
      {items === null ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="h-6 w-6" />}
          title={tab === "upcoming" ? "Bạn chưa có lịch hẹn sắp tới" : "Chưa có lịch hẹn nào đã qua"}
          text="Đặt lịch bằng form hoặc nhờ trợ lý ảo ở góc phải màn hình."
          action={tab === "upcoming" && <Link to="/booking" className="btn-primary">Đặt lịch khám</Link>}
        />
      ) : (
        <div className="space-y-4">
          {shown.map((a) => <AppointmentCard key={a.id} appointment={a} onChange={load} />)}
        </div>
      )}
    </div>
  );
}
