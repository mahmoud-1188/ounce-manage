import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { storeApi } from "../core/api.js";

const DAY = 86400000;
const ago = (t) => (t ? Math.floor((Date.now() - new Date(t).getTime()) / DAY) : null);

/**
 * امتثال الفروع (المرجع hqConsole:compliance — «نبض الفروع، هل طبّق الفرع»): كل فرعٍ على سطره بما يحتاج
 * انتباهًا الآن — يومٌ مفتوح أكثر من يوم، لا بيع منذ أيام، فرعٌ موقوف، بلا موظفين نشطين، وتنبيهاته.
 * السياسة والسعر وحدود الاعتماد يفرضها الخادم على الفرع لحظة الطلب، فلا «لم يُطبَّق» لها هنا.
 */
export default function CompliancePage({ onOpenBranch }) {
  const [branches, setBranches] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    storeApi.fetchBranches().then((d) => setBranches(Array.isArray(d) ? d : d.branches || [])).catch(() => setError("تعذّر تحميل الفروع"));
    storeApi.fetchAlerts().then((d) => setAlerts(d.alerts || [])).catch(() => {});
  }, []);

  const rows = (branches || []).filter((b) => !b.is_hq).map((b) => {
    const issues = [];
    if (b.locked) issues.push({ bad: true, text: "موقوف من الإدارة" });
    const openDays = b.open_day_at ? (Date.now() - new Date(b.open_day_at).getTime()) / 3600000 : null;
    if (openDays != null && openDays > 24) issues.push({ bad: true, text: `يومٌ مفتوح منذ ${Math.floor(openDays)} ساعة` });
    const sold = ago(b.last_sale_at);
    if (sold == null) issues.push({ bad: false, text: "لا مبيعات بعد" });
    else if (sold >= 3) issues.push({ bad: sold >= 7, text: `آخر بيع منذ ${sold} يومًا` });
    if (!(Number(b.users_count) > 0)) issues.push({ bad: true, text: "بلا موظفين نشطين" });
    const own = alerts.filter((a) => a.branchId === b.id);
    own.forEach((a) => issues.push({ bad: a.level === "block" || a.level === "warn", text: a.label }));
    return { b, issues };
  });
  const ok = rows.filter((r) => !r.issues.length).length;

  return (
    <div className="space-y-4" data-compliance>
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-amber-500" />
        <h2 className="text-lg font-semibold">امتثال الفروع</h2>
      </div>
      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
      {branches === null && !error && <div className="text-xs text-neutral-500">جارِ التحميل…</div>}
      {branches && (
        <p className="text-xs text-neutral-400">{rows.length ? `${ok} من ${rows.length} فرعًا بلا ملاحظات.` : "لا فروع بعد."} السعر والسياسة وحدود الاعتماد يفرضها الخادم على كل فرع لحظة الطلب.</p>
      )}
      <div className="space-y-2">
        {rows.map(({ b, issues }) => (
          <button key={b.id} type="button" onClick={() => onOpenBranch?.(b.id, b.name)}
            className={`w-full text-right rounded-xl border p-3 bg-neutral-900 ${issues.some((i) => i.bad) ? "border-red-900" : issues.length ? "border-amber-500/30" : "border-neutral-800"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{b.name}</span>
              <span className={`text-[11px] font-bold ${issues.length ? (issues.some((i) => i.bad) ? "text-red-400" : "text-amber-400") : "text-emerald-400"}`}>
                {issues.length ? `${issues.length} ملاحظة` : "✓ ممتثل"}
              </span>
            </div>
            {issues.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {issues.map((i, k) => (
                  <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full border ${i.bad ? "border-red-900 text-red-300" : "border-neutral-700 text-neutral-300"}`}>{i.text}</span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
