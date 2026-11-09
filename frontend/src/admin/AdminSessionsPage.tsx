import { motion } from "framer-motion";
import { Info, Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api, ApiError } from "../api";
import { useToast } from "../components/toast";
import { ErrorText, Skeleton } from "../components/ui";
import { addDays, localDate } from "../format";
import type { Doctor } from "../types";
import type { AdminSession } from "./shared";

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }, (_, j) => (
            <td key={j} className="px-5 py-4">
              <Skeleton className="h-4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** FR-25: ca khám theo ngày, khóa ca hoặc chỉ định bác sĩ khám thay (BR-09, BR-10, BR-28a). */
export default function AdminSessionsPage() {
  const [day, setDay] = useState(addDays(localDate(new Date()), 1));
  const toast = useToast();
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setSessions(null);
    void api<AdminSession[]>(`/admin/sessions?day=${day}`).then(setSessions);
  }, [day]);
  useEffect(load, [load]);
  useEffect(() => void api<Doctor[]>("/doctors").then(setDoctors), []);

  const lock = async (session: AdminSession, substituteId: number | null) => {
    setError(null);
    try {
      await api(`/admin/sessions/${session.id}/lock`, { body: { substitute_doctor_id: substituteId } });
      toast(substituteId ? "Đã chỉ định bác sĩ khám thay" : "Đã khóa ca, các lịch hẹn chuyển sang Cần đổi lịch");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thực hiện được");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ca khám</h1>
          <p className="mt-1 text-slate-500">Xử lý khi bác sĩ nghỉ đột xuất.</p>
        </div>
        <input type="date" className="input w-auto" value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      <p className="flex gap-2.5 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Trước 16:30 ngày hôm trước có thể khóa ca, các lịch đã đặt chuyển sang "Cần đổi lịch". Sau mốc đó phải chỉ định bác sĩ khám thay.
      </p>
      <ErrorText error={error} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="whitespace-nowrap border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Khoa</th>
              <th className="px-5 py-3 font-semibold">Giờ</th>
              <th className="px-5 py-3 font-semibold">Bác sĩ</th>
              <th className="px-5 py-3 font-semibold">Hình thức</th>
              <th className="px-5 py-3 font-semibold">Đã đặt</th>
              <th className="px-5 py-3 font-semibold">Xử lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions === null && <SkeletonRows cols={6} />}
            {sessions?.map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.03 }}
                className={`transition-colors ${s.status === "locked" ? "bg-slate-50 text-slate-400" : "hover:bg-slate-50/70"}`}
              >
                <td className="px-5 py-3.5">
                  <span className="block font-medium text-slate-900">{s.department}</span>
                  <span className="text-xs text-slate-500">{s.room}</span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">{s.start_time}–{s.end_time}</td>
                <td className="px-5 py-3.5">
                  {s.substitute ? (
                    <>
                      <span className="block text-xs text-slate-400 line-through">{s.doctor}</span>
                      <span className="font-medium text-slate-900">{s.substitute}</span>
                      <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">khám thay</span>
                    </>
                  ) : (
                    s.doctor
                  )}
                </td>
                <td className="px-5 py-3.5">{s.service_type}</td>
                <td className="px-5 py-3.5">{s.booked}/{s.capacity}</td>
                <td className="px-5 py-3.5">
                  {s.status === "locked" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600"><Lock className="h-3.5 w-3.5" /> Đã khóa</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select className="input w-44 py-1.5 text-xs" value="" onChange={(e) => e.target.value && void lock(s, Number(e.target.value))}>
                        <option value="">Bác sĩ khám thay...</option>
                        {doctors.filter((d) => d.department_id === s.department_id).map((d) => (
                          <option key={d.id} value={d.id}>{d.title} {d.full_name}</option>
                        ))}
                      </select>
                      <button className="btn-sm btn border border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => window.confirm("Khóa ca này?") && void lock(s, null)}>
                        Khóa ca
                      </button>
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {sessions?.length === 0 && <p className="p-5 text-sm text-slate-500">Không có ca khám trong ngày này.</p>}
      </div>
    </div>
  );
}
