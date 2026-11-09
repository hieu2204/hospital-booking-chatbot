import { motion } from "framer-motion";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { LostIllustration } from "../components/Illustrations";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-72">
        <LostIllustration className="w-full" />
      </motion.div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-600">Lỗi 404</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Không tìm thấy trang</h1>
      <p className="mt-2 text-slate-500">Đường dẫn có thể đã đổi hoặc không tồn tại. Bạn quay về trang chủ hoặc đặt lịch khám nhé.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Trang chủ
        </Link>
        <Link to="/booking" className="btn-primary">
          <CalendarCheck className="h-4 w-4" /> Đặt lịch khám
        </Link>
      </div>
    </div>
  );
}
