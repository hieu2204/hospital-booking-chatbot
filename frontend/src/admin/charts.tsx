import { AnimatePresence, motion } from "framer-motion";
import { Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * Biểu đồ một chuỗi số liệu, vẽ bằng SVG.
 * Theo quy cách: cột <= 24px, đầu cột bo 4px, chân cột vuông, lưới mảnh, chữ dùng màu chữ
 * (không dùng màu cột), có tooltip khi rê chuột và có chế độ xem bảng.
 * Màu cột lấy từ biến --chart-bar (sáng #1f7ae0, tối #3b8aea, đã kiểm bằng validate_palette).
 */
export interface Datum {
  key: string;
  label: string;
  /** Dòng phụ dưới nhãn, ví dụ ngày tháng */
  sub?: string;
  value: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  const options = [1, 2, 2.5, 5, 10].map((m) => m * step);
  const tick = options.find((t) => value / t <= 4) ?? 10 * step;
  return Math.ceil(value / tick) * tick;
}

/** Đầu cột bo 4px, chân vuông. */
function columnPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function barPath(x: number, y: number, w: number, h: number): string {
  if (w <= 0) return "";
  const r = Math.min(4, w, h / 2);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

function ChartFrame({ title, subtitle, unit, data, children }: { title: string; subtitle?: string; unit: string; data: Datum[]; children: ReactNode }) {
  const [table, setTable] = useState(false);
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <button className="btn-ghost btn-sm" onClick={() => setTable(!table)} aria-pressed={table}>
          <Table2 className="h-3.5 w-3.5" /> {table ? "Xem biểu đồ" : "Xem bảng"}
        </button>
      </div>
      <div className="mt-4">
        {table ? (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.map((d) => (
                <tr key={d.key}>
                  <td className="py-2 text-slate-600">
                    {d.label}
                    {d.sub && <span className="ml-1.5 text-xs text-slate-400">{d.sub}</span>}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
                    {d.value} {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Tooltip({ datum, unit, x, y }: { datum: Datum; unit: string; x: string; y: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 shadow-lift"
      style={{ left: x, top: y }}
    >
      <span className="font-semibold">{datum.label}</span>
      {datum.sub && <span className="opacity-70"> {datum.sub}</span>}
      <span className="block tabular-nums">
        {datum.value} {unit}
      </span>
    </motion.div>
  );
}

/** Cột dọc theo thời gian (ít mốc, mỗi mốc một cột). */
export function ColumnChart({ title, subtitle, unit, data, highlight }: { title: string; subtitle?: string; unit: string; data: Datum[]; highlight?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, left = 32, right = 8, top = 16, bottom = 40;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * max));
  const band = (W - left - right) / Math.max(data.length, 1);
  const colW = Math.min(24, band * 0.5);
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);

  return (
    <ChartFrame title={title} subtitle={subtitle} unit={unit} data={data}>
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
          {[...new Set(ticks)].map((t) => (
            <g key={t}>
              <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} className="stroke-slate-100" strokeWidth="1" />
              <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-slate-400">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = left + band * (i + 0.5);
            const h = H - bottom - y(d.value);
            const strong = hover === i || d.key === highlight;
            return (
              <g key={d.key} onMouseEnter={() => setHover(i)}>
                {/* Vùng bắt chuột rộng hơn cột */}
                <rect x={cx - band / 2} y={top} width={band} height={H - top - bottom} fill="transparent" />
                {hover === i && <rect x={cx - band / 2 + 4} y={top} width={band - 8} height={H - top - bottom} rx="6" className="fill-slate-50" />}
                <motion.path
                  d={columnPath(cx - colW / 2, y(d.value), colW, h)}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: strong || hover === null ? 1 : 0.45, scaleY: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: i * 0.05 }}
                  style={{ transformOrigin: `${cx}px ${H - bottom}px`, fill: "var(--chart-bar)" }}
                />
                {d.value > 0 && (
                  <text x={cx} y={y(d.value) - 6} textAnchor="middle" fontSize="11" fontWeight="600" className="fill-slate-600">
                    {d.value}
                  </text>
                )}
                <text x={cx} y={H - bottom + 16} textAnchor="middle" fontSize="11" fontWeight={d.key === highlight ? 700 : 500} className="fill-slate-700">
                  {d.label}
                </text>
                {d.sub && (
                  <text x={cx} y={H - bottom + 30} textAnchor="middle" fontSize="10" className="fill-slate-400">
                    {d.sub}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={left} x2={W - right} y1={H - bottom} y2={H - bottom} className="stroke-slate-200" strokeWidth="1" />
        </svg>
        <AnimatePresence>
          {hover !== null && data.at(hover) && (
            <Tooltip
              datum={data.at(hover)!}
              unit={unit}
              x={`${((left + band * (hover + 0.5)) / W) * 100}%`}
              y={`${(y(data.at(hover)!.value) / H) * 100 - 4}%`}
            />
          )}
        </AnimatePresence>
      </div>
    </ChartFrame>
  );
}

/** Thanh ngang xếp từ lớn tới nhỏ, dùng so sánh giữa các nhóm (khoa). */
export function BarList({ title, subtitle, unit, data, empty }: { title: string; subtitle?: string; unit: string; data: Datum[]; empty: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((d) => d.value));
  const W = 400, row = 30, labelW = 150, H = Math.max(row * sorted.length, row);

  return (
    <ChartFrame title={title} subtitle={subtitle} unit={unit} data={sorted}>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}: ${sorted.map((d) => `${d.label} ${d.value}`).join(", ")}`} onMouseLeave={() => setHover(null)}>
          {sorted.map((d, i) => {
            const y0 = i * row;
            const w = ((W - labelW - 36) * d.value) / max;
            const dim = hover !== null && hover !== d.key;
            return (
              <g key={d.key} onMouseEnter={() => setHover(d.key)}>
                <rect x="0" y={y0} width={W} height={row} fill="transparent" />
                {hover === d.key && <rect x="0" y={y0 + 2} width={W} height={row - 4} rx="6" className="fill-slate-50" />}
                <text x={labelW - 10} y={y0 + row / 2 + 4} textAnchor="end" fontSize="11.5" className="fill-slate-700">
                  {d.label.length > 22 ? `${d.label.slice(0, 21)}…` : d.label}
                  <title>{d.label}</title>
                </text>
                <motion.path
                  d={barPath(labelW, y0 + row / 2 - 7, Math.max(w, 2), 14)}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: dim ? 0.45 : 1, scaleX: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: i * 0.04 }}
                  style={{ transformOrigin: `${labelW}px 0px`, fill: "var(--chart-bar)" }}
                />
                <text x={labelW + Math.max(w, 2) + 6} y={y0 + row / 2 + 4} fontSize="11.5" fontWeight="600" className="fill-slate-600">
                  {d.value}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </ChartFrame>
  );
}
