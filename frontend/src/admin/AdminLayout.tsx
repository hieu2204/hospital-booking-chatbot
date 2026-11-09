import { CalendarRange, ClipboardList, ExternalLink, LayoutDashboard, Library, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth";

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
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-white">+</span>
        <div className="leading-tight">
          <p className="font-bold text-white">Bệnh viện Demo</p>
          <p className="text-xs text-slate-400">Quản trị hệ thống</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-[18px] w-[18px]" /> Xem trang người bệnh
        </Link>
        <button
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          onClick={() => {
            logout();
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-900 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-8">
          <button className="btn-ghost px-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <p className="ml-auto text-sm text-slate-500">
            Đăng nhập: <span className="font-medium text-slate-800">{user?.full_name}</span>
          </p>
        </header>
        <main className="px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
