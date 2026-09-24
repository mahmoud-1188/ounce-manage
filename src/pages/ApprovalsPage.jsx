import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Inbox } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => money.format(Number(n) || 0);
const STATUS = { pending: ["بانتظار القرار", "text-amber-300"], approved: ["معتمد", "text-emerald-400"], rejected: ["مرفوض", "text-red-400"], expired: ["منتهٍ", "text-neutral-500"] };

/**
 * الاعتمادات — من يعتمد ماذا (الإدارة أم مدير الفرع) لكل نوع طلب، وصندوق
 * الطلبات الواردة من الفروع. الإدارة تقرّر، والفرع يُنفّذ العملية المعتمدة
 * من شاشة الاعتمادات عنده («نفّذ الآن»).
 */
export default function ApprovalsPage({ canManage }) {
  const [rules, setRules] = useState(null);
  const [savedRules, setSavedRules] = useState(null);
  const [items, setItems] = useState(null);
  const [all, setAll] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    storeApi.fetchApprovalRouting().then((d) => { setRules(d.rules); setSavedRules(d.rules); }).catch(() => setError("تعذّر تحميل سياسة الاعتماد"));
  }, []);

  const loadItems = useCallback(() => {
    setItems(null);
    storeApi.fetchStoreApprovals(all).then((d) => setItems(d.approvals || [])).catch(() => setError("تعذّر تحميل الطلبات"));
  }, [all]);
  useEffect(loadItems, [loadItems]);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };
  const dirty = rules && savedRules && rules.some((r, i) => r.approver !== savedRules[i].approver);

  const saveRouting = async () => {
    setBusy(true); setError("");
    try {
      const routing = Object.fromEntries(rules.map((r) => [r.id, r.approver]));
      await storeApi.saveApprovalRouting(routing);
      setSavedRules(rules);
      flash("اعتُمدت السياسة — تسري على الطلبات الجديدة في كل الفروع");
    } catch (e) { setError(hqError(e, "تعذّر حفظ السياسة")); } finally { setBusy(false); }
  };

  const decide = async (a, decision) => {
    const note = (notes[a.id] || "").trim();
    if (decision === "rejected" && !note) { setError("اكتب سبب الرفض أولًا"); return; }
    setBusy(true); setError("");
    try {
      await storeApi.decideStoreApproval(a.id, decision, note);
      flash(decision === "approved" ? `اعتُمد ${a.ref} — ينفّذه الفرع من شاشة الاعتمادات` : `رُفض ${a.ref}`);
      loadItems();
    } catch (e) { setError(hqError(e, "تعذّر تسجيل القرار")); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-amber-500" />
        <h2 className="text-lg font-semibold">الاعتمادات</h2>
      </div>
      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
      {msg && <div className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">{msg}</div>}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
        <h3 className="text-sm font-semibold">من يعتمد ماذا</h3>
        <p className="text-[11px] text-neutral-500">
          الطلب يُنشأ حين يتجاوز المبلغ حدّ الفرع. «الإدارة» تعني أن القرار هنا ولا يستطيع مدير الفرع اعتماده ولا اعتماد طلبه بنفسه.
        </p>
        {!rules ? <div className="text-xs text-neutral-500">جارِ التحميل…</div> : (
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{r.label}{r.threshold > 0 && <span className="text-xs text-neutral-500"> · فوق {fmt(r.threshold)}</span>}</span>
                <div className="flex gap-1 bg-neutral-800/60 rounded-lg p-1">
                  {[["branch", "مدير الفرع"], ["hq", "الإدارة"]].map(([v, l]) => (
                    <button key={v} type="button" disabled={!canManage}
                      onClick={() => setRules(rules.map((x, j) => (j === i ? { ...x, approver: v } : x)))}
                      className={`px-2.5 py-1 rounded-md text-xs disabled:opacity-60 ${r.approver === v ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"}`}>{l}</button>
                  ))}
                </div>
              </div>
            ))}
            {canManage && (
              <button type="button" onClick={saveRouting} disabled={busy || !dirty}
                className="w-full rounded-lg py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950">اعتمد السياسة</button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Inbox size={15} className="text-amber-500" /> {all ? "كل الطلبات" : "الطلبات المعلّقة"}</h3>
        <button type="button" onClick={() => setAll((v) => !v)} className="text-xs text-amber-400">{all ? "المعلّقة فقط" : "السجلّ كاملًا"}</button>
      </div>

      {items === null ? <div className="text-xs text-neutral-500">جارِ التحميل…</div>
        : items.length === 0 ? <div className="text-neutral-500 text-sm rounded-xl border border-neutral-800 bg-neutral-900 p-4">لا طلبات.</div>
        : (
          <div className="space-y-2">
            {items.map((a) => {
              const [sl, sc] = STATUS[a.status] || [a.status, ""];
              const mine = a.approverKind === "hq";
              return (
                <div key={a.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{a.kindLabel} · <span className="tabular-nums text-amber-400">{fmt(a.amount)}</span></div>
                      <div className="text-[11px] text-neutral-500">
                        {a.branchName} · {a.ref} · طلبه {a.requester || "—"} · {new Date(a.requestedAt).toLocaleString("en-GB")}
                      </div>
                      {a.note && <div className="text-xs text-neutral-300 mt-1">{a.note}</div>}
                    </div>
                    <div className="text-end shrink-0">
                      <div className={`text-xs ${sc}`}>{sl}</div>
                      <div className="text-[10px] text-neutral-500">{mine ? "قرار الإدارة" : "قرار مدير الفرع"}</div>
                    </div>
                  </div>
                  {a.status !== "pending" && (
                    <div className="text-[11px] text-neutral-400">
                      {a.approver ? `قرّره ${a.approver}` : ""}{a.decidedAt ? ` · ${new Date(a.decidedAt).toLocaleString("en-GB")}` : ""}{a.decisionNote ? ` · ${a.decisionNote}` : ""}
                      {a.status === "approved" && (a.executedAt ? " · نُفّذ في الفرع" : " · بانتظار تنفيذ الفرع")}
                    </div>
                  )}
                  {a.status === "pending" && canManage && (
                    <div className="flex gap-2">
                      <input value={notes[a.id] || ""} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
                        placeholder={mine ? "ملاحظة (إلزامية للرفض)" : "الطلب لمدير الفرع — تستطيع الإدارة البتّ فيه"}
                        className="flex-1 min-w-0 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs" />
                      <button type="button" disabled={busy} onClick={() => decide(a, "approved")}
                        className="flex items-center gap-1 rounded-lg px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"><CheckCircle2 size={13} /> اعتماد</button>
                      <button type="button" disabled={busy} onClick={() => decide(a, "rejected")}
                        className="flex items-center gap-1 rounded-lg px-3 text-xs font-medium bg-red-950/60 border border-red-800 text-red-300 disabled:opacity-50"><XCircle size={13} /> رفض</button>
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
