import { useEffect, useState } from "react";
import { Barcode, Plus, Trash2 } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const wf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const MODELS = [["both", "الفرع والإدارة"], ["branch", "الفرع يكوّد"], ["hq", "الإدارة تكوّد"]];

/**
 * التكويد في الإدارة: دفعاتٌ أرسلتها الفروع لتكوّدها الإدارة — تبقى ملك الفرع (وزنها في مخزونه) حتى تعود قطعًا
 * تظهر في مخزونه مباشرةً. بمعالج تكويد الفرع نفسه (الأجرة المتبقية للدفعة تُوزَّع بالوزن). ونموذج كل فرع: من يكوّد.
 */
export default function CodingQueueCard({ canCode = false, canManage = false }) {
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(null);
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => storeApi.fetchCodingQueue().then(setD).catch(() => setD({ branches: [] }));
  useEffect(() => { load(); }, []);
  if (!d) return null;
  const waiting = d.branches.reduce((a, b) => a + b.lots.length, 0);
  const set = (i, k, v) => setRows((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const code = async (b, l) => {
    setBusy(true); setMsg(null);
    try {
      const out = await storeApi.codeLot(b.id, l.id, rows.map((x) => ({ categoryId: x.categoryId, weight: Number(x.weight), quantity: Math.max(1, Number(x.qty) || 1) })));
      setMsg({ text: `كُوِّدت ${out.items.reduce((a, it) => a + it.units.length, 0)} قطعة من ${l.ref} لفرع ${b.name}` });
      setOpen(null); load();
    } catch (e) {
      setMsg({ bad: true, text: hqError(e, "تعذّر التكويد") });
    } finally { setBusy(false); }
  };
  const setModel = async (b, model) => {
    setMsg(null);
    try { await storeApi.setCodingModel(b.id, model); load(); } catch (e) { setMsg({ bad: true, text: hqError(e, "تعذّر حفظ النموذج") }); }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Barcode size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold flex-1">التكويد في الإدارة{waiting ? ` (${waiting} دفعة)` : ""}</h3>
      </div>
      <p className="text-xs text-neutral-400">دفعاتٌ أرسلها الفرع لتكوّدها — تبقى ملكه حتى تعود قطعًا في مخزونه مباشرةً، ولا قيد عند الإرسال.</p>
      {msg && <div className={`text-xs ${msg.bad ? "text-red-400" : "text-emerald-400"}`}>{msg.text}</div>}
      {d.branches.map((b) => (
        <div key={b.id} className="border-t border-neutral-800 pt-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{b.name}</span>
            {canManage ? (
              <select value={b.model} onChange={(e) => setModel(b, e.target.value)} aria-label={`نموذج التكويد — ${b.name}`}
                className="rounded-lg px-2 py-1 bg-neutral-950 border border-neutral-700 text-xs">
                {MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            ) : (
              <span className="text-xs text-neutral-500">{MODELS.find((m) => m[0] === b.model)?.[1]}</span>
            )}
          </div>
          {b.lots.length === 0 && <p className="text-xs text-neutral-600">لا دفعات عند الإدارة.</p>}
          {b.lots.map((l) => {
            const sum = rows.reduce((a, x) => a + (Number(x.weight) || 0) * Math.max(1, Number(x.qty) || 1), 0);
            const over = sum - l.remaining > 0.0005;
            const valid = rows.length > 0 && rows.every((x) => x.categoryId && Number(x.weight) > 0) && !over && !busy;
            return (
              <div key={l.id} className="rounded-lg bg-neutral-950/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm">{l.ref} · عيار {l.karat}</div>
                    <div className="text-xs text-neutral-500">
                      باقٍ {wf.format(l.remaining)} من {wf.format(l.weight)} جم · {l.ageDays} يوم عند الإدارة
                    </div>
                  </div>
                  {canCode && open !== l.id && (
                    <button type="button" onClick={() => { setOpen(l.id); setMsg(null); setRows([{ categoryId: "", weight: "", qty: "1" }]); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950">كوّد</button>
                  )}
                </div>
                {open === l.id && (
                  <div className="mt-2 space-y-2">
                    {rows.map((x, i) => (
                      <div key={i} className="flex gap-2">
                        <select value={x.categoryId} onChange={(e) => set(i, "categoryId", e.target.value)}
                          className="flex-1 rounded-lg px-2 py-1.5 bg-neutral-950 border border-neutral-700 text-sm">
                          <option value="">التصنيف…</option>
                          {b.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input value={x.weight} onChange={(e) => set(i, "weight", e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" dir="ltr" placeholder="جم/قطعة"
                          className="w-24 rounded-lg px-2 py-1.5 bg-neutral-950 border border-neutral-700 text-sm" />
                        <input value={x.qty} onChange={(e) => set(i, "qty", e.target.value.replace(/\D/g, ""))} inputMode="numeric" dir="ltr" placeholder="عدد"
                          className="w-14 rounded-lg px-2 py-1.5 bg-neutral-950 border border-neutral-700 text-sm" />
                        <button type="button" onClick={() => setRows((p) => p.filter((_, j) => j !== i))} disabled={rows.length === 1} aria-label="احذف"
                          className="px-2 rounded-lg border border-neutral-700 disabled:opacity-40"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setRows((p) => [...p, { categoryId: "", weight: "", qty: "1" }])}
                      className="w-full text-xs py-1.5 rounded-lg border border-dashed border-neutral-700 flex items-center justify-center gap-1"><Plus size={12} /> صنف</button>
                    <p className={`text-xs ${over ? "text-red-400" : "text-neutral-400"}`}>
                      {over ? `أكثر من الباقي في الدفعة (${wf.format(l.remaining)} جم)` : `يُكوَّد ${wf.format(sum)} جم — يبقى ${wf.format(Math.max(0, l.remaining - sum))} جم`}
                    </p>
                    <div className="flex gap-2">
                      <button type="button" disabled={!valid} onClick={() => code(b, l)}
                        className="flex-1 text-sm font-bold py-2 rounded-lg bg-amber-500 text-neutral-950 disabled:opacity-40">كوّد للفرع</button>
                      <button type="button" onClick={() => setOpen(null)} className="px-3 text-sm rounded-lg border border-neutral-700">إلغاء</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
