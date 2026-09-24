import { useCallback, useEffect, useState } from "react";
import { Activity, ChevronDown, ChevronUp, History, Sun } from "lucide-react";
import { storeApi, ApiError } from "../core/api.js";

const EVENT_LABELS = { create: "إنشاء", update: "تعديل", delete: "حذف", approve: "اعتماد", reject: "رفض", void: "إلغاء", login: "دخول", post: "ترحيل" };

/**
 * تشغيل الفرع من الإدارة (v197 في المرجع):
 *   صحّة الفرع (المستخدمون · اليوم · آخر بيع) · إقفال يوم العمل من الإدارة
 *   بالمعالج نفسه · سجلّ تدقيق الفرع (آخر 200 حركة).
 */
export default function BranchOpsCard({ branchId }) {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [audit, setAudit] = useState(null);

  const loadHealth = useCallback(() => {
    storeApi.fetchBranches()
      .then((d) => setHealth((Array.isArray(d) ? d : d.branches || []).find((b) => b.id === branchId) || {}))
      .catch(() => setError("تعذّر تحميل حالة الفرع"));
  }, [branchId]);
  useEffect(loadHealth, [loadHealth]);

  useEffect(() => {
    if (!showAudit || audit) return;
    storeApi.fetchBranchAudit(branchId)
      .then((d) => setAudit(d.audit || []))
      .catch(() => setError("تعذّر تحميل سجل التدقيق"));
  }, [showAudit, audit, branchId]);

  const closeDay = async () => {
    if (!window.confirm("إقفال يوم العمل المفتوح في الفرع الآن؟ تُكتب لقطة الإقفال كما هي في النظام.")) return;
    setBusy(true);
    setError("");
    try {
      const r = await storeApi.closeBranchDay(branchId, "");
      setMsg(`أُقفل يوم ${r.day?.ref || ""}`);
      setAudit(null);
      loadHealth();
    } catch (err) {
      setError(err instanceof ApiError && err.body?.error === "no_open_business_day" ? "لا يوم عمل مفتوح في الفرع" : "تعذّر إقفال اليوم");
    } finally {
      setBusy(false);
    }
  };

  const h = health || {};
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
      <div className="flex items-center gap-2">
        <Activity size={15} className="text-amber-500" />
        <span className="text-sm font-medium">حالة الفرع</span>
      </div>
      {health && (
        <p className="text-xs text-neutral-400">
          {h.users_count ?? 0} مستخدم نشط · آخر بيع {h.last_sale_at ? new Date(h.last_sale_at).toLocaleString("en-GB") : "—"} ·{" "}
          {h.open_day_ref ? `يوم مفتوح ${h.open_day_ref} منذ ${new Date(h.open_day_at).toLocaleString("en-GB")}` : "لا يوم مفتوح"}
        </p>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      {msg && <div className="text-xs text-emerald-400">{msg}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={closeDay}
          disabled={busy || !h.open_day_ref}
          className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 disabled:opacity-40"
        >
          <Sun size={13} /> {busy ? "…" : "إقفال يوم الفرع الآن"}
        </button>
        <button
          type="button"
          onClick={() => setShowAudit((v) => !v)}
          className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium bg-neutral-800 border border-neutral-700 text-neutral-200"
        >
          <History size={13} /> سجلّ التدقيق {showAudit ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
      {showAudit && (
        <div className="max-h-80 overflow-y-auto rounded-lg border border-neutral-800">
          {audit === null ? (
            <div className="text-xs text-neutral-500 p-2">جارِ التحميل…</div>
          ) : audit.length === 0 ? (
            <div className="text-xs text-neutral-500 p-2">لا حركات مسجّلة.</div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="bg-neutral-800/60 text-neutral-400">
                <tr><th className="p-1.5 text-start">الوقت</th><th className="p-1.5 text-start">من</th><th className="p-1.5 text-start">الفعل</th><th className="p-1.5 text-start">البيان</th></tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-neutral-800">
                    <td className="p-1.5 text-neutral-500 whitespace-nowrap" dir="ltr">{new Date(a.date).toLocaleString("en-GB")}</td>
                    <td className="p-1.5 text-neutral-300">{a.actor || "—"}</td>
                    <td className="p-1.5 text-neutral-300">{EVENT_LABELS[a.event] || a.event}</td>
                    <td className="p-1.5 text-neutral-400">{a.details?.kind || a.table || ""}{a.details?.ref ? ` · ${a.details.ref}` : ""}{a.details?.note ? ` · ${a.details.note}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
