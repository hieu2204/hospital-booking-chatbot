import { ArrowLeft, Info, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "../api";
import { ErrorText, Row, Spinner } from "../components/ui";
import { dateTime, money, PAYER_LABEL, time } from "../format";
import type { Ticket } from "../types";

/** BR-17: phiếu khám điện tử có mã QR, số thứ tự, giờ dự kiến và hướng dẫn (BR-25). */
export default function TicketPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Ticket>(`/appointments/${id}/ticket`)
      .then(setTicket)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được phiếu khám"));
  }, [id]);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link to="/appointments" className="no-print mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Lịch hẹn của tôi
      </Link>
      {error ? (
        <ErrorText error={error} />
      ) : !ticket ? (
        <Spinner />
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lift">
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-5 text-white">
              <p className="text-xs font-medium uppercase tracking-wider text-brand-100">Phiếu khám bệnh điện tử</p>
              <p className="mt-1 text-xl font-bold">{ticket.department}</p>
              <p className="text-sm text-brand-100">{dateTime(ticket.slot_time)}</p>
            </div>
            <div className="relative flex items-center gap-6 px-6 py-6">
              <div className="rounded-2xl border border-slate-200 p-2.5">
                <QRCodeSVG value={ticket.qr_payload} size={108} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Số thứ tự</p>
                <p className="text-5xl font-bold leading-none text-brand-700">{ticket.queue_no}</p>
                {ticket.estimated_time && <p className="mt-2 text-sm text-slate-600">Giờ dự kiến <b>{time(ticket.estimated_time)}</b></p>}
                <p className="mt-1 font-mono text-sm text-slate-500">{ticket.code}</p>
              </div>
            </div>
            <div className="border-t border-dashed border-slate-200 px-6 py-4">
              <div className="divide-y divide-slate-100">
                <Row label="Người khám">{ticket.patient_name}</Row>
                <Row label="Bác sĩ">{ticket.doctor_name}</Row>
                <Row label="Phòng">{ticket.room}</Row>
                <Row label="Hình thức">{ticket.service_type}</Row>
                <Row label="Đối tượng">{PAYER_LABEL[ticket.payer_type]}</Row>
                <Row label="Đã thanh toán">{money(ticket.price)}</Row>
              </div>
              <p className="mt-4 flex gap-2.5 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {ticket.instructions}
              </p>
            </div>
          </div>
          <button className="no-print btn-secondary mt-5 w-full" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> In phiếu khám
          </button>
        </>
      )}
    </div>
  );
}
