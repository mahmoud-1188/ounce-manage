import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmt = (n) => money.format(Number(n) || 0);

/** أهداف المبيعات — هدف ٣٠ يومًا لكل فرع، والمتحقّق منه ونسبته. */
export default function TargetsCard({ canManage }) {
  const [rows, setRows] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState(null);

  const load = () => storeApi.fetchTargets().then((d) => setRows(d.branches || [])).catch(() => setError("تعذّر تحميل الأهداف"));
  useEffect(() => { load(); }, []);

  const save = async (b) => {
    const v = Number(draft[b.id]);
    if (!Number.isFinite(v) || v < 0) return;
    setError("");
    try {
      await storeApi.setBranchTarget(b.id, v);
      setDraft((d) => { const n = { ...d }; delete n[b.id]; return n; });
      setSavedId(b.id); setTimeout(() => setSavedId(null), 2000);
      load();
    } catch (e) { setError(hqError(e, "تعذّر حفظ الهدف")); }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold">أهداف المبيعات (٣٠ يومًا)</h3>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
      {rows === null ? <div className="text-xs text-neutral-500">جارِ التحميل…</div> : (
        <div className="space-y-2.5">
          {rows.map((b) => {
            const pct = b.pct;
            const bar = pct == null ? 0 : Math.min(100, pct);
            const color = pct == null ? "bg-neutral-700" : pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";
            return (
              <div key={b.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate font-medium">{b.name}</span>
                  <span className="tabular-nums text-neutral-400">{fmt(b.sales30)} / {b.target30 > 0 ? fmt(b.target30) : "بلا هدف"}</span>
                  <span className={`w-12 text-end tabular-nums ${pct >= 100 ? "text-emerald-400" : "text-neutral-300"}`}>{pct == null ? "—" : `${pct}٪`}</span>
                </div>
                <div className="h-1.5 rounded bg-neutral-800 overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${bar}%` }} /></div>
                {canManage && (
                  <div className="flex gap-2">
                    <input inputMode="decimal" value={draft[b.id] ?? ""} placeholder={b.target30 > 0 ? `الهدف الحالي ${fmt(b.target30)}` : "حدّد هدفًا"}
                      onChange={(e) => setDraft({ ...draft, [b.id]: e.target.value.replace(/[^\d.]/g, "") })}
                      className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" />
                    <button type="button" onClick={() => save(b)} disabled={draft[b.id] == null || draft[b.id] === ""}
                      className="rounded-lg px-3 text-xs bg-neutral-800 border border-neutral-700 disabled:opacity-40">{savedId === b.id ? "✓" : "حفظ"}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
