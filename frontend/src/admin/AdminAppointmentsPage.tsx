import { motion } from "framer-motion";
import { CheckCheck, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api } from "../api";
import { useToast } from "../components/toast";
import { IconInput, Skeleton, StatusBadge } from "../components/ui";
import { localDate, money, time } from "../format";
import type { Appointment } from "../types";

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

/** FR-26: lịch hẹn trong ngày, đánh dấu đã khám. */
export default function AdminAppointmentsPage() {
  const [day, setDay] = useState(localDate(new Date()));
  const toast = useToast();
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [query, setQuery] = useState("");
  const load = useCallback(() => void api<Appointment[]>(`/admin/appointments?day=${day}`).then(setItems), [day]);
  useEffect(() => setItems(null), [day]);
  useEffect(load, [load]);

  const shown = (items ?? []).filter((a) => `${a.code} ${a.patient_name} ${a.department}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lịch hẹn</h1>
          <p className="mt-1 text-slate-500">{items ? `${items.length} lịch hẹn trong ngày` : "Đang tải..."}</p>
        </div>
        <div className="flex gap-2">
          <IconInput icon={<Search className="h-4 w-4" />} className="w-56" placeholder="Tìm mã, tên, khoa..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <input type="date" className="input w-auto" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="whitespace-nowrap border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Giờ</th>
              <th className="px-5 py-3 font-semibold">Mã</th>
              <th className="px-5 py-3 font-semibold">Người khám</th>
              <th className="px-5 py-3 font-semibold">Khoa, bác sĩ</th>
              <th className="px-5 py-3 font-semibold">STT</th>
              <th className="px-5 py-3 font-semibold">Phí</th>
              <th className="px-5 py-3 font-semibold">Trạng thái</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items === null && <SkeletonRows cols={8} />}
            {shown.map((a, i) => (
              <motion.tr
                key={a.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.03 }}
                className="transition-colors hover:bg-slate-50/70"
              >
                <td className="px-5 py-3.5 font-semibold text-slate-900">{time(a.slot_time)}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{a.code}</td>
                <td className="px-5 py-3.5 font-medium text-slate-900">{a.patient_name}</td>
                <td className="px-5 py-3.5">
                  {a.department}
                  <span className="block text-xs text-slate-500">{a.doctor_name}</span>
                </td>
                <td className="px-5 py-3.5">{a.queue_no ?? "–"}</td>
                <td className="px-5 py-3.5">{money(a.price)}</td>
                <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                <td className="px-5 py-3.5 text-right">
                  {a.status === "confirmed" && (
                    <button
                      className="btn-sm btn border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      onClick={() =>
                        void api(`/admin/appointments/${a.id}/complete`, { method: "POST" }).then(() => {
                          toast(`Đã ghi nhận ${a.patient_name} khám xong`);
                          load();
                        })
                      }
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Đã khám xong
                    </button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {items !== null && shown.length === 0 && <p className="p-5 text-sm text-slate-500">Không có lịch hẹn phù hợp.</p>}
      </div>
    </div>
  );
}
