import { useEffect, useState } from "react";
import { CalendarCheck, Lock } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/**
 * السنة المالية للفروع (المرجع HqFiscalTab · migration 061): لكل فرع الأشهر الماضية التي فيها قيود،
 * المقفل منها (بلقطته: الإيراد والمصروف والصافي) والمفتوح، وقفل الفترات — وإقفال شهرٍ من الإدارة.
 * ⚠ الإقفال لقطةٌ ثابتة لأرقام الشهر باسم من أقفل؛ القيود تُؤرَّخ بلحظة ترحيلها فلا يدخل الشهرَ المقفل قيدٌ جديد.
 */
export default function FiscalPage({ canManage }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(null);
  const load = () => storeApi.fetchFiscal().then((d) => setData(d.branches || [])).catch(() => setError("تعذّر تحميل السنة المالية"));
  useEffect(() => { load(); }, []);
  const close = async (b, period) => {
    setBusy(`${b.branchId}:${period}`); setError("");
    try { await storeApi.closeBranchMonth(b.branchId, period); load(); }
    catch (e) { setError(hqError(e, "تعذّر الإقفال")); } finally { setBusy(""); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck size={20} className="text-amber-500" />
        <h2 className="text-lg font-semibold">السنة المالية للفروع</h2>
      </div>
      <p className="text-xs text-neutral-400">إقفال الشهر يحفظ أرقامه كما هي يوم الإقفال (لكل حساب) باسم من أقفل — ويراه الفرع. لا يُقفل الشهر الجاري.</p>
      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
      {!data ? <div className="text-neutral-400 text-sm">جارِ التحميل…</div> : data.map((b) => {
        const openMonths = b.months.filter((m) => !m.closed);
        const last = b.closes[b.closes.length - 1];
        return (
          <div key={b.branchId} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold flex-1">{b.branchName} <span className="text-xs text-neutral-500 font-mono">{b.branchRef}</span></span>
              <span className="text-xs text-neutral-400">{last ? `آخر إقفال ${last.period} — ${last.closedBy}` : "لم يُقفل شهرٌ بعد"}</span>
            </div>
            <div className="text-xs text-neutral-400">
              أشهرٌ مقفلة {b.closes.length} · مفتوحة من الماضي <b className={openMonths.length ? "text-amber-300" : "text-emerald-400"}>{openMonths.length}</b>
              {(b.lockAll || b.lockPosted) && <span className="inline-flex items-center gap-1 ms-2"><Lock size={12} /> قفل الفترات حتى {b.lockAll || b.lockPosted}{b.lockAll ? " (نهائي)" : " (عدا المدير)"}</span>}
            </div>
            {b.months.length === 0 && <div className="text-xs text-neutral-500">لا قيود في أشهرٍ ماضية.</div>}
            <div className="flex flex-wrap gap-1.5">
              {b.months.map((m) => {
                const c = b.closes.find((x) => x.period === m.period);
                const on = open === `${b.branchId}:${m.period}`;
                return (
                  <button key={m.period} type="button" onClick={() => setOpen(on ? null : `${b.branchId}:${m.period}`)}
                    className={`px-2.5 py-1 rounded-full text-xs border ${m.closed ? "border-emerald-700 bg-emerald-950/40 text-emerald-300" : "border-amber-700/60 bg-amber-950/30 text-amber-200"} ${on ? "ring-1 ring-amber-400" : ""}`}>
                    {m.period} {m.closed ? "✓" : ""}{c ? "" : ` · ${m.entries} قيد`}
                  </button>
                );
              })}
            </div>
            {b.months.map((m) => {
              if (open !== `${b.branchId}:${m.period}`) return null;
              const c = b.closes.find((x) => x.period === m.period);
              return (
                <div key={m.period} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-xs space-y-1">
                  {c ? (
                    <>
                      <div>أُقفل {new Date(c.closedAt).toLocaleDateString("en-GB")} — {c.closedBy} · {c.snapshot.entries} قيد</div>
                      <div className="grid grid-cols-3 gap-2 tabular-nums">
                        <div><div className="text-neutral-500">الإيراد</div>{nf.format(c.snapshot.revenue || 0)}</div>
                        <div><div className="text-neutral-500">المصروف والتكلفة</div>{nf.format(c.snapshot.expenses || 0)}</div>
                        <div><div className="text-neutral-500">الصافي</div><b className={(c.snapshot.netIncome || 0) >= 0 ? "text-emerald-400" : "text-red-400"}>{nf.format(c.snapshot.netIncome || 0)}</b></div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex-1">{m.entries} قيد في {m.period} — لم يُقفل.</span>
                      {canManage && (
                        <button type="button" disabled={!!busy} onClick={() => close(b, m.period)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-bold disabled:opacity-50">{busy === `${b.branchId}:${m.period}` ? "يُقفل…" : `أقفل ${m.period}`}</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
