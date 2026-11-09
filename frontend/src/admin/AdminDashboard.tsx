import { motion } from "framer-motion";
import { ArrowRight, Bot, CalendarCheck, CalendarRange, Clock, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api";
import { AnimatedCounter } from "../components/motion";
import { Skeleton, StatusBadge } from "../components/ui";
import { addDays, dateTime, dayLabel, localDate, time } from "../format";
import type { Appointment } from "../types";
import { BarList, ColumnChart } from "./charts";
import { totalCost, type AdminSession, type Usage } from "./shared";

const ACTIVE = ["pending_payment", "confirmed", "completed", "need_reschedule"];
const WEEK = 7;

const TONES = {
  brand: "from-brand-500 to-brand-700",
  amber: "from-amber-400 to-amber-600",
  accent: "from-accent-500 to-accent-700",
  indigo: "from-indigo-400 to-indigo-600",
};

function Stat({ icon: Icon, label, value, text, hint, tone, index }: { icon: LucideIcon; label: string; value?: number; text?: string; hint?: string; tone: keyof typeof TONES; index: number }) {
  const loading = value === undefined && text === undefined;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-ring"
    >
      <span className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 transition group-hover:scale-125 ${TONES[tone]}`} />
      <div className="relative flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${TONES[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="relative mt-3 text-3xl font-bold text-slate-900">
        {loading ? <Skeleton className="h-9 w-16" /> : text ?? <AnimatedCounter value={value!} />}
      </p>
      {hint && <p className="relative mt-1 text-xs text-slate-500">{hint}</p>}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const today = localDate(new Date());
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [week, setWeek] = useState<{ day: string; items: Appointment[] }[] | null>(null);

  useEffect(() => {
    const days = Array.from({ length: WEEK }, (_, i) => addDays(today, i));
    void Promise.all(days.map((day) => api<Appointment[]>(`/admin/appointments?day=${day}`).then((items) => ({ day, items })))).then(setWeek);
  }, [today]);

  useEffect(() => {
    void api<Appointment[]>(`/admin/appointments?day=${today}`).then(setAppointments);
    void api<AdminSession[]>(`/admin/sessions?day=${today}`).then(setSessions);
    void api<Usage>("/admin/usage").then(setUsage);
  }, [today]);

  const list = appointments ?? [];
  const confirmed = list.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const pending = list.filter((a) => a.status === "pending_payment").length;
  const turns = Object.values(usage ?? {}).reduce((sum, row) => sum + row.turns, 0);
  const busiest = [...(sessions ?? [])].sort((a, b) => b.booked / b.capacity - a.booked / a.capacity).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="mt-1 text-slate-500">{dateTime(`${today}T08:00:00+07:00`).split(" lúc")[0]}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat index={0} tone="brand" icon={CalendarCheck} label="Lịch hẹn hôm nay" value={appointments?.length} hint={appointments ? `${confirmed} đã xác nhận` : undefined} />
        <Stat index={1} tone="amber" icon={Clock} label="Chờ thanh toán" value={appointments ? pending : undefined} hint="Tự hủy sau 15 phút giữ chỗ" />
        <Stat
          index={2}
          tone="accent"
          icon={CalendarRange}
          label="Ca khám hôm nay"
          value={sessions?.length}
          hint={sessions ? `${sessions.filter((s) => s.status === "locked").length} ca đã khóa` : undefined}
        />
        <Stat index={3} tone="indigo" icon={Bot} label="Chi phí trợ lý ảo" text={usage ? `$${totalCost(usage).toFixed(3)}` : undefined} hint={usage ? `${turns} lượt chat từ trước tới nay` : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {week ? (
          <ColumnChart
            title="Lịch hẹn 7 ngày tới"
            subtitle="Lịch còn hiệu lực theo ngày khám, gồm cả chờ thanh toán"
            unit="lịch hẹn"
            highlight={today}
            data={week.map(({ day, items }) => {
              const label = dayLabel(day);
              return { key: day, label: day === today ? "Hôm nay" : label.weekday, sub: label.date, value: items.filter((a) => ACTIVE.includes(a.status)).length };
            })}
          />
        ) : (
          <Skeleton className="h-[300px] rounded-2xl" />
        )}
        {week ? (
          <BarList
            title="Theo chuyên khoa"
            subtitle="Lịch còn hiệu lực trong 7 ngày tới"
            unit="lịch hẹn"
            empty="Chưa có lịch hẹn nào trong 7 ngày tới."
            data={Object.entries(
              week.flatMap((d) => d.items).filter((a) => ACTIVE.includes(a.status)).reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.department]: (acc[a.department] ?? 0) + 1 }), {}),
            ).map(([department, value]) => ({ key: department, label: department, value }))}
          />
        ) : (
          <Skeleton className="h-[300px] rounded-2xl" />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold">Lịch hẹn hôm nay</h2>
            <Link to="/admin/appointments" className="group flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              Xem tất cả <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
          {appointments === null ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Hôm nay chưa có lịch hẹn nào.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.slice(0, 8).map((a, i) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.04 }}
                  className="flex items-center gap-4 px-5 py-3 text-sm transition hover:bg-slate-50"
                >
                  <span className="w-12 font-semibold tabular-nums text-slate-900">{time(a.slot_time)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{a.patient_name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {a.department} · {a.doctor_name}
                    </span>
                  </span>
                  <StatusBadge status={a.status} />
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="card p-5">
          <h2 className="font-semibold">Ca khám đông nhất hôm nay</h2>
          {sessions === null ? (
            <div className="mt-4 space-y-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : busiest.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Không có ca khám hôm nay.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {busiest.map((s, i) => {
                const percent = Math.round((s.booked / s.capacity) * 100);
                const color = percent >= 90 ? "from-rose-400 to-rose-600" : percent >= 60 ? "from-amber-400 to-amber-500" : "from-brand-400 to-brand-600";
                return (
                  <li key={s.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-900">{s.department}</span>
                      <span className="tabular-nums text-slate-500">
                        {s.booked}/{s.capacity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {s.start_time}–{s.end_time} · {s.doctor}
                    </p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(percent, 2)}%` }}
                        transition={{ duration: 0.9, delay: 0.35 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
}
