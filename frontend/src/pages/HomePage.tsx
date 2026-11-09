import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileCheck2,
  HeartHandshake,
  IdCard,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Siren,
  Sparkles,
  Star,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useDepartments, useDoctors } from "../catalog";
import { useChat } from "../chat";
import DepartmentIcon from "../components/DepartmentIcon";
import { AnimatedCounter, Reveal, Stagger, staggerItem } from "../components/motion";
import { Skeleton } from "../components/ui";
import { SITE, tel } from "../site";
import type { Doctor } from "../types";

const QUESTIONS = [
  "Không có giấy chuyển tuyến có khám BHYT được không?",
  "Đặt lịch xong đến viện cần làm gì?",
  "Hủy lịch thì bao lâu được hoàn tiền?",
  "Xét nghiệm máu có cần nhịn ăn không?",
];

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

// Kịch bản hội thoại minh họa, phát lần lượt rồi lặp lại
const SCRIPT = ["user", "typing", "bot", "card"] as const;

/** Khung chat minh họa: tin nhắn hiện lần lượt như đang trò chuyện thật. */
function HeroChat() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? SCRIPT.length : 0);

  useEffect(() => {
    if (reduce) return;
    const delay = step === 0 ? 700 : step === 1 ? 900 : step === 2 ? 1200 : step === 3 ? 1400 : 5000;
    const timer = setTimeout(() => setStep((s) => (s >= SCRIPT.length ? 0 : s + 1)), delay);
    return () => clearTimeout(timer);
  }, [step, reduce]);

  const show = (name: (typeof SCRIPT)[number]) => step > SCRIPT.indexOf(name);
  const bubble = { initial: { opacity: 0, y: 10, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0 } };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-brand-200/70 via-white/0 to-accent-100 blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="relative rounded-3xl border border-white/80 bg-white/85 p-5 shadow-ring backdrop-blur-xl"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <Bot className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Trợ lý ảo</p>
            <p className="text-xs text-emerald-600">Đang trực tuyến</p>
          </div>
        </div>

        <div className="mt-4 flex min-h-[262px] flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {show("user") && (
              <motion.p key="u" layout {...bubble} className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-tr-md bg-brand-600 px-3.5 py-2 text-sm text-white">
                Mình bị ợ chua, muốn khám sáng thứ 4
              </motion.p>
            )}
            {show("typing") && !show("bot") && (
              <motion.div key="t" layout {...bubble} className="flex w-fit gap-1 rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-slate-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                  />
                ))}
              </motion.div>
            )}
            {show("bot") && (
              <motion.p key="b" layout {...bubble} className="w-fit max-w-[85%] rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2 text-sm">
                Bạn nên khám khoa <b>Tiêu hóa</b>. Sáng thứ Tư còn trống 07:00, 07:30, 08:00. Bạn chọn giờ nào?
              </motion.p>
            )}
            {show("card") && (
              <motion.div key="c" layout {...bubble} className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Phiếu đặt lịch</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Tiêu hóa · Thứ Tư 07:00</p>
                <p className="text-xs text-slate-500">Bác sĩ giả định · Phòng 31</p>
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Xác nhận
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Hai thẻ nổi trang trí quanh khung chat */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
        transition={{ opacity: { delay: 0.8 }, x: { delay: 0.8 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -right-4 -top-7 hidden items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-lift sm:flex"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <BadgeCheck className="h-4 w-4" />
        </span>
        <span className="text-xs">
          <span className="block font-semibold text-slate-900">Đã xác nhận lịch</span>
          <span className="text-slate-500">Số thứ tự 05</span>
        </span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1 }, x: { delay: 1 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -bottom-7 -left-8 hidden items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-lift sm:flex"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <QrCode className="h-4 w-4" />
        </span>
        <span className="text-xs">
          <span className="block font-semibold text-slate-900">Phiếu khám điện tử</span>
          <span className="text-slate-500">Quét QR tại quầy</span>
        </span>
      </motion.div>
    </div>
  );
}

function Hero() {
  const { ask } = useChat();
  const departments = useDepartments();
  const doctors = useDoctors();
  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
  });

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
      {/* Nền: lưới mờ và hai đốm màu trôi chậm */}
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] animate-float rounded-full bg-brand-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-20 h-[24rem] w-[24rem] animate-float-slow rounded-full bg-accent-100/80 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 lg:grid-cols-[1.1fr_1fr] lg:pb-32 lg:pt-20">
        <div>
          <motion.span
            {...fade(0)}
            className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Đặt lịch trước, không phải xếp hàng lấy số
          </motion.span>
          <motion.h1 {...fade(0.08)} className="mt-6 text-balance text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Đặt lịch khám dễ dàng <span className="text-gradient">với trợ lý ảo</span> 24/7
          </motion.h1>
          <motion.p {...fade(0.16)} className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Hỏi thủ tục BHYT, được gợi ý chuyên khoa theo triệu chứng, rồi đặt, đổi hoặc hủy lịch khám ngay trong cuộc trò chuyện.
          </motion.p>
          <motion.div {...fade(0.24)} className="mt-8 flex flex-wrap gap-3">
            <Link to="/booking" className="btn-primary btn-lg group shadow-glow">
              <CalendarCheck className="h-5 w-5" /> Đặt lịch khám
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <button className="btn-secondary btn-lg" onClick={() => ask("Mình muốn đặt lịch khám, bạn hướng dẫn giúp")}>
              <MessageCircle className="h-5 w-5" /> Đặt qua trợ lý ảo
            </button>
          </motion.div>

          <motion.dl {...fade(0.32)} className="mt-12 grid max-w-md grid-cols-3 divide-x divide-slate-200">
            {[
              { value: departments?.length, label: "chuyên khoa" },
              { value: doctors?.length, label: "bác sĩ" },
              { text: "24/7", label: "trợ lý trực tuyến" },
            ].map((item, index) => (
              <div key={item.label} className={index ? "pl-6" : ""}>
                <dt className="text-3xl font-bold text-slate-900">
                  {item.text ?? (item.value ? <AnimatedCounter value={item.value} /> : <Skeleton className="h-9 w-12" />)}
                </dt>
                <dd className="mt-1 text-sm text-slate-500">{item.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
        <HeroChat />
      </div>

      {/* Sóng chuyển sang phần dưới */}
      <svg className="absolute bottom-0 left-0 h-12 w-full text-white" viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden>
        <path fill="currentColor" d="M0 48h1440V20c-180 18-420 28-720 8S180 8 0 24v24Z" />
      </svg>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Lối tắt                                                             */
/* ------------------------------------------------------------------ */

function QuickActions() {
  const { ask } = useChat();
  const items: { icon: LucideIcon; title: string; text: string; to?: string; href?: string; onClick?: () => void; danger?: boolean }[] = [
    { icon: CalendarCheck, title: "Đặt lịch khám", text: "Chọn khoa, bác sĩ, giờ trống", to: "/booking" },
    { icon: ClipboardList, title: "Lịch hẹn của tôi", text: "Thanh toán, đổi hoặc hủy lịch", to: "/appointments" },
    { icon: Clock, title: "Giờ làm việc", text: SITE.hours.compact, onClick: () => ask("Giờ làm việc của bệnh viện thế nào?") },
    { icon: Siren, title: "Cấp cứu 24/7", text: `Gọi ${SITE.emergencyCall} hoặc ${SITE.emergencyPhone}`, href: tel(SITE.emergencyCall), danger: true },
  ];

  return (
    <section className="relative z-10 mx-auto -mt-16 max-w-6xl px-4">
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const content = (
            <>
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition duration-300 ${
                  item.danger ? "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white" : "bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{item.title}</span>
                <span className="block text-sm text-slate-500">{item.text}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 -translate-x-1 text-slate-300 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
            </>
          );
          const className = "group card flex h-full items-center gap-4 p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-brand-100 hover:shadow-ring";
          return (
            <motion.div key={item.title} variants={staggerItem}>
              {item.to ? (
                <Link to={item.to} className={className}>
                  {content}
                </Link>
              ) : item.href ? (
                <a href={item.href} className={className}>
                  {content}
                </a>
              ) : (
                <button onClick={item.onClick} className={`${className} w-full`}>
                  {content}
                </button>
              )}
            </motion.div>
          );
        })}
      </Stagger>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Chuyên khoa                                                         */
/* ------------------------------------------------------------------ */

function SectionHeading({ eyebrow, title, text, center }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`eyebrow flex items-center gap-2 ${center ? "justify-center" : ""}`}>
        <span className="h-px w-6 bg-brand-500" /> {eyebrow}
      </p>
      <h2 className="section-title mt-3 text-balance">{title}</h2>
      {text && <p className="mt-3 text-slate-500">{text}</p>}
    </Reveal>
  );
}

function Departments() {
  const { ask } = useChat();
  const departments = useDepartments();
  const list = departments?.filter((dept) => dept.name !== "Khám bệnh");

  return (
    <section id="chuyen-khoa" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Chuyên khoa"
          title="Khám đúng chuyên khoa ngay từ đầu"
          text="Chọn khoa để xem lịch trống, hoặc để trợ lý gợi ý theo triệu chứng của bạn."
        />
        <Reveal delay={0.1}>
          <button className="btn-secondary" onClick={() => ask("Mình nên khám khoa nào? Mình sẽ mô tả triệu chứng")}>
            <Bot className="h-4 w-4" /> Nhờ trợ lý gợi ý khoa
          </button>
        </Reveal>
      </div>

      {!list ? (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card space-y-3 p-5">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <Stagger className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((dept) => (
            <motion.div key={dept.id} variants={staggerItem}>
              <Link
                to={`/booking?department=${dept.id}`}
                className="group card relative flex h-full flex-col gap-3 overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-ring"
              >
                <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-50 opacity-0 transition duration-500 group-hover:scale-150 group-hover:opacity-100" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition duration-300 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-glow">
                  <DepartmentIcon name={dept.name} />
                </span>
                <span className="relative">
                  <span className="block font-semibold text-slate-900">{dept.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{dept.description}</span>
                </span>
                <span className="relative mt-auto flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
                  Xem lịch trống <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </Stagger>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Vì sao chọn                                                         */
/* ------------------------------------------------------------------ */

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Clock, title: "Không xếp hàng lấy số", text: "Đặt giờ khám trước, nhận số thứ tự và giờ khám dự kiến ngay trên phiếu." },
  { icon: Bot, title: "Trợ lý ảo trả lời có nguồn", text: "Câu trả lời dựa trên tài liệu hướng dẫn của bệnh viện và ghi rõ tài liệu đã dùng." },
  { icon: Users, title: "Đặt cho cả gia đình", text: "Một tài khoản quản lý nhiều hồ sơ người bệnh: bản thân, cha mẹ, con cái." },
  { icon: ShieldCheck, title: "Bảo vệ dữ liệu cá nhân", text: "Số CCCD và số thẻ BHYT nhập qua form riêng, không gửi vào khung chat." },
];

function WhyUs() {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-24">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-60 [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Vì sao chọn chúng tôi" title="Đi khám nhẹ nhàng hơn, từ lúc đặt lịch tới lúc ra về" />
          <Stagger className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <motion.div key={feature.title} variants={staggerItem} className="group">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft ring-1 ring-slate-100 transition group-hover:-rotate-6 group-hover:bg-brand-600 group-hover:text-white">
                  <feature.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-semibold text-slate-900">{feature.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{feature.text}</p>
              </motion.div>
            ))}
          </Stagger>
        </div>

        {/* Minh họa phiếu khám điện tử */}
        <Reveal delay={0.15} className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-6 rotate-3 rounded-[2.5rem] bg-gradient-to-br from-brand-600 to-accent-500 opacity-90" />
          <div className="relative overflow-hidden rounded-3xl bg-white shadow-ring">
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 text-white">
              <p className="text-xs uppercase tracking-wider text-brand-100">Phiếu khám điện tử</p>
              <p className="mt-1 text-lg font-bold">Khoa Tim mạch</p>
            </div>
            <div className="relative px-6 py-5">
              <span className="absolute -left-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-50" />
              <span className="absolute -right-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-50" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Số thứ tự</p>
                  <p className="text-3xl font-bold text-brand-700">05</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Giờ dự kiến</p>
                  <p className="text-3xl font-bold text-slate-900">07:30</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Phòng</p>
                  <p className="font-semibold text-slate-900">Phòng 24</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Người khám</p>
                  <p className="font-semibold text-slate-900">Nguyễn Văn A</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-4 border-t border-dashed border-slate-200 pt-5">
                <div className="grid h-16 w-16 grid-cols-5 gap-0.5 rounded-lg bg-slate-900 p-1.5">
                  {"1011001101110100110101101".split("").map((bit, i) => (
                    <span key={i} className={bit === "1" ? "bg-white" : ""} />
                  ))}
                </div>
                <p className="text-xs text-slate-500">Đưa mã QR tại quầy tiếp nhận hoặc phòng khám để xác nhận.</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hướng dẫn                                                           */
/* ------------------------------------------------------------------ */

type Guide = { key: string; label: string; steps: { icon: LucideIcon; title: string; text: string }[] };

// Nội dung theo BR-13, BR-20, BR-25; mốc giờ và chi phí xem trên phiếu hoặc hỏi trợ lý
const GUIDES: Guide[] = [
  {
    key: "service",
    label: "Khám dịch vụ",
    steps: [
      { icon: UserRound, title: "Tạo hồ sơ người bệnh", text: "Đăng nhập bằng số điện thoại, tạo hồ sơ cho bản thân hoặc người thân." },
      { icon: Stethoscope, title: "Chọn chuyên khoa", text: "Tự chọn hoặc mô tả triệu chứng để trợ lý gợi ý khoa phù hợp." },
      { icon: CalendarDays, title: "Chọn ngày giờ", text: `Xem khung giờ còn trống của bác sĩ, đặt trước tối đa ${SITE.bookingDaysAhead} ngày.` },
      { icon: Wallet, title: "Thanh toán", text: "Lịch hẹn được xác nhận sau khi thanh toán, nhận phiếu khám có mã QR." },
      { icon: Clock, title: "Đến phòng khám", text: "Đến thẳng phòng khám ghi trên phiếu, trước giờ hẹn khoảng 15–30 phút." },
    ],
  },
  {
    key: "bhyt",
    label: "Khám BHYT",
    steps: [
      { icon: IdCard, title: "Chuẩn bị giấy tờ", text: "Thẻ BHYT hoặc CCCD/VNeID có tích hợp BHYT, kèm giấy tờ tùy thân có ảnh." },
      { icon: FileCheck2, title: "Giấy chuyển tuyến", text: "Khám đúng tuyến cần giấy chuyển tuyến hoặc giấy hẹn tái khám còn hạn." },
      { icon: CalendarCheck, title: "Đặt lịch, chọn đối tượng BHYT", text: "Chọn đúng tuyến hoặc trái tuyến khi đặt; hệ thống cảnh báo nếu giấy sắp hết hạn." },
      { icon: ClipboardList, title: "Xác nhận tại quầy BHYT", text: "Đến quầy BHYT ở Khu A để xác nhận thẻ trước khi vào phòng khám." },
      { icon: HeartHandshake, title: "Khám và thanh toán", text: "Khám theo số thứ tự, thanh toán phần chênh lệch không được BHYT chi trả." },
    ],
  },
];

function GuideSection() {
  const { ask } = useChat();
  const [active, setActive] = useState(GUIDES[0].key);
  const guide = GUIDES.find((g) => g.key === active) ?? GUIDES[0];

  return (
    <section id="huong-dan" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
      <SectionHeading center eyebrow="Hướng dẫn" title="Quy trình khám bệnh" text="Từng bước từ lúc đặt lịch tới khi vào phòng khám." />

      <Reveal className="mt-8 flex justify-center">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
          {GUIDES.map((g) => (
            <button
              key={g.key}
              onClick={() => setActive(g.key)}
              className={`relative rounded-xl px-5 py-2.5 text-sm font-semibold transition ${active === g.key ? "text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              {active === g.key && (
                <motion.span layoutId="guide-tab" className="absolute inset-0 rounded-xl bg-brand-600 shadow-glow" transition={{ type: "spring", stiffness: 450, damping: 35 }} />
              )}
              <span className="relative">{g.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      <div className="relative mt-14">
        {/* Đường nối các bước, chạy dần khi đổi tab */}
        <motion.div
          key={`line-${active}`}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute left-[10%] right-[10%] top-7 hidden h-0.5 origin-left bg-gradient-to-r from-brand-200 via-brand-400 to-accent-500 md:block"
        />
        <AnimatePresence mode="wait">
          <motion.ol
            key={active}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="relative grid gap-8 md:grid-cols-5 md:gap-4"
          >
            {guide.steps.map((step, index) => (
              <motion.li key={step.title} variants={staggerItem} className="flex gap-4 md:flex-col md:items-center md:text-center">
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-ring ring-4 ring-white">
                  <step.icon className="h-6 w-6" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{index + 1}</span>
                </span>
                <span>
                  <span className="block font-semibold text-slate-900 md:mt-4">{step.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-500">{step.text}</span>
                </span>
              </motion.li>
            ))}
          </motion.ol>
        </AnimatePresence>
      </div>

      <Reveal className="mt-12 text-center">
        <button
          className="btn-ghost text-brand-700"
          onClick={() => ask(active === "bhyt" ? "Khám BHYT cần chuẩn bị những gì?" : "Đặt lịch xong đến viện cần làm gì?")}
        >
          <Sparkles className="h-4 w-4" /> Hỏi trợ lý chi tiết hơn
        </button>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Đội ngũ bác sĩ                                                      */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const AVATAR_GRADIENTS = ["from-brand-500 to-brand-700", "from-accent-500 to-accent-700", "from-sky-400 to-brand-600", "from-indigo-400 to-brand-700"];

function scheduleText(doctor: Doctor): string {
  const parts = doctor.schedule
    .slice()
    .sort((a, b) => a.weekday - b.weekday)
    .map((s) => `${s.shift === "morning" ? "Sáng" : "Chiều"} ${WEEKDAYS[s.weekday]}`);
  return [...new Set(parts)].slice(0, 3).join(" · ");
}

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words[words.length - 2][0] + words[words.length - 1][0] : words[0][0]).toUpperCase();
}

function Doctors() {
  const doctors = useDoctors();
  const departments = useDepartments();
  const track = useRef<HTMLDivElement>(null);
  const deptName = useMemo(() => new Map(departments?.map((d) => [d.id, d.name])), [departments]);

  // Mỗi khoa lấy một bác sĩ để dải giới thiệu đa dạng
  const featured = useMemo(() => {
    if (!doctors) return null;
    const seen = new Set<number>();
    return doctors.filter((d) => !seen.has(d.department_id) && seen.add(d.department_id)).slice(0, 10);
  }, [doctors]);

  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * (track.current.clientWidth * 0.8), behavior: "smooth" });

  return (
    <section id="bac-si" className="scroll-mt-24 bg-gradient-to-b from-white to-brand-50/60 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Đội ngũ" title="Bác sĩ khám theo lịch cố định trong tuần" text="Tên bác sĩ trong bản demo là giả định." />
          <div className="flex gap-2">
            <button className="btn-secondary h-11 w-11 rounded-full p-0" onClick={() => scroll(-1)} aria-label="Xem trước">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button className="btn-secondary h-11 w-11 rounded-full p-0" onClick={() => scroll(1)} aria-label="Xem tiếp">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div ref={track} className="scrollbar-none -mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6">
          {(featured ?? Array.from({ length: 4 }, () => null)).map((doctor, index) => (
            <motion.article
              key={doctor?.id ?? `s${index}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: Math.min(index, 4) * 0.07 }}
              className="group card w-[260px] shrink-0 snap-start overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-ring"
            >
              {doctor ? (
                <>
                  <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]}`}>
                    <div className="absolute inset-0 bg-dots opacity-30" />
                    <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white ring-4 ring-white/30 backdrop-blur transition duration-500 group-hover:scale-110">
                      {initials(doctor.full_name)}
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-700">
                      {deptName.get(doctor.department_id) ?? "Chuyên khoa"}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium text-slate-400">{doctor.title}</p>
                    <p className="font-semibold text-slate-900">{doctor.full_name}</p>
                    <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                      {scheduleText(doctor) || "Chưa có lịch"}
                    </p>
                    <Link
                      to={`/booking?department=${doctor.department_id}`}
                      className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2 text-sm font-semibold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white"
                    >
                      Đặt lịch <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="space-y-3 p-5">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Đánh giá                                                            */
/* ------------------------------------------------------------------ */

// Đánh giá minh họa cho bản demo, không phải phản hồi thật
const REVIEWS = [
  { name: "Chị H.", text: "Đặt lịch cho mẹ qua trợ lý mất vài phút, đến viện vào khám đúng giờ.", tag: "Tim mạch" },
  { name: "Anh T.", text: "Hỏi giấy chuyển tuyến BHYT được trả lời rõ ràng, có ghi nguồn tài liệu.", tag: "BHYT" },
  { name: "Cô L.", text: "Không phải xếp hàng lấy số từ sáng sớm như trước nữa.", tag: "Nội tiết" },
  { name: "Bạn M.", text: "Mô tả triệu chứng xong được gợi ý khoa, đặt luôn trong khung chat.", tag: "Tiêu hóa" },
  { name: "Chú P.", text: "Đổi lịch khám online tiện, không cần gọi tổng đài.", tag: "Cơ xương khớp" },
  { name: "Chị N.", text: "Một tài khoản đặt được cho cả nhà, xem lịch hẹn rất gọn.", tag: "Da liễu" },
];

function Reviews() {
  return (
    <section className="overflow-hidden py-24">
      <SectionHeading center eyebrow="Trải nghiệm" title="Người bệnh nói gì" text="Đánh giá minh họa cho bản demo." />
      <div className="mask-fade-x group mt-12 flex">
        <div className="flex shrink-0 animate-marquee gap-5 pr-5 group-hover:[animation-play-state:paused]">
          {[...REVIEWS, ...REVIEWS].map((review, index) => (
            <figure key={index} className="card w-80 shrink-0 p-6" aria-hidden={index >= REVIEWS.length}>
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-slate-600">“{review.text}”</blockquote>
              <figcaption className="mt-4 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-900">{review.name}</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{review.tag}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Câu hỏi thường gặp                                                  */
/* ------------------------------------------------------------------ */

// Câu trả lời ngắn theo BR-11, BR-12, BR-20, BR-26, BR-28; chi tiết mốc giờ để trợ lý trả lời từ kho tri thức
const FAQ = [
  { q: "Tôi có thể đặt lịch cho người thân không?", a: "Được. Một tài khoản quản lý nhiều hồ sơ người bệnh; bạn tạo hồ sơ cho người thân trong mục Hồ sơ người bệnh rồi chọn hồ sơ đó khi đặt lịch." },
  { q: "Khám BHYT đúng tuyến cần mang gì?", a: "Thẻ BHYT hoặc CCCD/VNeID có tích hợp BHYT, giấy tờ tùy thân có ảnh, và giấy chuyển tuyến hoặc giấy hẹn tái khám còn hạn." },
  { q: "Không biết nên khám khoa nào thì sao?", a: "Bạn mô tả triệu chứng cho trợ lý ảo để được gợi ý chuyên khoa, hoặc chọn Khám tổng quát. Trợ lý chỉ gợi ý khoa, không chẩn đoán bệnh." },
  { q: "Tôi muốn hủy hoặc đổi lịch đã đặt?", a: "Vào Lịch hẹn của tôi để hủy hoặc đổi lịch. Việc hủy, đổi online có hạn chót trước ngày khám; quá hạn thì cần gọi tổng đài." },
  { q: "Trường hợp cấp cứu có đặt lịch được không?", a: `Không. Khoa Cấp cứu hoạt động 24/7 và không nhận đặt lịch qua hệ thống. Khi khẩn cấp hãy gọi ${SITE.emergencyCall} hoặc đến thẳng Khoa Cấp cứu.` },
];

function Faq() {
  const { ask } = useChat();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHeading eyebrow="Hỏi đáp" title="Câu hỏi thường gặp" text="Không thấy câu bạn cần? Hỏi trợ lý ảo, câu trả lời có ghi nguồn tài liệu." />
          <Reveal delay={0.1} className="mt-8 rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white">
            <p className="font-semibold">Hỏi nhanh trợ lý ảo</p>
            <div className="mt-4 flex flex-col gap-2">
              {QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => ask(question)}
                  className="group flex items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-3 text-left text-sm transition hover:bg-white/20"
                >
                  {question}
                  <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <Stagger className="space-y-3">
          {FAQ.map((item, index) => {
            const isOpen = open === index;
            return (
              <motion.div key={item.q} variants={staggerItem} className={`card overflow-hidden transition ${isOpen ? "border-brand-200 shadow-ring" : ""}`}>
                <button className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left" onClick={() => setOpen(isOpen ? null : index)} aria-expanded={isOpen}>
                  <span className="font-semibold text-slate-900">{item.q}</span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${isOpen ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <div className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
                        {item.a}
                        <button className="mt-3 flex items-center gap-1.5 font-semibold text-brand-700 hover:underline" onClick={() => ask(item.q)}>
                          <Bot className="h-4 w-4" /> Hỏi trợ lý chi tiết
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickActions />
      <Departments />
      <WhyUs />
      <GuideSection />
      <Doctors />
      <Reviews />
      <Faq />
    </>
  );
}
