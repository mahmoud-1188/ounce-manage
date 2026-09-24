import { useCallback, useEffect, useState } from "react";
import { Calculator, ChevronDown, ChevronUp, Plus, Trash2, Undo2 } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => money.format(Number(n) || 0);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const SEV = { block: "text-red-400", warn: "text-amber-300", info: "text-neutral-400" };
const VERDICT = { approved: "معتمد", needs_change: "يحتاج تعديل", note: "ملاحظة" };
const TABS = [["review", "المراجعة"], ["journal", "القيود"], ["adjust", "قيد تسوية"], ["fees", "عمولة البنك"]];

/**
 * حسابات الفرع عن بعد — ما يفعله المحاسب في الفرع، تفعله الإدارة من هنا:
 * أحكام المراجعة على بنود الطابور (تظهر في الفرع «من الإدارة») · عكس قيدٍ
 * بسبب · قيد تسوية بأسطر مدين/دائن · تسوية عمولة البنك لشهر.
 * كل ذلك يمرّ بقفل الفترات في الفرع كأي قيد.
 */
export default function BranchAccountsCard({ branchId, canManage }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("review");
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2">
        <Calculator size={15} className="text-amber-500" />
        <span className="text-sm font-medium flex-1 text-start">حسابات الفرع</span>
        <span className="text-[11px] text-neutral-500">مراجعة · قيود · تسوية</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <>
          <div className="flex gap-1 bg-neutral-800/60 rounded-lg p-1">
            {TABS.map(([id, l]) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className={`flex-1 px-2 py-1 rounded-md text-xs ${tab === id ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"}`}>{l}</button>
            ))}
          </div>
          {tab === "review" && <ReviewTab branchId={branchId} canManage={canManage} />}
          {tab === "journal" && <JournalTab branchId={branchId} canManage={canManage} />}
          {tab === "adjust" && <AdjustTab branchId={branchId} canManage={canManage} />}
          {tab === "fees" && <FeesTab branchId={branchId} canManage={canManage} />}
        </>
      )}
    </div>
  );
}

function Msg({ error, msg }) {
  return (
    <>
      {error && <div className="text-xs text-red-400">{error}</div>}
      {msg && <div className="text-xs text-emerald-400">{msg}</div>}
    </>
  );
}

function ReviewTab({ branchId, canManage }) {
  const [queue, setQueue] = useState(null);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    storeApi.fetchBranchReviewQueue(branchId).then((d) => setQueue(d.queue || [])).catch(() => setError("تعذّر تحميل طابور المراجعة"));
  }, [branchId]);
  useEffect(load, [load]);

  const verdict = async (it, v) => {
    const note = (notes[it.key] || "").trim();
    if (v !== "approved" && !note) { setError("اكتب ملاحظةً لغير «معتمد»"); return; }
    setBusy(true); setError(""); setMsg("");
    try {
      await storeApi.postBranchReview(branchId, {
        key: it.key, kind: it.kind, targetId: it.id, targetRef: it.ref, targetDate: it.date, label: it.label,
        why: it.why, amount: it.amount || 0, verdict: v, note, fingerprint: it.fingerprint,
      });
      setMsg(`سُجّل «${VERDICT[v]}» على ${it.ref} — يظهر في الفرع من الإدارة`);
      setNotes((n) => ({ ...n, [it.key]: "" }));
      load();
    } catch (e) { setError(hqError(e, "تعذّر تسجيل الحكم")); } finally { setBusy(false); }
  };

  if (queue === null) return <div className="text-xs text-neutral-500">جارِ التحميل…</div>;
  return (
    <div className="space-y-2">
      <Msg error={error} msg={msg} />
      {queue.length === 0 ? <div className="text-xs text-emerald-400">✓ لا بنود تحتاج مراجعة.</div> : queue.map((it) => (
        <div key={it.key} className="rounded-lg border border-neutral-800 p-2.5 space-y-1.5">
          <div className="flex items-start gap-2 text-xs">
            <span className={`font-medium ${SEV[it.severity] || ""}`}>{it.label}</span>
            <span className="text-neutral-500">{it.ref}</span>
            <span className="flex-1" />
            {it.amount > 0 && <span className="tabular-nums">{fmt(it.amount)}</span>}
          </div>
          <div className="text-[11px] text-neutral-400">{it.why}</div>
          {it.lastReview && (
            <div className="text-[11px] text-neutral-500">
              آخر حكم: {VERDICT[it.lastReview.verdict] || it.lastReview.verdict} — {it.lastReview.reviewer}{it.lastReview.byHq ? " (الإدارة)" : ""}
              {it.lastReview.note ? ` · ${it.lastReview.note}` : ""}{it.changedSinceReview ? " · ⚠ تغيّر بعد الاعتماد" : ""}
            </div>
          )}
          {canManage && (
            <div className="flex gap-1.5">
              <input value={notes[it.key] || ""} onChange={(e) => setNotes({ ...notes, [it.key]: e.target.value })} placeholder="ملاحظة"
                className="flex-1 min-w-0 rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1 text-[11px]" />
              <button type="button" disabled={busy} onClick={() => verdict(it, "approved")} className="rounded-md px-2 text-[11px] bg-emerald-700 text-white disabled:opacity-50">معتمد</button>
              <button type="button" disabled={busy} onClick={() => verdict(it, "needs_change")} className="rounded-md px-2 text-[11px] bg-amber-700 text-white disabled:opacity-50">تعديل</button>
              <button type="button" disabled={busy} onClick={() => verdict(it, "note")} className="rounded-md px-2 text-[11px] bg-neutral-700 disabled:opacity-50">ملاحظة</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function JournalTab({ branchId, canManage }) {
  const [entries, setEntries] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    storeApi.fetchBranchJournal(branchId, 150).then((d) => setEntries(d.entries || [])).catch(() => setError("تعذّر تحميل القيود"));
  }, [branchId]);
  useEffect(load, [load]);

  const reverse = async (e) => {
    if (!reason.trim()) { setError("سبب العكس مطلوب"); return; }
    if (!window.confirm(`عكس القيد ${e.ref} في دفاتر الفرع؟`)) return;
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await storeApi.reverseBranchEntry(branchId, e.id, reason.trim());
      setMsg(`عُكس ${e.ref} بقيد ${r.ref || ""}`);
      setReason(""); setOpenId(null);
      load();
    } catch (err) { setError(hqError(err, "تعذّر عكس القيد")); } finally { setBusy(false); }
  };

  if (entries === null) return <div className="text-xs text-neutral-500">جارِ التحميل…</div>;
  return (
    <div className="space-y-1.5">
      <Msg error={error} msg={msg} />
      <div className="max-h-96 overflow-y-auto space-y-1">
        {entries.map((e) => {
          const total = e.lines.reduce((a, l) => a + l.debit, 0);
          return (
            <div key={e.id} className="rounded-lg border border-neutral-800">
              <button type="button" onClick={() => setOpenId(openId === e.id ? null : e.id)} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs">
                <span className="font-mono text-neutral-500">{e.ref}</span>
                <span className="flex-1 text-start truncate">{e.label}{e.isReversal ? " (عكس)" : ""}{e.reversed ? " · معكوس" : ""}</span>
                <span className="tabular-nums">{fmt(total)}</span>
                <span className="text-[10px] text-neutral-500" dir="ltr">{new Date(e.date).toLocaleDateString("en-GB")}</span>
              </button>
              {openId === e.id && (
                <div className="px-2.5 pb-2 space-y-1.5">
                  {e.note && <div className="text-[11px] text-neutral-400">{e.note}</div>}
                  <table className="w-full text-[11px]">
                    <thead className="text-neutral-500"><tr><th className="text-start font-normal">الحساب</th><th className="text-end font-normal">مدين</th><th className="text-end font-normal">دائن</th></tr></thead>
                    <tbody>
                      {e.lines.map((l, i) => (
                        <tr key={i}><td className="font-mono text-neutral-500">{l.account}</td><td className="text-end tabular-nums">{l.debit ? fmt(l.debit) : ""}</td><td className="text-end tabular-nums text-neutral-400">{l.credit ? fmt(l.credit) : ""}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  {canManage && !e.isReversal && !e.reversed && (
                    <div className="flex gap-1.5">
                      <input value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="سبب العكس (إلزامي)"
                        className="flex-1 min-w-0 rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1 text-[11px]" />
                      <button type="button" disabled={busy} onClick={() => reverse(e)}
                        className="flex items-center gap-1 rounded-md px-2 text-[11px] bg-red-950/60 border border-red-800 text-red-300 disabled:opacity-50"><Undo2 size={12} /> اعكس</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const emptyLine = () => ({ account: "", debit: "", credit: "" });

function AdjustTab({ branchId, canManage }) {
  const [accounts, setAccounts] = useState([]);
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { storeApi.fetchAccounts().then((d) => setAccounts(d.accounts || [])).catch(() => {}); }, []);

  const dr = lines.reduce((a, l) => a + (Number(l.debit) || 0), 0);
  const cr = lines.reduce((a, l) => a + (Number(l.credit) || 0), 0);
  const balanced = dr > 0 && Math.abs(dr - cr) < 0.005;
  const set = (i, k, v) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const num = (v) => v.replace(/[^\d.]/g, "");

  const submit = async () => {
    setBusy(true); setError(""); setMsg("");
    try {
      const payload = lines.filter((l) => l.account && (Number(l.debit) || Number(l.credit)))
        .map((l) => ({ account: l.account, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 }));
      const r = await storeApi.postBranchAdjustment(branchId, payload, note.trim());
      setMsg(`رُحّل قيد التسوية ${r.ref} بمبلغ ${fmt(r.debit)}`);
      setLines([emptyLine(), emptyLine()]); setNote("");
    } catch (e) { setError(hqError(e, "تعذّر ترحيل القيد")); } finally { setBusy(false); }
  };

  if (!canManage) return <div className="text-xs text-neutral-500">يتطلّب صلاحية إدارة الفروع.</div>;
  return (
    <div className="space-y-2">
      <Msg error={error} msg={msg} />
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-1.5">
          <select value={l.account} onChange={(e) => set(i, "account", e.target.value)}
            className="min-w-0 rounded-md bg-neutral-800 border border-neutral-700 px-1.5 py-1 text-[11px]">
            <option value="">— الحساب —</option>
            {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
          </select>
          <input inputMode="decimal" value={l.debit} placeholder="مدين" onChange={(e) => set(i, "debit", num(e.target.value))}
            className="min-w-0 rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1 text-[11px]" />
          <input inputMode="decimal" value={l.credit} placeholder="دائن" onChange={(e) => set(i, "credit", num(e.target.value))}
            className="min-w-0 rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1 text-[11px]" />
          <button type="button" disabled={lines.length <= 2} onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-neutral-500 disabled:opacity-30"><Trash2 size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={() => setLines([...lines, emptyLine()])} className="flex items-center gap-1 text-[11px] text-amber-400"><Plus size={12} /> سطر</button>
      <div className={`text-[11px] tabular-nums ${balanced ? "text-emerald-400" : "text-amber-300"}`}>
        مدين {fmt(dr)} · دائن {fmt(cr)} {balanced ? "· ✓ متوازن" : "· غير متوازن"}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="بيان القيد (إلزامي)"
        className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" />
      <button type="button" onClick={submit} disabled={busy || !balanced || !note.trim()}
        className="w-full rounded-lg py-2 text-xs font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950">رحّل قيد التسوية في الفرع</button>
    </div>
  );
}

function FeesTab({ branchId, canManage }) {
  const [period, setPeriod] = useState(thisMonth());
  const [row, setRow] = useState(null);
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setRow(null);
    storeApi.fetchBankFeesAll(period)
      .then((d) => setRow((d.branches || []).find((b) => b.branchId === branchId) || { recorded: 0, settled: null }))
      .catch((e) => setError(hqError(e, "تعذّر التحميل")));
  }, [period, branchId]);
  useEffect(load, [load]);

  const settle = async () => {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await storeApi.settleBranchBankFees(branchId, period, Number(actual) || 0, note.trim());
      setMsg(`سُوّيت عمولة ${period} — الفرق ${fmt(r.adjustment?.diff)}`);
      setActual(""); setNote("");
      load();
    } catch (e) { setError(hqError(e, "تعذّر التسوية")); } finally { setBusy(false); }
  };

  const diff = (Number(actual) || 0) - (row?.recorded || 0);
  return (
    <div className="space-y-2">
      <Msg error={error} msg={msg} />
      <div className="flex items-center gap-2 text-xs">
        <span className="text-neutral-400">الشهر</span>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value || thisMonth())} dir="ltr"
          className="rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" />
      </div>
      {!row ? <div className="text-xs text-neutral-500">جارِ التحميل…</div> : (
        <>
          <div className="text-xs">المسجّل في الفرع: <span className="tabular-nums">{fmt(row.recorded)}</span></div>
          {row.settled ? (
            <div className="text-xs text-emerald-400">سُوّي بمبلغ فعلي {fmt(row.settled.actual)} (فرق {fmt(row.settled.diff)}){row.settled.by ? ` — ${row.settled.by}` : ""}</div>
          ) : canManage ? (
            <>
              <input inputMode="decimal" value={actual} onChange={(e) => setActual(e.target.value.replace(/[^\d.]/g, ""))} placeholder="العمولة الفعلية من كشف البنك"
                className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" />
              {actual !== "" && <div className="text-[11px] text-neutral-400">الفرق {fmt(diff)} — {diff > 0 ? "يُخصم من الشبكة" : diff < 0 ? "يُردّ إلى الشبكة" : "لا فرق"}</div>}
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)"
                className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" />
              <button type="button" onClick={settle} disabled={busy || actual === ""}
                className="w-full rounded-lg py-2 text-xs font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950">سوِّ عمولة الشهر</button>
            </>
          ) : <div className="text-xs text-neutral-500">لم تُسوَّ بعد.</div>}
        </>
      )}
    </div>
  );
}
