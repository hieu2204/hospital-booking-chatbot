import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, ClipboardList, ExternalLink, LayoutDashboard, Library, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth";
import { PageTransition } from "../components/motion";
import { useToast } from "../components/toast";
import { initials } from "../format";
import { SITE } from "../site";

const NAV = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/admin/sessions", label: "Ca khám", icon: CalendarRange },
  { to: "/admin/appointments", label: "Lịch hẹn", icon: ClipboardList },
  { to: "/admin/system", label: "Trợ lý và tri thức", icon: Library },
];

/** Khu vực quản trị tách riêng: layout có thanh bên, không dùng chung menu với người bệnh. */
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const sidebar = (layoutId: string) => (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="relative flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden>
            <path d="M9.5 3h5a1 1 0 0 1 1 1v4.5H20a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-4.5H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h4.5V4a1 1 0 0 1 1-1Z" />
          </svg>
        </span>
        <div className="leading-tight">
          <p className="font-bold text-white">{SITE.name}</p>
          <p className="text-xs text-slate-400">Quản trị hệ thống</p>
        </div>
      </div>
      <nav className="relative flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              {active && (
                <motion.span layoutId={layoutId} className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/10" transition={{ type: "spring", stiffness: 500, damping: 38 }}>
                  <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-400" />
                </motion.span>
              )}
              <item.icon className="relative h-[18px] w-[18px]" />
              <span className="relative">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="relative space-y-1 border-t border-white/10 p-3">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-[18px] w-[18px]" /> Xem trang người bệnh
        </Link>
        <button
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
          onClick={() => {
            logout();
            toast("Bạn đã đăng xuất", "info");
            navigate("/admin/login");
          }}
        >
          <LogOut className="h-[18px] w-[18px]" /> Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-900 lg:block">{sidebar("admin-nav")}</aside>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 left-0 w-64 bg-slate-900 shadow-2xl"
            >
              {sidebar("admin-nav-mobile")}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl sm:px-8">
          <button className="btn-ghost px-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="ml-auto flex items-center gap-2.5 text-sm text-slate-500">
            <span className="hidden sm:inline">Đăng nhập:</span>
            <span className="font-medium text-slate-800">{user?.full_name}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{user ? initials(user.full_name) : "?"}</span>
          </div>
        </header>
        <main className="px-4 py-8 sm:px-8">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
