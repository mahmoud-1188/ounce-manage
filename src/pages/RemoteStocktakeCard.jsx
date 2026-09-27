import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const ST = { pending: ["بانتظار الفرع", "text-amber-300"], applied: ["طُبّق", "text-emerald-400"], rejected: ["رُفض", "text-red-400"] };
const wf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

/**
 * جردٌ من الإدارة (المرجع HqRemoteStocktake · migration 061): مسؤول المخازن يعدّ رفّ الفرع من هنا،
 * والعدّ يصل الفرع طلبًا — مديره يطبّقه بمعالج الجرد نفسه (العجز والزيادة بقيدهما) أو يرفضه.
 * الوزن من بطاقة الصنف — العدّ هو ما يُدخل، وما لم يُكتب عدده لا يدخل الجرد.
 */
export default function RemoteStocktakeCard({ branchId }) {
  const [items, setItems] = useState(null);
  const [counts, setCounts] = useState({});
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const loadList = () => storeApi.fetchRemoteStocktakes(branchId).then((d) => setList(d.stocktakes || [])).catch(() => {});
  useEffect(() => { loadList(); }, [branchId]);
  const start = () => { setOpen(true); if (!items) storeApi.fetchStocktakeSheet(branchId).then((d) => setItems(d.items || [])).catch((e) => setMsg({ bad: true, text: hqError(e, "تعذّر تحميل الأصناف") })); };
  const shown = useMemo(() => (items || []).filter((i) => !q || `${i.ref} ${i.category}`.includes(q.trim())), [items, q]);
  const entered = Object.entries(counts).filter(([, v]) => v !== "" && v != null);
  const diffs = entered.filter(([id, v]) => Number(v) !== (items || []).find((i) => i.id === id)?.expected).length;
  const send = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await storeApi.sendRemoteStocktake(branchId, entered.map(([itemId, v]) => ({ itemId, countedQty: Number(v) })), note);
      setMsg({ text: `أُرسل ${r.stocktake.ref} للفرع — ينتظر تطبيق المدير` }); setCounts({}); setNote(""); setOpen(false); loadList();
    } catch (e) { setMsg({ bad: true, text: hqError(e, "تعذّر الإرسال") }); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold flex-1">جردٌ من الإدارة</h3>
        {!open && <button type="button" onClick={start} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950">ابدأ جردًا</button>}
      </div>
      {msg && <div className={`text-xs ${msg.bad ? "text-red-400" : "text-emerald-400"}`}>{msg.text}</div>}
      {open && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-400">اكتب عدد القطع الموجودة فعلًا لكل صنفٍ تعدّه. المتوقَّع من دفاتر الفرع.</p>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالرمز أو التصنيف" className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm" />
          {!items ? <div className="text-xs text-neutral-500">جارِ التحميل…</div> : (
            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800 rounded-lg border border-neutral-800">
              {shown.slice(0, 200).map((i) => {
                const v = counts[i.id] ?? "";
                const off = v !== "" && Number(v) !== i.expected;
                return (
                  <div key={i.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono truncate">{i.ref}</div>
                      <div className="text-neutral-500 truncate">{i.category} · عيار {i.karat} · {wf.format(i.weight)} جم</div>
                    </div>
                    <span className="text-neutral-400 w-16 text-center">متوقَّع {i.expected}</span>
                    <input inputMode="numeric" value={v} onChange={(e) => setCounts((c) => ({ ...c, [i.id]: e.target.value.replace(/\D/g, "") }))}
                      className={`w-16 rounded-md bg-neutral-950 border px-2 py-1 text-center ${off ? "border-amber-500 text-amber-300" : "border-neutral-700"}`} placeholder="العدد" />
                  </div>
                );
              })}
            </div>
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 flex-1">عُدّ {entered.length} صنف · {diffs} بفرق</span>
            <button type="button" onClick={() => setOpen(false)} className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700">إلغاء</button>
            <button type="button" disabled={busy || !entered.length} onClick={send} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 disabled:opacity-50">{busy ? "يُرسل…" : "أرسل للفرع"}</button>
          </div>
        </div>
      )}
      {list.length > 0 && (
        <div className="space-y-1.5">
          {list.slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs rounded-lg bg-neutral-950/60 border border-neutral-800 px-3 py-2">
              <span className="font-mono">{r.ref}</span>
              <span className="text-neutral-400 flex-1 truncate">{r.counts.length} صنف · {r.requestedBy} · {new Date(r.requestedAt).toLocaleDateString("en-GB")}</span>
              {r.status === "applied" && r.result && <span className="text-neutral-400">عجز {wf.format(r.result.missingValue || 0)} · زيادة {wf.format(r.result.surplusValue || 0)}</span>}
              <span className={ST[r.status][1]}>{ST[r.status][0]}{r.decidedBy ? ` — ${r.decidedBy}` : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
