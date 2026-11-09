import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bot, CalendarCheck, Clock, Moon, Stethoscope, Sun, Users } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useDepartments, useDoctors } from "../catalog";
import { useChat } from "../chat";
import DepartmentIcon, { departmentTheme } from "../components/DepartmentIcon";
import DoctorCard from "../components/DoctorCard";
import { AnimatedCounter, Reveal, Stagger, staggerItem } from "../components/motion";
import { EmptyState, Skeleton } from "../components/ui";
import { initials } from "../format";

const WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const SHIFTS = [
  { key: "morning", label: "Sáng", icon: Sun },
  { key: "afternoon", label: "Chiều", icon: Moon },
] as const;

/** Trang chi tiết khoa: giới thiệu, lịch khám trong tuần và bác sĩ của khoa (BR-08). */
export default function DepartmentPage() {
  const { id } = useParams();
  const { ask } = useChat();
  const departments = useDepartments();
  const doctors = useDoctors();
  const department = departments?.find((d) => d.id === Number(id));
  const deptDoctors = useMemo(() => (doctors ?? []).filter((d) => d.department_id === Number(id)), [doctors, id]);
  const others = (departments ?? []).filter((d) => d.id !== Number(id)).slice(0, 6);

  // Bảng tuần: mỗi ô là danh sách bác sĩ khám buổi đó
  const grid = useMemo(() => {
    const cells = new Map<string, { name: string; room: string }[]>();
    for (const doctor of deptDoctors) {
      for (const s of doctor.schedule) {
        const key = `${s.weekday}-${s.shift}`;
        cells.set(key, [...(cells.get(key) ?? []), { name: doctor.full_name, room: s.room }]);
      }
    }
    return cells;
  }, [deptDoctors]);
  const sessionsPerWeek = [...grid.values()].reduce((sum, list) => sum + list.length, 0);
  const serviceTypes = new Set(deptDoctors.flatMap((d) => d.schedule.map((s) => s.service_type)));

  if (departments && !department) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="Không tìm thấy chuyên khoa"
          action={
            <Link to="/doctors" className="btn-primary">
              Xem danh sách bác sĩ
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <section className={`relative overflow-hidden bg-gradient-to-br text-white ${departmentTheme(department?.name).gradient}`}>
        <div className="pointer-events-none absolute inset-0 bg-dots opacity-20" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 animate-float rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 animate-float-slow rounded-full bg-accent-500/20 blur-3xl" />
        {/* Khối trang trí: icon khoa lớn trong các vòng tròn đồng tâm */}
        {department && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute right-[6%] top-1/2 hidden h-72 w-72 -translate-y-1/2 items-center justify-center lg:flex"
          >
            <span className="absolute inset-0 rounded-full border border-white/15" />
            <span className="absolute inset-8 rounded-full border border-white/20 bg-white/5" />
            <span className="absolute inset-16 rounded-full bg-white/10" />
            <DepartmentIcon name={department.name} className="relative h-24 w-24 text-white/80" />
          </motion.div>
        )}
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8">
          <Link to="/doctors" className="inline-flex items-center gap-1.5 text-sm text-brand-100 transition hover:-translate-x-0.5 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Tất cả bác sĩ
          </Link>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <motion.span
              initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/25 backdrop-blur"
            >
              {department ? <DepartmentIcon name={department.name} className="h-10 w-10" /> : <Skeleton className="h-10 w-10 bg-white/20" />}
            </motion.span>
            <div className="flex-1">
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-semibold uppercase tracking-wider text-brand-200">
                Chuyên khoa
              </motion.p>
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-1 text-3xl font-bold text-white sm:text-4xl">
                {department?.name ?? <Skeleton className="h-10 w-64 bg-white/20" />}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-2 max-w-2xl text-brand-100">
                {department?.description}
              </motion.p>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8 flex flex-wrap gap-3">
            <Link to={`/booking?department=${id}`} className="btn btn-lg bg-white text-brand-700 shadow-lift hover:bg-brand-50 dark:!bg-white dark:!text-brand-700">
              <CalendarCheck className="h-5 w-5" /> Đặt lịch khám khoa này
            </Link>
            {department && (
              <button className="btn btn-lg border border-white/25 text-white hover:bg-white/10" onClick={() => ask(`Khoa ${department.name} khám những vấn đề gì?`)}>
                <Bot className="h-5 w-5" /> Hỏi trợ lý về khoa
              </button>
            )}
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <div className="relative z-10 -mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Users, label: "Bác sĩ", value: doctors ? deptDoctors.length : undefined },
            { icon: Clock, label: "Buổi khám mỗi tuần", value: doctors ? sessionsPerWeek : undefined },
            { icon: Stethoscope, label: "Hình thức khám", value: doctors ? serviceTypes.size : undefined },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }} className="card flex items-center gap-4 p-5 shadow-ring">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{item.value === undefined ? <Skeleton className="h-8 w-10" /> : <AnimatedCounter value={item.value} />}</p>
                <p className="text-sm text-slate-500">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <section className="py-16">
          <Reveal>
            <h2 className="section-title">Lịch khám trong tuần</h2>
            <p className="mt-2 text-slate-500">Bác sĩ khám theo buổi cố định. Bấm vào bác sĩ bên dưới để đặt lịch.</p>
          </Reveal>
          <Reveal delay={0.1} className="card mt-8 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-24 px-4 py-3" />
                  {WEEKDAYS.map((day) => (
                    <th key={day} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHIFTS.map((shift) => (
                  <tr key={shift.key} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-4 align-top">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <shift.icon className="h-3.5 w-3.5" /> {shift.label}
                      </span>
                    </td>
                    {WEEKDAYS.map((_, weekday) => {
                      const list = grid.get(`${weekday}-${shift.key}`) ?? [];
                      return (
                        <td key={weekday} className="px-2 py-2 align-top">
                          {!doctors ? (
                            <Skeleton className="h-12" />
                          ) : list.length === 0 ? (
                            <span className="block rounded-xl bg-slate-50 px-2 py-3 text-center text-xs text-slate-300">–</span>
                          ) : (
                            <div className="space-y-1.5">
                              {list.map((item) => (
                                <div
                                  key={item.name}
                                  title={`${item.name} · ${item.room}`}
                                  className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs ${shift.key === "morning" ? "bg-amber-50 text-amber-900" : "bg-indigo-50 text-indigo-900"}`}
                                >
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold shadow-sm">{initials(item.name)}</span>
                                  <span className="min-w-0">
                                    <span className="block truncate font-medium">{item.name.split(" ").slice(-2).join(" ")}</span>
                                    <span className="block truncate opacity-70">{item.room}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </section>

        <section className="pb-16">
          <Reveal>
            <h2 className="section-title">Bác sĩ của khoa</h2>
          </Reveal>
          {!doctors ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : deptDoctors.length === 0 ? (
            <p className="mt-6 text-slate-500">Khoa chưa có bác sĩ trong dữ liệu mẫu.</p>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {deptDoctors.map((doctor, index) => (
                <DoctorCard key={doctor.id} doctor={doctor} departmentName={department?.name} showDepartment={false} index={index} />
              ))}
            </div>
          )}
        </section>

        {others.length > 0 && (
          <section className="border-t border-slate-100 py-16">
            <Reveal>
              <h2 className="text-xl font-bold">Chuyên khoa khác</h2>
            </Reveal>
            <Stagger className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {others.map((d) => (
                <motion.div key={d.id} variants={staggerItem}>
                  <Link to={`/departments/${d.id}`} className="group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-ring">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-110 ${departmentTheme(d.name).soft}`}>
                      <DepartmentIcon name={d.name} className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-900">{d.name}</span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </Link>
                </motion.div>
              ))}
            </Stagger>
          </section>
        )}
      </div>
    </div>
  );
}
