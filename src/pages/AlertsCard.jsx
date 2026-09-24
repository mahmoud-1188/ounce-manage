import { useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { storeApi } from "../core/api.js";

const TONE = {
  block: "border-red-900 bg-red-950/40 text-red-300",
  warn: "border-amber-800/70 bg-amber-950/30 text-amber-200",
  info: "border-neutral-800 bg-neutral-900 text-neutral-300",
};
const DOT = { block: "bg-red-500", warn: "bg-amber-500", info: "bg-neutral-500" };

/**
 * «يحتاج انتباهك الآن» — تنبيهات كل الفروع من دفاترها مباشرةً:
 * نقدٌ سالب · يوم عملٍ لم يُقفل · طلباتٌ تنتظر الإدارة أو تأخّرت ·
 * ذمم تفوق المبيعات · بضاعة راكدة · فرعٌ بلا حركة. اضغط تنبيهًا لتدخل الفرع.
 */
export default function AlertsCard({ onOpenBranch, onOpenApprovals }) {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    storeApi.fetchAlerts().then((d) => setAlerts(d.alerts || [])).catch(() => setError(true));
  }, []);

  if (error) return null;
  if (alerts === null) return <div className="text-xs text-neutral-500">جارِ فحص الفروع…</div>;

  const serious = alerts.filter((a) => a.level !== "info");
  const shown = showAll ? alerts : alerts.slice(0, 6);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <AlertTriangle size={15} className={serious.length ? "text-amber-500" : "text-emerald-500"} />
          يحتاج انتباهك الآن
        </h3>
        <span className="text-xs text-neutral-500">
          {alerts.length === 0 ? "كل الفروع سليمة" : `${alerts.length} تنبيه${serious.length ? ` · ${serious.length} مهم` : ""}`}
        </span>
      </div>
      {alerts.length === 0 ? (
        <div className="text-xs text-emerald-400">✓ لا نقدَ سالب، ولا أيامَ معلّقة، ولا طلباتٍ متأخرة.</div>
      ) : (
        <div className="space-y-1.5">
          {shown.map((a, i) => (
            <button
              key={`${a.branchId}-${a.kind}-${i}`}
              type="button"
              onClick={() => (a.page === "approvals" && onOpenApprovals ? onOpenApprovals() : onOpenBranch(a.branchId, a.name))}
              className={`w-full text-start flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:brightness-125 ${TONE[a.level] || TONE.info}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[a.level] || DOT.info}`} />
              <span className="font-medium shrink-0">{a.name}</span>
              <span className="flex-1 min-w-0 truncate opacity-90">{a.label}</span>
              <ChevronLeft size={14} className="shrink-0 opacity-60" />
            </button>
          ))}
          {alerts.length > 6 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs text-amber-400">
              {showAll ? "أقل" : `عرض الكل (${alerts.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
