import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CalendarClock, CalendarPlus, DoorOpen, History, QrCode, Stethoscope, UserRound, Wallet, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, ApiError } from "../api";
import SlotPicker from "../components/SlotPicker";
import { useToast } from "../components/toast";
import { Countdown, EmptyState, ErrorText, PageHeader, Skeleton, StatusBadge, Tabs } from "../components/ui";
import { dateTime, money, PAYER_LABEL, time } from "../format";
import type { Appointment, Slot } from "../types";

const ACTIVE = ["pending_payment", "confirmed", "need_reschedule"];
const EASE = [0.22, 1, 0.36, 1] as const;

function DateBlock({ iso, active }: { iso: string; active: boolean }) {
  const value = new Date(iso);
  const zone = { timeZone: "Asia/Ho_Chi_Minh" } as const;
  return (
    <div
      className={`flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl py-3 ${
        active ? "bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-glow" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span className="text-xs font-semibold uppercase opacity-90">{new Intl.DateTimeFormat("vi-VN", { weekday: "short", ...zone }).format(value)}</span>
      <span className="text-3xl font-bold leading-none">{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", ...zone }).format(value)}</span>
      <span className="text-xs opacity-90">tháng {new Intl.DateTimeFormat("vi-VN", { month: "numeric", ...zone }).format(value)}</span>
      <span className="mt-1 text-sm font-bold">{time(iso)}</span>
    </div>
  );
}

function AppointmentCard({ appointment, onChange }: { appointment: Appointment; onChange: () => void }) {
  const toast = useToast();
  const [rescheduling, setRescheduling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setRescheduling(false);
      setConfirmCancel(false);
      toast(done);
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={`card p-5 transition-shadow hover:shadow-ring ${active ? "" : "opacity-75"}`}
    >
      <div className="flex gap-5">
        <DateBlock iso={appointment.slot_time} active={active} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-slate-900">{appointment.department}</p>
              <p className="font-mono text-xs text-slate-400">{appointment.code}</p>
            </div>
            <StatusBadge status={appointment.status} />
          </div>
          <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-slate-600 sm:grid-cols-2">
            <span className="flex items-center gap-2">
              <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
              {appointment.patient_name}
            </span>
            <span className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 shrink-0 text-slate-400" />
              {appointment.doctor_name}
            </span>
            <span className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 shrink-0 text-slate-400" />
              {appointment.room} · {appointment.service_type}
            </span>
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4 shrink-0 text-slate-400" />
              {money(appointment.price)} · {PAYER_LABEL[appointment.payer_type]}
              {appointment.payment_status === "refunded" && " · đã hoàn tiền"}
            </span>
          </div>
        </div>
      </div>

      {appointment.status === "pending_payment" && appointment.hold_expires_at && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          Thanh toán trong <Countdown until={appointment.hold_expires_at} onExpire={onChange} /> để giữ chỗ.
        </p>
      )}
      {appointment.status === "need_reschedule" && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Bác sĩ nghỉ ca này. Vui lòng chọn lịch khác hoặc hủy để được hoàn tiền.
        </p>
      )}

      {active && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <ErrorText error={error} />
          <AnimatePresence mode="wait" initial={false}>
            {confirmCancel ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
              >
                <span className="flex-1 text-sm font-medium text-rose-800">Hủy lịch hẹn này? Thao tác không hoàn tác được.</span>
                <button
                  className="btn-danger btn-sm"
                  disabled={busy}
                  onClick={() => run(() => api(`/appointments/${appointment.id}/cancel`, { method: "POST" }), "Đã hủy lịch hẹn")}
                >
                  Xác nhận hủy
                </button>
                <button className="btn-secondary btn-sm" onClick={() => setConfirmCancel(false)}>
                  Không
                </button>
              </motion.div>
            ) : (
              <motion.div key="actions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-wrap gap-2">
                {appointment.status === "pending_payment" && (
                  <button
                    className="btn-primary"
                    disabled={busy}
                    onClick={() => run(() => api(`/appointments/${appointment.id}/pay`, { method: "POST" }), "Thanh toán thành công, lịch đã được xác nhận")}
                  >
                    <Wallet className="h-4 w-4" /> Thanh toán (giả lập)
                  </button>
                )}
                {appointment.status === "confirmed" && (
                  <Link className="btn-primary" to={`/appointments/${appointment.id}/ticket`}>
                    <QrCode className="h-4 w-4" /> Phiếu khám
                  </Link>
                )}
                {canReschedule && (
                  <button className={rescheduling ? "btn-secondary border-brand-300 bg-brand-50 text-brand-700" : "btn-secondary"} onClick={() => setRescheduling(!rescheduling)}>
                    {rescheduling ? <X className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />} {rescheduling ? "Đóng" : "Đổi lịch"}
                  </button>
                )}
                <button className="btn-ghost text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={busy} onClick={() => setConfirmCancel(true)}>
                  Hủy lịch
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {rescheduling && (
              <motion.div
                key="reschedule"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-4 text-sm text-slate-600">Chọn giờ mới trong cùng khoa và hình thức khám. Mỗi lịch chỉ được đổi 1 lần, trước 16:30 ngày hôm trước.</p>
                  <SlotPicker departmentId={appointment.department_id} serviceTypeId={appointment.service_type_id} selected={slot} onSelect={setSlot} />
                  <AnimatePresence>
                    {slot && (
                      <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 text-sm text-slate-600">
                        Lịch mới: <b className="text-slate-900">{dateTime(slot.slot_time)}</b> · {slot.doctor_name}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <button
                    className="btn-primary mt-4"
                    disabled={!slot || busy}
                    onClick={() =>
                      run(
                        () => api(`/appointments/${appointment.id}/reschedule`, { body: { session_id: slot!.session_id, slot_time: slot!.slot_time } }),
                        "Đã đổi lịch và cấp lại số thứ tự",
                      )
                    }
                  >
                    Xác nhận đổi lịch
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function CardSkeleton() {
  return (
    <div className="card flex gap-5 p-5">
      <Skeleton className="h-[108px] w-20 rounded-2xl" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-3 w-24" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </div>
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
        action={
          <Link to="/booking" className="btn-primary shadow-glow">
            <CalendarPlus className="h-4 w-4" /> Đặt lịch mới
          </Link>
        }
      />
      <div className="mb-6">
        <Tabs
          id="appointments-tab"
          value={tab}
          onChange={setTab}
          items={[
            ["upcoming", `Sắp tới (${upcoming.length})`],
            ["past", `Đã qua, đã hủy (${past.length})`],
          ]}
        />
      </div>
      {items === null ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          key={tab}
          icon={tab === "upcoming" ? <CalendarPlus className="h-6 w-6" /> : <History className="h-6 w-6" />}
          title={tab === "upcoming" ? "Bạn chưa có lịch hẹn sắp tới" : "Chưa có lịch hẹn nào đã qua"}
          text="Đặt lịch bằng form hoặc nhờ trợ lý ảo ở góc phải màn hình."
          action={
            tab === "upcoming" && (
              <Link to="/booking" className="btn-primary">
                Đặt lịch khám
              </Link>
            )
          }
        />
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence>
            {shown.map((a) => (
              <AppointmentCard key={a.id} appointment={a} onChange={load} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
