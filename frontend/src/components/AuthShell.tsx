import { motion } from "framer-motion";
import { BadgeCheck, Bot, CalendarCheck, MessageCircle, QrCode, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { HospitalBuilding } from "./Illustrations";

const POINTS = [
  { icon: CalendarCheck, text: "Đặt lịch trước, nhận phiếu khám có số thứ tự" },
  { icon: MessageCircle, text: "Trợ lý ảo giải đáp thủ tục, đặt và hủy lịch 24/7" },
  { icon: ShieldCheck, text: "Số CCCD, thẻ BHYT được mã hóa khi lưu" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** Minh họa bên trái: vài thẻ nổi xếp chồng, trôi nhẹ. */
function Illustration() {
  return (
    <div className="relative mx-auto mt-10 h-72 w-full max-w-sm">
      <HospitalBuilding tone="onColor" className="absolute inset-x-0 bottom-0 w-full" />
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-0 top-4 w-64 rounded-2xl bg-white p-4 text-slate-700 shadow-ring"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">Phiếu khám điện tử</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-white">
            <QrCode className="h-6 w-6" />
          </span>
          <div>
            <p className="text-2xl font-bold leading-none text-brand-700">05</p>
            <p className="text-xs text-slate-500">Tim mạch · 07:30</p>
          </div>
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-2 right-0 w-60 rounded-2xl bg-white p-3.5 text-sm text-slate-700 shadow-ring"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-semibold text-slate-900">Trợ lý ảo</span>
        </div>
        <p className="mt-2 rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2 text-xs">Sáng thứ Tư còn trống 07:00 và 07:30. Bạn chọn giờ nào?</p>
      </motion.div>
      <motion.span
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute right-10 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 text-white shadow-lg"
      >
        <BadgeCheck className="h-5 w-5" />
      </motion.span>
    </div>
  );
}

/** Khung chung cho trang đăng nhập và đăng ký. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 animate-float rounded-full bg-brand-100/60 blur-3xl dark:opacity-20" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 animate-float-slow rounded-full bg-accent-100/70 blur-3xl dark:opacity-20" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:py-16">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative hidden flex-col justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-10 text-white lg:flex"
        >
          <div className="pointer-events-none absolute inset-0 bg-dots opacity-20" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-accent-500/20 blur-2xl" />
          <h2 className="relative text-balance text-3xl font-bold leading-tight text-white">Chăm sóc sức khỏe, bắt đầu từ một lịch hẹn</h2>
          <motion.ul
            className="relative mt-8 space-y-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
          >
            {POINTS.map((point) => (
              <motion.li key={point.text} variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }} className="flex items-center gap-3 text-brand-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <point.icon className="h-5 w-5" />
                </span>
                {point.text}
              </motion.li>
            ))}
          </motion.ul>
          <Illustration />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="flex flex-col justify-center"
        >
          <div className="card mx-auto w-full max-w-md p-6 shadow-ring sm:p-8">
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            <p className="mt-2 text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
