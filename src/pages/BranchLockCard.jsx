import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { storeApi } from "../core/api.js";

/**
 * قفل الفرع من الإدارة (REMOTE_SESSION/branchLocked في المرجع) — مع السبب.
 *
 * المقفل تُحجب شاشاته كلها بشاشة قفل، والخادم يرفض كل طلباته (423
 * branch_locked) حتى يُفكّ. يسري فورًا بلا انتظار مزامنة، ويُفتح التطبيق
 * من نفسه خلال دقيقة من فكّه.
 */
export default function BranchLockCard({ branchId }) {
  const [state, setState] = useState(null);   // { locked, lock_reason, locked_at, locked_by }
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    storeApi.fetchBranches()
      .then((d) => { if (live) setState((Array.isArray(d) ? d : d.branches || []).find((b) => b.id === branchId) || {}); })
      .catch(() => { if (live) setError("تعذّر تحميل حالة القفل"); });
    return () => { live = false; };
  }, [branchId]);

  const toggle = async () => {
    const next = !state?.locked;
    if (next && !reason.trim()) { setError("اكتب سبب القفل — يظهر للفرع على شاشة القفل"); return; }
    setBusy(true);
    setError("");
    try {
      const r = await storeApi.setBranchLock(branchId, next, reason.trim());
      setState(r.branch || { ...state, locked: next });
      setReason("");
    } catch {
      setError("تعذّر تغيير حالة القفل");
    } finally {
      setBusy(false);
    }
  };

  if (!state) return error ? <div className="text-xs text-red-400">{error}</div> : null;
  const locked = !!state.locked;
  return (
    <div className={`rounded-xl border p-3.5 space-y-2 ${locked ? "border-red-900 bg-red-950/30" : "border-neutral-800 bg-neutral-900"}`}>
      <div className="flex items-center gap-2">
        {locked ? <Lock size={15} className="text-red-400" /> : <Unlock size={15} className="text-amber-500" />}
        <span className="text-sm font-medium">{locked ? "الفرع مقفل" : "قفل الفرع"}</span>
      </div>
      {locked ? (
        <p className="text-xs text-neutral-400">
          السبب: {state.lock_reason || "—"}
          {state.locked_at ? ` · منذ ${new Date(state.locked_at).toLocaleString("en-GB")}` : ""}
          {state.locked_by ? ` · ${state.locked_by}` : ""}
        </p>
      ) : (
        <>
          <p className="text-xs text-neutral-500">
            يحجب كل شاشات الفرع ويرفض الخادم كل طلباته حتى يُفكّ — للمراجعة أو التحقيق أو إيقاف فرعٍ مؤقتًا.
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب القفل (يظهر للفرع)"
            className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-amber-600"
          />
        </>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`w-full rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 ${locked ? "bg-neutral-800 text-neutral-100 hover:bg-neutral-700" : "bg-red-700 text-white hover:bg-red-600"}`}
      >
        {busy ? "…" : locked ? "فكّ القفل" : "اقفل الفرع"}
      </button>
    </div>
  );
}
