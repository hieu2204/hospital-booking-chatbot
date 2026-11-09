import { CalendarX2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "../api";
import { addDays, dayLabel, localDate, time } from "../format";
import type { Slot } from "../types";

const WINDOW = 7;
const MAX_AHEAD = 30;

interface Props {
  departmentId?: number | null;
  doctorId?: number | null;
  serviceTypeId?: number | null;
  selected?: Slot | null;
  onSelect: (slot: Slot) => void;
}

/** Chọn ngày rồi chọn khung giờ còn trống (FR-18). Đặt trước 1–30 ngày (BR-07). */
export default function SlotPicker({ departmentId, doctorId, serviceTypeId, selected, onSelect }: Props) {
  const firstDay = addDays(localDate(new Date()), 1);
  const lastDay = addDays(localDate(new Date()), MAX_AHEAD);
  const [start, setStart] = useState(firstDay);
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  const days = useMemo(() => Array.from({ length: WINDOW }, (_, i) => addDays(start, i)).filter((d) => d <= lastDay), [start, lastDay]);

  useEffect(() => {
    const params = new URLSearchParams({ date_from: start, date_to: days[days.length - 1] });
    if (departmentId) params.set("department_id", String(departmentId));
    if (doctorId) params.set("doctor_id", String(doctorId));
    if (serviceTypeId) params.set("service_type_id", String(serviceTypeId));
    setLoading(true);
    api<Slot[]>(`/slots?${params}`)
      .then((result) => {
        setSlots(result);
        const firstWithSlots = days.find((d) => result.some((slot) => localDate(slot.slot_time) === d));
        setDay((current) => (current && result.some((slot) => localDate(slot.slot_time) === current) ? current : firstWithSlots ?? null));
      })
      .finally(() => setLoading(false));
  }, [start, departmentId, doctorId, serviceTypeId, days]);

  const byDay = (d: string) => slots.filter((slot) => localDate(slot.slot_time) === d);
  const daySlots = day ? byDay(day) : [];
  const morning = daySlots.filter((slot) => Number(time(slot.slot_time).slice(0, 2)) < 12);
  const afternoon = daySlots.filter((slot) => Number(time(slot.slot_time).slice(0, 2)) >= 12);

  const group = (label: string, items: Slot[]) =>
    items.length > 0 && (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((slot) => {
            const active = selected?.session_id === slot.session_id && selected.slot_time === slot.slot_time;
            return (
              <button
                key={`${slot.session_id}-${slot.slot_time}`}
                onClick={() => onSelect(slot)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  active ? "border-brand-600 bg-brand-600 text-white shadow-sm" : "border-slate-200 bg-white hover:border-brand-400"
                }`}
              >
                <span className="flex items-baseline justify-between">
                  <span className="text-base font-bold">{time(slot.slot_time)}</span>
                  <span className={`text-[11px] ${active ? "text-brand-100" : "text-slate-400"}`}>còn {slot.remaining}</span>
                </span>
                <span className={`block truncate text-xs ${active ? "text-brand-50" : "text-slate-500"}`}>{slot.doctor_name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button className="btn-secondary h-10 w-10 shrink-0 p-0" disabled={start <= firstDay} onClick={() => setStart(addDays(start, -WINDOW))} aria-label="Tuần trước">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {days.map((d) => {
            const count = byDay(d).length;
            const label = dayLabel(d);
            return (
              <button
                key={d}
                disabled={count === 0}
                onClick={() => setDay(d)}
                className={`rounded-xl border px-1 py-2 text-center transition ${
                  d === day ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white hover:border-brand-400"
                } disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300`}
              >
                <span className="block text-[11px] font-medium">{label.weekday}</span>
                <span className="block text-sm font-bold">{label.date}</span>
              </button>
            );
          })}
        </div>
        <button className="btn-secondary h-10 w-10 shrink-0 p-0" disabled={addDays(start, WINDOW) > lastDay} onClick={() => setStart(addDays(start, WINDOW))} aria-label="Tuần sau">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm giờ trống...
        </p>
      ) : daySlots.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          <CalendarX2 className="h-4 w-4" /> Không còn giờ trống trong tuần này. Thử tuần sau hoặc đổi bác sĩ.
        </p>
      ) : (
        <div className="space-y-4">
          {group("Buổi sáng", morning)}
          {group("Buổi chiều", afternoon)}
        </div>
      )}
    </div>
  );
}
