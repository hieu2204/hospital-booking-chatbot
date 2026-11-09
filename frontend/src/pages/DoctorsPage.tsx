import { AnimatePresence, motion } from "framer-motion";
import { Search, SearchX, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";

import { useDepartments, useDoctors } from "../catalog";
import DoctorCard from "../components/DoctorCard";
import { EmptyState, IconInput, Skeleton } from "../components/ui";
import { SITE } from "../site";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active ? "text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900 hover:ring-brand-300"}`}
    >
      {active && <motion.span layoutId="doctor-filter" className="absolute inset-0 rounded-full bg-brand-600 shadow-glow" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
      <span className="relative">{children}</span>
    </button>
  );
}

/** Danh sách bác sĩ, lọc theo khoa, ngày khám trong tuần và tên (BR-08, BR-12b). */
export default function DoctorsPage() {
  const doctors = useDoctors();
  const departments = useDepartments();
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [weekday, setWeekday] = useState<number | null>(null);
  const deptName = useMemo(() => new Map(departments?.map((d) => [d.id, d.name])), [departments]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (doctors ?? []).filter(
      (d) =>
        (departmentId === null || d.department_id === departmentId) &&
        (weekday === null || d.schedule.some((s) => s.weekday === weekday)) &&
        (!q || `${d.title} ${d.full_name} ${deptName.get(d.department_id) ?? ""}`.toLowerCase().includes(q)),
    );
  }, [doctors, departmentId, weekday, query, deptName]);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 animate-float rounded-full bg-accent-100/70 blur-3xl dark:opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-12">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow flex items-center gap-2">
            <span className="h-px w-6 bg-brand-500" /> Đội ngũ
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Tìm bác sĩ và đặt lịch
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-2 max-w-2xl text-slate-500">
            Mỗi bác sĩ khám theo buổi cố định trong tuần. Tên bác sĩ trong bản demo là giả định.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 max-w-xl">
            <IconInput icon={<Search className="h-4 w-4" />} className="py-3 shadow-soft" placeholder="Tìm theo tên bác sĩ hoặc chuyên khoa" value={query} onChange={(e) => setQuery(e.target.value)} />
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-20">
        <div className="sticky top-16 z-10 -mx-4 space-y-3 bg-white/85 px-4 py-4 backdrop-blur-xl">
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-0.5">
            <Chip active={departmentId === null} onClick={() => setDepartmentId(null)}>
              Tất cả khoa
            </Chip>
            {departments?.map((d) => (
              <Chip key={d.id} active={departmentId === d.id} onClick={() => setDepartmentId(d.id)}>
                {d.name}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Ngày khám:</span>
            {[null, ...WEEKDAYS.map((_, i) => i)].map((value) => (
              <button
                key={value ?? "all"}
                onClick={() => setWeekday(value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${weekday === value ? "bg-slate-900 text-slate-50" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {value === null ? "Bất kỳ" : WEEKDAYS[value]}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-500">{doctors ? `${shown.length} bác sĩ` : ""}</span>
          </div>
        </div>

        {!doctors ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="card space-y-3 p-5">
                <Skeleton className="h-20" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-9" />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={<SearchX className="h-6 w-6" />} title="Không tìm thấy bác sĩ phù hợp" text="Thử bỏ bớt bộ lọc hoặc tìm bằng tên khác." />
          </div>
        ) : (
          <motion.div layout className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {shown.map((doctor, index) => (
                <DoctorCard key={doctor.id} doctor={doctor} departmentName={deptName.get(doctor.department_id)} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Stethoscope className="h-3.5 w-3.5" /> {SITE.hours.weekday} · {SITE.hours.saturday}
        </p>
      </div>
    </div>
  );
}
