import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarDays, ChevronDown, Clock, LogOut, MapPin, Menu, Phone, Siren, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth";
import { useDepartments } from "../catalog";
import { SITE, tel } from "../site";
import { ThemeToggle } from "../theme";
import ChatWidget from "./ChatWidget";
import DepartmentIcon, { departmentTheme } from "./DepartmentIcon";
import { PageTransition } from "./motion";
import { useToast } from "./toast";

const NAV = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/doctors", label: "Bác sĩ" },
  { to: "/booking", label: "Đặt lịch khám" },
  { to: "/#huong-dan", label: "Hướng dẫn" },
  { to: "/appointments", label: "Lịch hẹn của tôi" },
];

export function Logo({ subtitle = "Đặt lịch khám trực tuyến", light = false }: { subtitle?: string; light?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow transition group-hover:rotate-[8deg]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden>
          <path d="M9.5 3h5a1 1 0 0 1 1 1v4.5H20a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-4.5H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h4.5V4a1 1 0 0 1 1-1Z" />
        </svg>
      </span>
      <span className="whitespace-nowrap leading-tight">
        <span className={`block font-bold ${light ? "text-white" : "text-slate-900"}`}>{SITE.name}</span>
        <span className={`text-xs ${light ? "block text-brand-200" : "hidden text-slate-500 sm:block"}`}>{subtitle}</span>
      </span>
    </Link>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => ref.current && !ref.current.contains(event.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) {
    return (
      <Link to="/login" className="btn-primary px-3 shadow-glow sm:px-4">
        Đăng nhập
      </Link>
    );
  }

  const initials = user.full_name.split(" ").slice(-1)[0]?.charAt(0) ?? "?";
  return (
    <div ref={ref} className="relative">
      <button className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 transition hover:bg-slate-100" onClick={() => setOpen(!open)}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-accent-100 text-sm font-bold text-brand-700">{initials}</span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 sm:block lg:hidden xl:block">{user.full_name}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-ring"
            onClick={() => setOpen(false)}
          >
            <Link to="/appointments" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50">
              <CalendarDays className="h-4 w-4 text-slate-400" /> Lịch hẹn của tôi
            </Link>
            <Link to="/profiles" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50">
              <UserRound className="h-4 w-4 text-slate-400" /> Hồ sơ người bệnh
            </Link>
            <button
              className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
              onClick={() => {
                logout();
                toast("Bạn đã đăng xuất", "info");
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Menu thả xuống liệt kê chuyên khoa, bấm vào là tới trang đặt lịch của khoa đó. */
function DepartmentsMenu() {
  const departments = useDepartments() ?? [];
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.search]);

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className="flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Chuyên khoa <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && departments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 top-full w-[640px] -translate-x-1/2 pt-3"
          >
            <div className="grid grid-cols-3 gap-1 rounded-3xl border border-slate-200 bg-white p-3 shadow-ring">
              {departments.map((dept) => (
                <Link
                  key={dept.id}
                  to={`/departments/${dept.id}`}
                  className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-brand-50"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition group-hover:scale-110 ${departmentTheme(dept.name).soft}`}>
                    <DepartmentIcon name={dept.name} className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-brand-700">{dept.name}</span>
                </Link>
              ))}
              <Link
                to="/booking"
                className="col-span-3 mt-1 flex items-center justify-between rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-semibold text-white"
              >
                Chưa biết khám khoa nào? Đặt lịch khám tổng quát
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function isNavActive(to: string, end: boolean | undefined, pathname: string, hash: string) {
  if (to.includes("#")) return `${pathname}${hash}` === to;
  if (end) return pathname === to && !hash;
  return pathname.startsWith(to);
}

export default function PublicLayout() {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setMenu(false), [location.pathname, location.hash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Link dạng /#huong-dan: cuộn tới section; đổi trang thường thì về đầu trang
  useEffect(() => {
    if (location.hash) {
      const timer = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 60);
      return () => clearTimeout(timer);
    }
    window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="no-print hidden bg-brand-900 text-xs text-brand-100 sm:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Khám ngoại trú: {SITE.hours.short}
          </span>
          <span className="flex items-center gap-4">
            <a href={tel(SITE.hotline)} className="flex items-center gap-1.5 transition hover:text-white">
              <Phone className="h-3.5 w-3.5" /> Tổng đài {SITE.hotline}
            </a>
            <a href={tel(SITE.emergencyCall)} className="flex items-center gap-1.5 font-semibold text-rose-200 transition hover:text-white">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
              </span>
              <Siren className="h-3.5 w-3.5" /> Cấp cứu {SITE.emergencyCall}
            </a>
          </span>
        </div>
      </div>

      <header
        className={`no-print sticky top-0 z-30 border-b transition-all duration-300 ${
          scrolled ? "border-slate-200/70 bg-white/80 shadow-soft backdrop-blur-xl" : "border-transparent bg-white"
        }`}
      >
        <div className={`mx-auto flex max-w-6xl items-center gap-3 px-4 sm:gap-6 transition-all duration-300 ${scrolled ? "h-16" : "h-[76px]"}`}>
          <Logo />
          <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
            {NAV.slice(0, 1).map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
            <DepartmentsMenu />
            {NAV.slice(1).map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:ml-0">
            <ThemeToggle />
            <AccountMenu />
            <button className="btn-ghost px-2.5 lg:hidden" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {menu && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-slate-100 lg:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={() =>
                      `rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                        isNavActive(item.to, item.end, location.pathname, location.hash) ? "bg-brand-50 text-brand-700" : "text-slate-600"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}

/** Mục menu desktop: gạch chân trượt theo mục đang chọn (layoutId). */
function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  const location = useLocation();
  const active = isNavActive(to, end, location.pathname, location.hash);
  return (
    <NavLink
      to={to}
      end={end}
      className={`relative whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "text-brand-700" : "text-slate-600 hover:text-slate-900"}`}
    >
      {label}
      {active && (
        <motion.span
          layoutId="nav-underline"
          className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-brand-600 to-accent-500"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
    </NavLink>
  );
}

function Footer() {
  const departments = useDepartments() ?? [];
  const mapQuery = encodeURIComponent(SITE.address);
  return (
    <footer className="no-print relative overflow-hidden bg-brand-900 text-brand-100">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-20" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Dải kêu gọi đặt lịch */}
        <div className="flex flex-col items-start justify-between gap-6 border-b border-white/10 py-10 md:flex-row md:items-center">
          <div>
            <p className="text-2xl font-bold text-white">Sẵn sàng đặt lịch khám?</p>
            <p className="mt-1 text-brand-200">Chọn giờ trước, đến viện đúng giờ, không phải xếp hàng lấy số.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/booking" className="btn-lg btn bg-white text-brand-700 shadow-lift hover:bg-brand-50 dark:!bg-white dark:!text-brand-700 dark:hover:!bg-brand-50">
              <CalendarDays className="h-5 w-5" /> Đặt lịch ngay
            </Link>
            <a href={tel(SITE.hotline)} className="btn-lg btn border border-white/20 text-white hover:bg-white/10">
              <Phone className="h-5 w-5" /> {SITE.hotline}
            </a>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo light subtitle={SITE.branch} />
            <p className="mt-4 flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" /> {SITE.address}
            </p>
            <p className="mt-4 text-xs leading-relaxed text-brand-300">
              Đồ án học tập. Nghiệp vụ tham khảo từ BV Đại học Y Dược TP.HCM, tên bác sĩ là giả định.
            </p>
          </div>

          <div className="text-sm">
            <p className="font-semibold text-white">Chuyên khoa</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-1">
              {departments.slice(0, 6).map((dept) => (
                <li key={dept.id}>
                  <Link to={`/departments/${dept.id}`} className="transition hover:text-white">
                    {dept.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm">
            <p className="font-semibold text-white">Giờ làm việc</p>
            <ul className="mt-4 space-y-2">
              <li>{SITE.hours.weekday}</li>
              <li>{SITE.hours.saturday}</li>
              <li>{SITE.hours.closed}</li>
            </ul>
            <p className="mt-5 font-semibold text-white">Liên hệ</p>
            <ul className="mt-3 space-y-2">
              <li>
                Tổng đài:{" "}
                <a href={tel(SITE.hotline)} className="font-medium text-white hover:underline">
                  {SITE.hotline}
                </a>
              </li>
              <li>
                Khoa Cấp cứu 24/7:{" "}
                <a href={tel(SITE.emergencyPhone)} className="font-medium text-white hover:underline">
                  {SITE.emergencyPhone}
                </a>
              </li>
              <li className="font-semibold text-rose-300">Khẩn cấp: gọi {SITE.emergencyCall}</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Bản đồ</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <iframe
                title="Bản đồ đường đến bệnh viện"
                src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                className="h-40 w-full grayscale-[30%]"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-brand-300 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {SITE.name} · Bản demo phục vụ học tập</span>
          <span>Trợ lý ảo chỉ hỗ trợ thủ tục, không thay thế chẩn đoán của bác sĩ</span>
        </div>
      </div>
    </footer>
  );
}
