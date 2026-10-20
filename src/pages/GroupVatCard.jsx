import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const monthBounds = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, "0")}`];
};
const STATUS = {
  hq: ["دفتر الإدارة", "text-neutral-300"], ok: ["✓ حوّل", "text-emerald-400"], sent: ["✗ حوّل ولم يُستلم", "text-red-400"],
  pending: ["✗ لم يسوِّ إقراره", "text-red-400"], self: ["سوّاه الفرع بنفسه", "text-amber-400"], none: ["لا ضريبة", "text-neutral-500"],
  grouped: ["✓ ضمن الموحّد المسدَّد", "text-emerald-400"],
};

/**
 * الإقرار الموحّد للمنشأة (المرجع HqGroupVatPanel · migration 092): الإدارة تختار «إقرارٌ واحد»، فيسوّي كل فرعٍ
 * فترته بتحويل صافي ضريبته للإدارة، وتستلمه الإدارة (معاملات الإدارة ← استلام) في 2225، ثم تسدّد الموحّد مرّةً واحدة.
 * لا يُسدَّد شهرٌ فيه فرعٌ لم يحوّل أو حوّل ولم يُستلم — والسبب بجانبه.
 */
export default function GroupVatCard({ canManage }) {
  const prev = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
  const [ym, setYm] = useState(prev);
  const [g, setG] = useState(null);
  const [src, setSrc] = useState("bank");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [from, to] = monthBounds(ym);
  const load = () => storeApi.fetchGroupVat(from, to).then(setG).catch((e) => setError(hqError(e, "تعذّر تحميل الإقرار الموحّد")));
  useEffect(() => { setG(null); load(); }, [ym]);
  const run = async (fn, ok) => {
    setBusy(true); setError(""); setMsg("");
    try { await fn(); setMsg(ok); load(); } catch (e) { setError(hqError(e, "تعذّر التنفيذ")); } finally { setBusy(false); }
  };
  const money = (v) => nf.format(Number(v) || 0);
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3" data-group-vat>
      <div className="flex items-center gap-2">
        <Receipt size={18} className="text-amber-500" />
        <h3 className="font-semibold flex-1">الإقرار الموحّد لضريبة القيمة المضافة</h3>
        {g && (
          <span className={`text-xs ${g.filing === "group" ? "text-emerald-400" : "text-neutral-400"}`} data-group-vat-filing={g.filing}>
            {g.filing === "group" ? "إقرارٌ واحد للمنشأة" : "إقرارٌ لكل فرع"}
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-400 leading-6">
        «إقرارٌ لكل فرع»: كل فرعٍ يسدّد للهيئة وحده. «إقرارٌ واحد للمنشأة»: كل فرعٍ يحوّل صافي ضريبته للإدارة، والإدارة تستلمه ثم تسدّد للهيئة مرّةً واحدة.
      </p>
      {canManage && g && (
        <button disabled={busy} data-group-vat-toggle onClick={() => run(() => storeApi.setVatFiling(g.filing === "group" ? "branch" : "group"), g.filing === "group" ? "صار الإقرار لكل فرعٍ وحده" : "صار الإقرار موحّدًا — تراه الفروع في شاشة الإقرار")}
          className="text-xs px-3 py-1.5 rounded-lg border border-amber-700 text-amber-400 hover:bg-amber-950/40">
          {g.filing === "group" ? "اجعله إقرارًا لكل فرع" : "اجعله إقرارًا واحدًا للمنشأة"}
        </button>
      )}
      <label className="block text-xs text-neutral-400">الشهر
        <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="block mt-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-sm text-neutral-100" />
      </label>
      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
      {msg && <div className="text-sm text-emerald-400">{msg}</div>}
      {!g ? <div className="text-neutral-400 text-sm">جارِ التحميل…</div> : (
        <>
          <div className="rounded-lg border border-amber-900/60 bg-neutral-950 p-3">
            <div className="text-xs text-neutral-400">الإقرار الموحّد — {ym}</div>
            <div className={`text-xl font-bold ${g.total.net >= 0 ? "text-red-400" : "text-emerald-400"}`} data-group-vat-net={g.total.net}>
              {g.total.net >= 0 ? "يُسدَّد " : "مستردّ "}{money(Math.abs(g.total.net))}
            </div>
            <div className="text-xs text-neutral-500">مخرجات {money(g.total.outputVat)} − مدخلات {money(g.total.inputVat)} · ما حوّلته الفروع {money(g.total.branchesTotal)} · ضريبة دفتر الإدارة {money(g.total.hqPay)}</div>
          </div>
          <div className="space-y-1.5">
            {g.rows.filter((r) => r.isHq || r.status !== "none").map((r) => {
              const [label, tone] = STATUS[r.status] || STATUS.none;
              return (
                <div key={r.id} className="rounded-lg border border-neutral-800 px-3 py-2" data-group-vat-row={r.status}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{r.name}{r.isHq ? " (الرئيسي)" : ""}</span>
                    <span className={`text-xs font-semibold ${tone}`}>{label}{r.status === "ok" || r.status === "sent" ? ` ${money(r.toHq)}` : ""}</span>
                  </div>
                  <div className="text-xs text-neutral-500">مخرجات {money(r.outputVat)} · مدخلات {money(r.inputVat)} · الصافي {money(r.net)}</div>
                </div>
              );
            })}
          </div>
          {g.blockers.length > 0 && <p className="text-xs text-red-400 leading-6">لا يُسدَّد الموحّد بعد: {g.blockers.map((b) => b.why).join(" · ")}</p>}
          {g.settlement && <p className="text-xs text-emerald-400">✓ سُدِّد الإقرار الموحّد {g.settlement.period_from} ← {g.settlement.period_to} · {money(g.settlement.paid)}</p>}
          {canManage && g.filing === "group" && !g.settlement && (
            <div className="flex items-end gap-2 flex-wrap">
              <label className="text-xs text-neutral-400">يُدفع من
                <select value={src} onChange={(e) => setSrc(e.target.value)} className="block mt-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-sm text-neutral-100">
                  <option value="bank">البنك</option><option value="safe_cash">نقد خزنة الإدارة</option><option value="safe_network">شبكة خزنة الإدارة</option>
                </select>
              </label>
              <button disabled={!g.ready || busy} data-group-vat-settle onClick={() => run(() => storeApi.settleGroupVat({ from, to, source: src }), "سُدِّد الإقرار الموحّد وقُيِّد في دفتر الإدارة")}
                className={`text-sm px-4 py-2 rounded-lg font-semibold ${g.ready ? "bg-amber-600 text-neutral-950 hover:bg-amber-500" : "bg-neutral-800 text-neutral-500"}`}>
                سدِّد الإقرار الموحّد {g.ready ? money(g.total.pay) : ""}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
