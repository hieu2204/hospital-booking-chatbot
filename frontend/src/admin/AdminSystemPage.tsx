import { Bot, Library, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { api, ApiError } from "../api";
import { useToast } from "../components/toast";
import { ErrorText } from "../components/ui";
import { money } from "../format";
import { totalCost, type Usage } from "./shared";

const USD_TO_VND = 25000;

/** FR-27 và theo dõi chi phí Claude (NFR-10). */
export default function AdminSystemPage() {
  const toast = useToast();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => void api<Usage>("/admin/usage").then(setUsage), []);

  const reindex = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ files: number; changed: number; archived: number }>("/admin/knowledge/reindex", { method: "POST" });
      setResult(`${data.files} tài liệu · index lại ${data.changed} · lưu trữ ${data.archived}`);
      toast("Đã index lại kho tri thức");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không index được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trợ lý và tri thức</h1>
        <p className="mt-1 text-slate-500">Kho tài liệu trợ lý dùng để trả lời, và chi phí gọi Claude.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Library className="h-5 w-5" /></span>
          <h2 className="mt-4 font-semibold">Kho tri thức</h2>
          <p className="mt-1 text-sm text-slate-500">Sau khi sửa file trong thư mục knowledge/, bấm để index lại. Chỉ tài liệu thay đổi mới được xử lý lại.</p>
          <button className="btn-primary mt-5" disabled={busy} onClick={reindex}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Index lại
          </button>
          {result && <p className="mt-3 text-sm text-accent-700">{result}</p>}
          <div className="mt-3"><ErrorText error={error} /></div>
        </div>
        <div className="card p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Bot className="h-5 w-5" /></span>
          <h2 className="mt-4 font-semibold">Chi phí Claude</h2>
          <p className="mt-1 text-3xl font-bold text-slate-900">${totalCost(usage).toFixed(4)}</p>
          <p className="text-sm text-slate-500">khoảng {money(Math.round(totalCost(usage) * USD_TO_VND))}</p>
          <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
            {Object.entries(usage ?? {}).map(([model, row]) => (
              <div key={model} className="py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-xs font-medium text-slate-800">{model}</span>
                  <span className="font-semibold">${row.cost_usd.toFixed(4)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {row.turns} lượt · {Math.round(row.cache_read).toLocaleString("vi-VN")} token đọc cache · {Math.round(row.output).toLocaleString("vi-VN")} token ra
                </p>
              </div>
            ))}
            {usage && Object.keys(usage).length === 0 && <p className="py-3 text-sm text-slate-500">Chưa có lượt chat nào.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
