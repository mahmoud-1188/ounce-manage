import { useEffect, useState } from "react";
import { PackageOpen } from "lucide-react";
import { storeApi } from "../core/api.js";

const wf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

/**
 * تكويد الافتتاح (المرجع HqOpeningPhaseForm): «بضاعة افتتاحية بلا مورد» في تكويد الفرع.
 * الإدارة والمالك وحدهما ينهيانها (يُقفل التكويد بلا مورد: كل قطعةٍ بعدها من دفعة مورد) أو يعيدان فتحها بسببٍ يُسجَّل.
 */
export default function OpeningPhaseCard({ branchId, canManage }) {
  const [info, setInfo] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const load = () => storeApi.fetchOpeningPhase(branchId).then(setInfo).catch(() => setError("تعذّر تحميل حالة تكويد الافتتاح"));
  useEffect(() => { load(); }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!info) return error ? <div className="text-xs text-red-400">{error}</div> : null;
  const to = info.open ? "closed" : "open";
  const ok = to === "closed" || reason.trim().length >= 3;
  const send = async () => {
    if (!ok || busy) return;
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await storeApi.setOpeningPhase(branchId, to, reason.trim());
      setMsg(to === "open" ? "أُعيد فتح تكويد الافتتاح في الفرع" : `أُنهي تكويد الافتتاح${r.closedLots ? ` — أُقفلت ${r.closedLots} دفعة` : ""}`);
      setReason(""); load();
    } catch (e) { setError(e?.body?.error === "reason_required" ? "السبب إلزاميٌّ لإعادة الفتح" : "تعذّر التنفيذ"); }
    finally { setBusy(false); }
  };
  const s = info.stats || {};
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2" data-hq-opening>
      <h3 className="text-sm font-semibold flex items-center gap-1.5"><PackageOpen size={15} className="text-amber-500" /> تكويد الافتتاح</h3>
      <p className="text-xs text-neutral-400">
        {info.open ? "مفتوح — الفرع يكوّد «بضاعة افتتاحية (بلا مورد)»" : info.finishedAt ? `مُنهى منذ ${String(info.finishedAt).slice(0, 10)}` : "غير مفتوح"}
        {` · ${s.pieces || 0} قطعة · ${wf.format(s.weight || 0)} جم · ${s.lots || 0} دفعة`}
      </p>
      {(info.byKarat || []).length > 0 && (
        <p className="text-[11px] text-neutral-500">{info.byKarat.map((b) => `ع${b.karat}: ${b.pieces} قطعة · ${wf.format(b.weight)} جم`).join(" · ")}</p>
      )}
      <p className="text-[11px] text-neutral-500">
        {to === "open"
          ? "إعادة الفتح تُتيح في الفرع «بضاعة افتتاحية (بلا مورد)» في التكويد من جديد — للإدارة والمالك وحدهما، وبسببٍ يُسجَّل."
          : "الإنهاء يوقف التكويد بلا مورد في الفرع: كل قطعةٍ بعده من دفعة مورد."}
      </p>
      {canManage && (
        <>
          <input value={reason} onChange={(e) => setReason(e.target.value)} aria-label="سبب تكويد الافتتاح"
            placeholder={to === "open" ? "السبب (إلزامي) — مثل: بضاعة قديمة وُجدت في المخزن" : "السبب (اختياري)"}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" />
          <button type="button" onClick={send} disabled={!ok || busy}
            className="w-full rounded-lg py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950">
            {to === "open" ? "أعد فتح تكويد الافتتاح" : "أنهِ تكويد الافتتاح"}
          </button>
        </>
      )}
      {msg && <div className="text-xs text-emerald-400">{msg}</div>}
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
}
