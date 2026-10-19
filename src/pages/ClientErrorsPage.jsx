import { useEffect, useState } from "react";
import { Bug } from "lucide-react";
import { storeApi } from "../core/api.js";

const when = (v) => (v ? new Date(v).toLocaleString("en-GB") : "—");

/**
 * أعطال الفروع: ما أبلغ عنه تطبيق الفرع تلقائيًّا — رسالته وفرعه وعدد مرّاته وآخر ظهور، ومكدّسه للمطوّر.
 * «عولج» يطويه، ويعود مفتوحًا وحده إن ظهر العطل نفسه بعد ذلك.
 */
export default function ClientErrorsPage() {
  const [all, setAll] = useState(false);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const load = () => storeApi.fetchClientErrors(all).then((d) => { setData(d.errors || []); setError(""); }).catch(() => setError("تعذّر جلب الأعطال"));
  useEffect(() => { load(); }, [all]); // eslint-disable-line react-hooks/exhaustive-deps
  const resolve = async (id) => { try { await storeApi.resolveClientError(id); load(); } catch { setError("تعذّر الحفظ"); } };
  const openCount = (data || []).filter((e) => !e.resolvedAt).length;
  return (
    <div className="space-y-4" data-client-errors>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bug size={20} className="text-amber-500" />
          <h2 className="text-lg font-semibold">أعطال الفروع{openCount ? ` (${openCount})` : ""}</h2>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> اعرض ما عولج أيضًا
        </label>
      </div>
      <p className="text-xs text-neutral-500">يصل البلاغ وحده من تطبيق الفرع حين يقع عطلٌ غير متوقّع — العطل نفسه يُعدّ ولا يتكرّر سطرًا.</p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {data && data.length === 0 && <p className="text-sm text-neutral-500">لا أعطال مفتوحة.</p>}
      <div className="space-y-2">
        {(data || []).map((e) => (
          <div key={e.id} data-client-error={e.id} className={`rounded-xl border bg-neutral-900/60 ${e.resolvedAt ? "border-neutral-800 opacity-60" : "border-amber-700/40"}`}>
            <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} className="w-full text-start px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{e.branchName} <span className="text-xs text-neutral-500">{e.branchRef}</span></span>
                <span className="text-xs text-neutral-400">×{e.count} · آخر ظهور {when(e.lastSeen)}</span>
              </div>
              <div className="text-xs text-red-300 mt-1 break-all" dir="ltr">{e.message}</div>
            </button>
            {open === e.id && (
              <div className="px-4 pb-3 space-y-2 text-xs">
                <div className="text-neutral-400">أوّل ظهور {when(e.firstSeen)} · الصفحة <span dir="ltr">{e.url || "—"}</span> · الإصدار {e.version || "—"}{e.lastUser ? ` · آخر مستخدم ${e.lastUser}` : ""}</div>
                {e.stack && <pre dir="ltr" className="whitespace-pre-wrap break-all text-[10px] text-neutral-500 bg-neutral-950 rounded-lg p-2 max-h-48 overflow-auto">{e.stack}</pre>}
                {e.resolvedAt ? <div className="text-emerald-400">عولج {when(e.resolvedAt)}{e.resolvedNote ? ` — ${e.resolvedNote}` : ""}</div> : (
                  <button type="button" onClick={() => resolve(e.id)} data-resolve-error className="px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-bold">عولج</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
