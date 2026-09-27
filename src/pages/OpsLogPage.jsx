import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { storeApi } from "../core/api.js";

const KIND = { close_day: "إقفال يوم عمل", close_month: "إقفال شهر", remote_stocktake: "جرد من الإدارة", hq_purchase: "شراء على حساب الفرع",
  review: "حكم مراجعة", reverse: "عكس قيد", adjustment: "قيد تسوية", bank_fee: "تسوية عمولة بنك", provision: "تجهيز الفرع" };

/** سجلّ عمليات الإدارة في كل الفروع (المرجع: سجلّ مهامّ الإدارة) — من سجلّ تدقيق كل فرع، ما فعله مستخدمو الإدارة. */
export default function OpsLogPage() {
  const [log, setLog] = useState(null);
  const [branch, setBranch] = useState("");
  useEffect(() => { storeApi.fetchOpsLog().then((d) => setLog(d.log || [])).catch(() => setLog([])); }, []);
  const branches = [...new Map((log || []).map((l) => [l.branchId, l.branchName])).entries()];
  const shown = (log || []).filter((l) => !branch || l.branchId === branch);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History size={20} className="text-amber-500" />
        <h2 className="text-lg font-semibold flex-1">سجلّ عمليات الإدارة</h2>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs">
          <option value="">كل الفروع</option>
          {branches.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
      </div>
      {!log ? <div className="text-neutral-400 text-sm">جارِ التحميل…</div> : shown.length === 0 ? <div className="text-neutral-500 text-sm">لا عمليات مسجّلة من الإدارة بعد.</div> : (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 divide-y divide-neutral-800">
          {shown.map((l) => (
            <div key={l.id} className="px-4 py-2.5 text-sm flex items-center gap-3 flex-wrap">
              <span className="text-xs text-neutral-500 w-32 shrink-0 tabular-nums">{new Date(l.date).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
              <span className="font-medium">{KIND[l.kind] || l.kind}</span>
              <span className="text-xs text-neutral-400 flex-1">{l.branchName}{l.details?.period ? ` · ${l.details.period}` : ""}{l.details?.note ? ` · ${l.details.note}` : ""}</span>
              <span className="text-xs text-amber-300">{l.by}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
