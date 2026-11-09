import { AnimatePresence, motion } from "framer-motion";
import { CalendarX2, ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { api } from "../api";
import { addDays, dayLabel, localDate, time } from "../format";
import { SITE } from "../site";
import type { Slot } from "../types";
import { Skeleton } from "./ui";

interface Props {
  departmentId?: number | null;
  doctorId?: number | null;
  serviceTypeId?: number | null;
  selected?: Slot | null;
  onSelect: (slot: Slot) => void;
}

const monthLabel = (isoDate: string) => `Tháng ${Number(isoDate.slice(5, 7))}/${isoDate.slice(0, 4)}`;

/** Chọn ngày rồi chọn khung giờ còn trống (FR-18). Đặt trước 1–30 ngày (BR-07). */
export default function SlotPicker({ departmentId, doctorId, serviceTypeId, selected, onSelect }: Props) {
  const today = localDate(new Date());
  const firstDay = addDays(today, 1);
  const lastDay = addDays(today, SITE.bookingDaysAhead);
  const days = useMemo(() => Array.from({ length: SITE.bookingDaysAhead }, (_, i) => addDays(firstDay, i)), [firstDay]);

  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const strip = useRef<HTMLDivElement>(null);

  // Tải một lần cho cả khoảng đặt trước, để dải ngày biết ngày nào còn giờ
  useEffect(() => {
    const params = new URLSearchParams({ date_from: firstDay, date_to: lastDay });
    if (departmentId) params.set("department_id", String(departmentId));
    if (doctorId) params.set("doctor_id", String(doctorId));
    if (serviceTypeId) params.set("service_type_id", String(serviceTypeId));
    let alive = true;
    setSlots(null);
    api<Slot[]>(`/slots?${params}`)
      .then((result) => {
        if (!alive) return;
        setSlots(result);
        setDay((current) => {
          if (current && result.some((slot) => localDate(slot.slot_time) === current)) return current;
          return days.find((d) => result.some((slot) => localDate(slot.slot_time) === d)) ?? null;
        });
      })
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [departmentId, doctorId, serviceTypeId, firstDay, lastDay, days]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const slot of slots ?? []) map.set(localDate(slot.slot_time), (map.get(localDate(slot.slot_time)) ?? 0) + 1);
    return map;
  }, [slots]);

  // Đưa ngày đang chọn vào giữa dải
  // Chỉ cuộn ngang trong dải, không dùng scrollIntoView vì nó kéo cả trang theo
  useEffect(() => {
    const container = strip.current;
    const item = day ? container?.querySelector<HTMLElement>(`[data-day="${day}"]`) : null;
    if (!container || !item) return;
    container.scrollTo({ left: item.offsetLeft - container.clientWidth / 2 + item.clientWidth / 2, behavior: "smooth" });
  }, [day]);

  const scroll = (dir: number) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.75, behavior: "smooth" });

  const daySlots = day && slots ? slots.filter((slot) => localDate(slot.slot_time) === day) : [];
  const morning = daySlots.filter((slot) => Number(time(slot.slot_time).slice(0, 2)) < 12);
  const afternoon = daySlots.filter((slot) => Number(time(slot.slot_time).slice(0, 2)) >= 12);

  const group = (label: string, icon: ReactNode, items: Slot[], offset: number) =>
    items.length > 0 && (
      <div>
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {icon} {label} <span className="font-normal normal-case">· {items.length} khung giờ</span>
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((slot, index) => {
            const active = selected?.session_id === slot.session_id && selected.slot_time === slot.slot_time;
            const few = slot.remaining <= 1;
            return (
              <motion.button
                key={`${slot.session_id}-${slot.slot_time}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(offset + index, 16) * 0.025 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSelect(slot)}
                aria-pressed={active}
                className={`relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  active ? "border-brand-600 text-white shadow-glow" : "border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50/40"
                }`}
              >
                {active && <motion.span layoutId="slot-active" className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-700" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <span className="relative flex items-baseline justify-between gap-2">
                  <span className="text-base font-bold tabular-nums">{time(slot.slot_time)}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      active ? "bg-white/20 text-white" : few ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {few ? "Sắp hết" : `còn ${slot.remaining}`}
                  </span>
                </span>
                <span className={`relative mt-0.5 block truncate text-xs ${active ? "text-brand-50" : "text-slate-500"}`}>{slot.doctor_name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{monthLabel(day ?? firstDay)}</p>
          <div className="flex gap-1.5">
            <button className="btn-secondary h-8 w-8 rounded-full p-0" onClick={() => scroll(-1)} aria-label="Ngày trước">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-secondary h-8 w-8 rounded-full p-0" onClick={() => scroll(1)} aria-label="Ngày sau">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={strip} className="scrollbar-none mask-fade-x relative -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1.5">
          {days.map((d) => {
            const count = counts.get(d) ?? 0;
            const label = dayLabel(d);
            const active = d === day;
            const loading = slots === null;
            return (
              <button
                key={d}
                data-day={d}
                disabled={loading || count === 0}
                onClick={() => setDay(d)}
                className={`relative flex w-[68px] shrink-0 snap-start flex-col items-center rounded-2xl border px-1 py-2.5 text-center transition ${
                  active ? "border-brand-600 text-white shadow-glow" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-400"
                } disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:hover:translate-y-0`}
              >
                {active && <motion.span layoutId="day-active" className="absolute inset-0 rounded-2xl bg-gradient-to-b from-brand-500 to-brand-700" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
                <span className="relative text-[11px] font-medium">{label.weekday}</span>
                <span className="relative text-lg font-bold leading-tight">{label.date.slice(0, 2)}</span>
                <span className={`relative mt-1 text-[10px] font-medium ${active ? "text-brand-100" : count ? "text-emerald-600" : ""}`}>
                  {loading ? "…" : count ? `${count} giờ` : "Nghỉ"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {slots === null ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[60px]" />
          ))}
        </div>
      ) : daySlots.length === 0 ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
          <CalendarX2 className="h-5 w-5 shrink-0" /> Không còn giờ trống trong {SITE.bookingDaysAhead} ngày tới. Thử đổi bác sĩ hoặc hình thức khám.
        </motion.p>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={day} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-5">
            {group("Buổi sáng", <Sun className="h-3.5 w-3.5" />, morning, 0)}
            {group("Buổi chiều", <Moon className="h-3.5 w-3.5" />, afternoon, morning.length)}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
