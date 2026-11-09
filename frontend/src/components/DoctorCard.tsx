import { motion } from "framer-motion";
import { ArrowRight, DoorOpen } from "lucide-react";
import { forwardRef } from "react";
import { Link } from "react-router-dom";

import type { Doctor } from "../types";
import DoctorAvatar from "./DoctorAvatar";
import { departmentTheme } from "./DepartmentIcon";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Thẻ bác sĩ: avatar minh họa, khoa, các buổi khám trong tuần và nút đặt lịch với bác sĩ đó. */
const DoctorCard = forwardRef<HTMLDivElement, { doctor: Doctor; departmentName?: string; showDepartment?: boolean; index: number }>(function DoctorCard(
  { doctor, departmentName, showDepartment = true, index },
  ref,
) {
  const sessions = [...doctor.schedule].sort((a, b) => a.weekday - b.weekday || a.shift.localeCompare(b.shift));
  const rooms = [...new Set(doctor.schedule.map((s) => s.room))];
  const theme = departmentTheme(departmentName);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      className="group card flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-ring"
    >
      <div className={`relative flex h-28 items-end bg-gradient-to-br px-5 ${theme.gradient}`}>
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <span className="relative h-20 w-20 translate-y-1/2 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-white shadow-ring ring-4 ring-white transition duration-500 group-hover:-rotate-3 group-hover:scale-105">
          <DoctorAvatar seed={doctor.id} className="h-full w-full translate-y-1" />
        </span>
        {showDepartment && departmentName && (
          <Link
            to={`/departments/${doctor.department_id}`}
            className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur transition hover:bg-white"
          >
            {departmentName}
          </Link>
        )}
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-14">
        <p className="text-xs font-medium text-slate-400">{doctor.title}</p>
        <p className="font-semibold text-slate-900">{doctor.full_name}</p>
        {doctor.bio && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{doctor.bio}</p>}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {sessions.map((s) => (
            <span
              key={`${s.weekday}-${s.shift}`}
              title={`${s.service_type} · ${s.room}`}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                s.shift === "morning" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
              }`}
            >
              {s.shift === "morning" ? "Sáng" : "Chiều"} {WEEKDAYS[s.weekday]}
            </span>
          ))}
          {sessions.length === 0 && <span className="text-xs text-slate-400">Chưa có lịch khám</span>}
        </div>
        {rooms.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <DoorOpen className="h-3.5 w-3.5" /> {rooms.join(", ")}
          </p>
        )}

        <Link
          to={`/booking?doctor=${doctor.id}`}
          className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white"
        >
          Đặt lịch với bác sĩ <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
});

export default DoctorCard;
