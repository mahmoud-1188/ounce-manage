import { useState } from "react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/**
 * إقفال السنة المالية لفرعٍ من الإدارة (المرجع HqFiscalTab): دخل الفترة منذ آخر إقفال وتحذيراتها،
 * ثم «أقفل السنة» بتأكيدٍ ثانٍ — قيدٌ ينقل حسابات الدخل إلى 3300 باسم الإدارة، ويُقفل كل ما قبله.
 * ⚠ دفتر الإدارة لا تُقفل سنته قبل الفروع؛ الخادم يرفض ويذكر الفروع المفتوحة.
 */
export default function YearCloseCard({ branch, canManage }) {
  const [info, setInfo] = useState(null);
  const [shown, setShown] = useState(false);
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const load = () => storeApi.fetchBranchFiscalYear(branch.branchId).then(setInfo).catch(() => setError("تعذّر تحميل السنة المالية"));
  const toggle = () => { if (!shown && !info) load(); setShown(!shown); setConfirm(false); };
  const close = async () => {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await storeApi.closeBranchYear(branch.branchId, notes.trim());
      setMsg(`أُقفلت السنة ${r.closure?.ref || ""} — صافيها ${nf.format(r.closure?.ledgerNetIncome || 0)}`);
      setNotes(""); setConfirm(false); load();
    } catch (e) {
      const b = e?.body || {};
      setError(b.error === "branches_year_not_closed" ? `أقفل سنة الفروع أوّلًا: ${(b.branches || []).join("، ")}`
        : b.error === "nothing_to_close" ? "لا دخل منذ آخر إقفال — لا شيء يُقفل" : hqError(e, "تعذّر إقفال السنة"));
    } finally { setBusy(false); }
  };
  const last = info?.closures?.[0];
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-xs space-y-2" data-hq-year-close>
      <button type="button" onClick={toggle} className="w-full text-start font-semibold text-neutral-200">
        السنة المالية {shown ? "▴" : "▾"}
        {last && <span className="text-neutral-500 font-normal"> · آخر إقفال {last.ref} في {String(last.closedAt).slice(0, 10)}</span>}
      </button>
      {shown && (!info ? <div className="text-neutral-500">{error || "جارِ التحميل…"}</div> : (
        <>
          <div className="text-neutral-400">{info.since ? `منذ آخر إقفال ${String(info.since).slice(0, 10)}` : "لم تُقفل سنةٌ بعد — منذ البداية"}</div>
          <div className="grid grid-cols-3 gap-2 tabular-nums">
            <div><div className="text-neutral-500">الإيراد</div>{nf.format(info.revenue || 0)}</div>
            <div><div className="text-neutral-500">المصروف والتكلفة</div>{nf.format(info.expenses || 0)}</div>
            <div><div className="text-neutral-500">الصافي</div><b className={(info.netIncome || 0) >= 0 ? "text-emerald-400" : "text-red-400"}>{nf.format(info.netIncome || 0)}</b></div>
          </div>
          {(info.warnings || []).map((w) => <div key={w} className="text-amber-300">⚠ {w}</div>)}
          {(info.closures || []).length > 0 && (
            <div className="text-neutral-500">{info.closures.map((c) => `${c.ref} (${String(c.closedAt).slice(0, 10)}): ${nf.format(c.ledgerNetIncome)}`).join(" · ")}</div>
          )}
          {canManage && (
            <>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظة الإقفال (اختياري)" aria-label="ملاحظة إقفال السنة"
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5" />
              {!confirm ? (
                <button type="button" onClick={() => setConfirm(true)} disabled={busy}
                  className="w-full rounded-lg py-1.5 font-bold bg-neutral-800 border border-amber-700 text-amber-300">أقفل السنة المالية لـ {branch.branchName}</button>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-amber-200">يُقفل كل ما قبل لحظة الإقفال نهائيًّا، وتبدأ حسابات الدخل صفرًا. متابعة؟</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirm(false)} className="rounded-lg py-1.5 bg-neutral-800 border border-neutral-700">إلغاء</button>
                    <button type="button" onClick={close} disabled={busy} className="rounded-lg py-1.5 font-bold bg-amber-500 text-neutral-950 disabled:opacity-50">{busy ? "يُقفل…" : "تأكيد الإقفال"}</button>
                  </div>
                </div>
              )}
            </>
          )}
          {msg && <div className="text-emerald-400">{msg}</div>}
          {error && <div className="text-red-400">{error}</div>}
        </>
      ))}
    </div>
  );
}
