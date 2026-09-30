import { useEffect, useState } from "react";
import { Gem, Plus, Trash2 } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const w3 = (x) => Math.round((Number(x) || 0) * 1000);
const wf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/**
 * بقايا أطقم الفرع — تكويدها من الإدارة (المرجع 5.2.0: «تكويد بقايا طقم» · قرار المالك 2026-09-29).
 * ما بقي من طقمٍ بِيع جزءٌ منه، مملوكٌ بوزنه في الفرع. يُكوَّد قطعًا مجموع أوزانها وزنه بالضبط
 * — بالمعالج نفسه الذي في الفرع، والرموز الجديدة تظهر للفرع فورًا.
 */
export default function BranchRemnantsCard({ branchId, canCode }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => storeApi.fetchRemnants(branchId).then(setData).catch(() => setData({ remnants: [], categories: [] }));
  useEffect(() => { load(); }, [branchId]);
  if (!data || !data.remnants.length) return null;

  const start = (r) => {
    setOpen(r.id); setMsg(null);
    setRows(r.setParts?.length ? r.setParts.map((p) => ({ categoryId: "", weight: p.weight ? String(p.weight) : "", hint: p.label })) : [{ categoryId: "", weight: String(r.weight), hint: "" }]);
  };
  const set = (i, k, v) => setRows((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const code = async (r) => {
    setBusy(true); setMsg(null);
    try {
      const out = await storeApi.codeRemnant(branchId, r.id, rows.map((x) => ({ categoryId: x.categoryId, weight: Number(x.weight) })));
      setMsg({ text: `كُوِّدت بقايا ${r.code || r.ref}: ${out.items.map((x) => x.code).join(" · ")}` });
      setOpen(null); load();
    } catch (e) {
      setMsg({ bad: true, text: hqError(e, "تعذّر تكويد البقايا") });
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gem size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold flex-1">بقايا أطقم للتكويد ({data.remnants.length})</h3>
      </div>
      <p className="text-xs text-neutral-400">ما بقي من طقمٍ بِيع جزءٌ منه — مملوكٌ بوزنه، ولا يُباع حتى يُكوَّد قطعًا مجموع أوزانها وزنه.</p>
      {msg && <div className={`text-xs ${msg.bad ? "text-red-400" : "text-emerald-400"}`}>{msg.text}</div>}
      {data.remnants.map((r) => {
        const sum = rows.reduce((a, x) => a + w3(x.weight), 0);
        const diff = w3(r.weight) - sum;
        const valid = rows.length > 0 && rows.every((x) => x.categoryId && w3(x.weight) > 0) && diff === 0 && !busy;
        return (
          <div key={r.id} className="border-t border-neutral-800 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{r.code || r.ref}</div>
                <div className="text-xs text-neutral-500">عيار {r.karat} · {wf.format(r.weight)} جم{r.setParts?.length ? ` · ${r.setParts.map((p) => p.label).join(" · ")}` : ""}</div>
              </div>
              {canCode && open !== r.id && (
                <button type="button" onClick={() => start(r)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950">كوّد</button>
              )}
            </div>
            {open === r.id && (
              <div className="mt-2 space-y-2">
                {rows.map((x, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={x.categoryId} onChange={(e) => set(i, "categoryId", e.target.value)}
                      className="flex-1 rounded-lg px-2 py-1.5 bg-neutral-950 border border-neutral-700 text-sm">
                      <option value="">{x.hint ? `${x.hint} — التصنيف…` : "التصنيف…"}</option>
                      {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input value={x.weight} onChange={(e) => set(i, "weight", e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" dir="ltr" placeholder="جم"
                      className="w-24 rounded-lg px-2 py-1.5 bg-neutral-950 border border-neutral-700 text-sm" />
                    <button type="button" onClick={() => setRows((p) => p.filter((_, j) => j !== i))} disabled={rows.length === 1} aria-label="احذف"
                      className="px-2 rounded-lg border border-neutral-700 disabled:opacity-40"><Trash2 size={14} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setRows((p) => [...p, { categoryId: "", weight: diff > 0 ? String(diff / 1000) : "", hint: "" }])}
                  className="w-full text-xs py-1.5 rounded-lg border border-dashed border-neutral-700 flex items-center justify-center gap-1"><Plus size={12} /> قطعة</button>
                <p className={`text-xs ${diff === 0 ? "text-emerald-400" : "text-red-400"}`}>
                  المجموع {wf.format(sum / 1000)} من {wf.format(r.weight)} جم{diff !== 0 ? ` — ${diff > 0 ? "ينقص" : "يزيد"} ${wf.format(Math.abs(diff) / 1000)} جم` : " ✓"}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOpen(null)} className="flex-1 text-xs py-2 rounded-lg border border-neutral-700">إلغاء</button>
                  <button type="button" onClick={() => code(r)} disabled={!valid} className="flex-1 text-xs font-bold py-2 rounded-lg bg-amber-500 text-neutral-950 disabled:opacity-40">كوّد القطع</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
