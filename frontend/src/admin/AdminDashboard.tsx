import { Bot, CalendarCheck, CalendarRange, Clock, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api";
import { StatusBadge } from "../components/ui";
import { dateTime, localDate, time } from "../format";
import type { Appointment } from "../types";
import { totalCost, type AdminSession, type Usage } from "./shared";

function Stat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const today = localDate(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    void api<Appointment[]>(`/admin/appointments?day=${today}`).then(setAppointments);
    void api<AdminSession[]>(`/admin/sessions?day=${today}`).then(setSessions);
    void api<Usage>("/admin/usage").then(setUsage);
  }, [today]);

  const confirmed = appointments.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const pending = appointments.filter((a) => a.status === "pending_payment").length;
  const turns = Object.values(usage ?? {}).reduce((sum, row) => sum + row.turns, 0);
  const busiest = [...sessions].sort((a, b) => b.booked / b.capacity - a.booked / a.capacity).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="mt-1 text-slate-500">{dateTime(`${today}T08:00:00+07:00`).split(" lúc")[0]}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={CalendarCheck} label="Lịch hẹn hôm nay" value={String(appointments.length)} hint={`${confirmed} đã xác nhận`} />
        <Stat icon={Clock} label="Chờ thanh toán" value={String(pending)} hint="Tự hủy sau 15 phút giữ chỗ" />
        <Stat icon={CalendarRange} label="Ca khám hôm nay" value={String(sessions.length)} hint={`${sessions.filter((s) => s.status === "locked").length} ca đã khóa`} />
        <Stat icon={Bot} label="Chi phí trợ lý ảo" value={`$${totalCost(usage).toFixed(3)}`} hint={`${turns} lượt chat từ trước tới nay`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold">Lịch hẹn hôm nay</h2>
            <Link to="/admin/appointments" className="text-sm font-medium text-brand-600 hover:underline">Xem tất cả</Link>
          </div>
          {appointments.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-slate-500">Hôm nay chưa có lịch hẹn nào.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {appointments.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <span className="w-12 font-semibold text-slate-900">{time(a.slot_time)}</span>
                  <span className="flex-1">
                    <span className="block font-medium text-slate-900">{a.patient_name}</span>
                    <span className="block text-xs text-slate-500">{a.department} · {a.doctor_name}</span>
                  </span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Ca khám đông nhất hôm nay</h2>
          {busiest.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Không có ca khám hôm nay.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {busiest.map((s) => {
                const percent = Math.round((s.booked / s.capacity) * 100);
                return (
                  <li key={s.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-900">{s.department}</span>
                      <span className="text-slate-500">{s.booked}/{s.capacity}</span>
                    </div>
                    <p className="text-xs text-slate-500">{s.start_time}–{s.end_time} · {s.doctor}</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(percent, 2)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
