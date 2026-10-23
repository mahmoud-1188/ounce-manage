import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { storeApi } from "../core/api.js";

/**
 * التفويض بضغطة: «تفويض كامل للفرع» و«بلا موافقات» — ضغطةٌ تشغّل وضغطةٌ تُطفئ.
 * بلا تفويض: حدود الاعتماد وإضافة الموظفين وصلاحياتهم للإدارة وحدها.
 * وتحتهما «ما مضى بلا موافقة» (المرجع): كل عمليةٍ فوق الحدّ مضت بالتفويض في 30 يومًا، بمبلغها ومن أجراها ومتى.
 */
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const FLAGS = [
  { key: "full", label: "تفويض كامل للفرع", hint: "الفرع يقرّر كل اعتماداته بنفسه ولا يصعد شيءٌ للإدارة، ويحدّد حدوده ويدير موظفيه وصلاحياتهم." },
  { key: "noApprovals", label: "بلا موافقات", hint: "لا طلبات اعتماد في هذا الفرع — كل عمليةٍ تُنفَّذ مباشرةً مهما بلغ مبلغها." },
];

export default function BranchDelegationCard({ branchId }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [waived, setWaived] = useState([]);
  const [showWaived, setShowWaived] = useState(false);
  useEffect(() => {
    storeApi.fetchWaived(branchId).then((r) => setWaived(r.waived || [])).catch(() => setWaived([]));
  }, [branchId]);
  useEffect(() => {
    let live = true;
    storeApi.fetchDelegation(branchId).then((r) => { if (live) setD(r.delegation); }).catch(() => { if (live) setError("تعذّر تحميل التفويض"); });
    return () => { live = false; };
  }, [branchId]);
  const toggle = async (key) => {
    setBusy(key); setError("");
    try { const r = await storeApi.setDelegation(branchId, { [key]: !d[key] }); setD(r.delegation); }
    catch { setError("تعذّر حفظ التفويض"); } finally { setBusy(""); }
  };
  if (!d) return error ? <div className="text-xs text-red-400">{error}</div> : null;
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 space-y-2" data-delegation>
      <div className="flex items-center gap-2">
        <ShieldCheck size={15} className="text-amber-500" />
        <span className="text-sm font-medium">التفويض</span>
      </div>
      {FLAGS.map((f) => (
        <div key={f.key} className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm">{f.label}</div>
            <div className="text-xs text-neutral-500">{f.hint}</div>
          </div>
          <button type="button" role="switch" aria-checked={!!d[f.key]} data-delegation-flag={f.key} disabled={!!busy} onClick={() => toggle(f.key)}
            className={`shrink-0 w-11 h-6 rounded-full relative transition-colors disabled:opacity-50 ${d[f.key] ? "bg-emerald-600" : "bg-neutral-700"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${d[f.key] ? "right-0.5" : "right-[22px]"}`} />
          </button>
        </div>
      ))}
      {!d.full && <p className="text-xs text-neutral-500">بلا تفويضٍ كامل: حدود الاعتماد (مثل الإيجار) وإضافة الموظفين وصلاحياتهم من هنا وحدها.</p>}
      {waived.length > 0 && (
        <div className="border-t border-neutral-800 pt-2" data-delegation-waived>
          <button type="button" onClick={() => setShowWaived(!showWaived)} className="w-full text-start text-xs text-amber-300">
            ما مضى بلا موافقة (30 يومًا): {waived.length} عملية · {nf.format(waived.reduce((a, w) => a + w.amount, 0))} {showWaived ? "▴" : "▾"}
          </button>
          {showWaived && (
            <div className="mt-1.5 space-y-1">
              {waived.map((w) => (
                <div key={w.id} className="text-xs flex items-start justify-between gap-2">
                  <span className="text-neutral-300 min-w-0">{w.kindLabel}{w.note ? ` · ${w.note}` : ""}
                    <span className="block text-neutral-500">{w.actor || "—"} · {new Date(w.at).toLocaleString("en-GB")}{w.reason === "routing_none" ? " · نوعٌ بلا موافقة" : ""}</span>
                  </span>
                  <span className="tabular-nums shrink-0">{nf.format(w.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
}
