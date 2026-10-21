import { useState } from "react";
import { Lock } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const prevMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

/// إقفال الشهر للمجموعة (المرجع HqGroupCloseCard): دفتر الإدارة لا يُقفل شهرًا حتى تُقفله الفروع التي فيها قيوده —
/// والسبب بجانب كل فرع. الخادم يفرض الشرط نفسه.
export function GroupCloseCard({ branches = [], canManage, onDone }) {
  const [ym, setYm] = useState(prevMonth);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const hq = branches.find((b) => b.isHq);
  const rows = branches.filter((b) => !b.isHq).map((b) => {
    const m = b.months.find((x) => x.period === ym);
    return { id: b.branchId, name: b.branchName, ok: !m || m.closed, why: m && !m.closed ? `لم يُقفل — ${m.entries} قيد` : !m ? "لا قيود في الشهر" : "" };
  });
  const hqClosed = !!hq?.months.find((x) => x.period === ym)?.closed || !!hq?.closes.find((c) => c.period === ym);
  const can = !!hq && rows.every((r) => r.ok) && !hqClosed;
  const close = async () => {
    setBusy(true); setMsg("");
    try { await storeApi.closeBranchMonth(hq.branchId, ym); setMsg(`✓ أُقفل ${ym} في دفتر الإدارة`); onDone?.(); }
    catch (e) { setMsg(hqError(e, "تعذّر الإقفال")); } finally { setBusy(false); }
  };
  return (
    <div className={`rounded-xl border p-4 space-y-2 bg-neutral-900 ${can ? "border-emerald-800" : "border-neutral-800"}`} data-group-close={can ? "ok" : "blocked"}>
      <h3 className="font-semibold">إقفال الشهر للمجموعة</h3>
      {!hq && <p className="text-xs text-neutral-400">لا فرع رئيسي للإدارة — الإقفال لكل فرعٍ وحده.</p>}
      <label className="block text-xs text-neutral-400">الشهر
        <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="block mt-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-sm text-neutral-100" />
      </label>
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between text-xs border-t border-neutral-800 pt-1.5">
          <span className="font-semibold">{r.ok ? "✓" : "✗"} {r.name}</span>
          <span className={r.ok ? "text-emerald-400" : "text-red-400"}>{r.ok ? (r.why || `أقفل ${ym}`) : r.why}</span>
        </div>
      ))}
      {msg && <div className="text-xs text-amber-300">{msg}</div>}
      {canManage && hq && (
        <button disabled={!can || busy} onClick={close} data-group-close-go
          className={`w-full text-sm px-4 py-2 rounded-lg font-semibold ${can ? "bg-amber-600 text-neutral-950 hover:bg-amber-500" : "bg-neutral-800 text-neutral-500"}`}>
          {hqClosed ? `${ym} مقفل في دفتر الإدارة` : can ? `أقفل ${ym} في دفتر الإدارة` : `لا يُقفل ${ym} حتى تُقفل الفروع`}
        </button>
      )}
    </div>
  );
}

/// قفل الفترات لكل الفروع (المرجع HqPeriodLockSender): «نهائي» لا يُسجَّل شيءٌ بتاريخه أو قبله، «جزئي» ما قبله لا يعدّله
/// إلا المدير. قفل الإدارة يقف بجانب قفل الفرع والنافذ أبعدهما — فالفرع لا يفكّه وحده. التفريغ يرفع قفل الإدارة.
export function PeriodLockSender({ branches = [], canManage, onDone }) {
  const cur = branches[0] || {};
  const [all, setAll] = useState(cur.hqLockAll || "");
  const [posted, setPosted] = useState(cur.hqLockPosted || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (!canManage) return null;
  const send = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await storeApi.sendPeriodLocks({ lockAll: all || null, lockPosted: posted || null });
      setMsg(`✓ أُرسل قفل الفترات لـ${r.branches.length} فرع${!all && !posted ? " — ورُفع قفل الإدارة" : ""}`); onDone?.();
    } catch (e) { setMsg(hqError(e, "تعذّر الإرسال")); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2" data-hq-period-lock>
      <h3 className="font-semibold flex items-center gap-2"><Lock size={16} className="text-amber-500" /> قفل الفترات لكل الفروع</h3>
      <p className="text-xs text-neutral-400 leading-6">«نهائي»: لا يُسجَّل شيءٌ بتاريخه أو قبله. «جزئي»: ما قبله لا يُعدَّل إلا بالمدير. الفرع لا يفكّه وحده — وتفريغ التاريخين يرفع قفل الإدارة.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-neutral-400">نهائي حتى
          <input type="date" value={all} onChange={(e) => setAll(e.target.value)} className="block w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-sm text-neutral-100" /></label>
        <label className="text-xs text-neutral-400">جزئي حتى
          <input type="date" value={posted} onChange={(e) => setPosted(e.target.value)} className="block w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-sm text-neutral-100" /></label>
      </div>
      <button disabled={busy || !branches.length} onClick={send} data-period-lock-send
        className="w-full text-sm px-4 py-2 rounded-lg font-semibold bg-amber-600 text-neutral-950 hover:bg-amber-500 disabled:opacity-50">
        {busy ? "يُرسل…" : `أرسل القفل لـ${branches.length} فرع`}
      </button>
      {msg && <div className="text-xs text-amber-300">{msg}</div>}
    </div>
  );
}
