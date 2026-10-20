import { useEffect, useState } from "react";
import { Hammer } from "lucide-react";
import { storeApi } from "../core/api.js";

const wf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/// هدر التصنيع في الفروع (المرجع WastageReportView للإدارة): لكل فرعٍ نسبة هدره ومسموحه والزائد وأعلى ورشة،
/// والمطالبات المفتوحة على الورش — الحساب على الخادم من أوامر الورشة المقفلة في الفترة.
export default function WastageCard() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setError("");
    storeApi.fetchWastage(from, to).then((d) => setRows(d.branches || [])).catch(() => setError("تعذّر تحميل تقرير الهدر"));
  }, [from, to]);
  const input = "block mt-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-sm text-neutral-100";
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3" data-hq-wastage>
      <div className="flex items-center gap-2"><Hammer size={18} className="text-amber-500" /><h3 className="font-semibold">كم ضاع في التصنيع؟ — الفروع</h3></div>
      <div className="flex gap-2 flex-wrap">
        <label className="text-xs text-neutral-400">من<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} /></label>
        <label className="text-xs text-neutral-400">إلى<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} /></label>
      </div>
      {error && <div className="text-sm text-red-400">{error}</div>}
      {!rows ? <div className="text-neutral-400 text-sm">جارِ التحميل…</div> : rows.length === 0 ? <div className="text-xs text-neutral-500">لا أوامر ورشة في الفروع لهذه الفترة.</div> : rows.map((b) => (
        <div key={b.branchId} className="rounded-lg border border-neutral-800 px-3 py-2" data-hq-wastage-row={b.name}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">{b.name}</span>
            <span className={`text-xs font-semibold ${b.over > 0.0005 ? "text-red-400" : "text-emerald-400"}`}>{b.jobs ? `${nf.format(b.lossPct)}٪ (المسموح ${nf.format(b.allowPct)}٪)` : "لا أوامر مقفلة"}</span>
          </div>
          <div className="text-xs text-neutral-500">
            {b.jobs} أمر · صُرف {wf.format(b.issued)} جم صافٍ · الهدر {wf.format(b.loss)} · الزائد {wf.format(b.over)} جم ({nf.format(b.overValue)})
            {b.top ? ` · أعلى ورشة: ${b.top.name} ${nf.format(b.top.lossPct)}٪` : ""}{b.manual ? ` · ⚠ ${b.manual} وزنًا باليد` : ""}
          </div>
          {(b.claims?.rows?.length > 0 || b.receiving > 0) && (
            <div className={`text-xs ${b.claims?.overdue ? "text-red-400" : "text-amber-300"}`}>
              {b.claims?.rows?.length ? `مطالبات مفتوحة ${b.claims.rows.length} · ${wf.format(b.claims.fine)} جم${b.claims.overdue ? ` · ${b.claims.overdue} تجاوزت المهلة` : ""}` : ""}
              {b.receiving ? `${b.claims?.rows?.length ? " · " : ""}${b.receiving} أمر قيد الاستلام` : ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
