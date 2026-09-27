import { useState } from "react";
import { ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const KARATS = [24, 22, 21, 18];
const nf = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });
const blank = () => ({ key: Math.random().toString(36).slice(2), karat: 21, weight: "", costPerGram: "", wmPerGram: "", pieces: "" });
const num = (v) => String(v).replace(/[^\d.]/g, "");

/**
 * الإدارة تشتري على حساب الفرع (المرجع 5.2.0 — HqPurchaseForm): المورد والأسطر
 * (العيار · الوزن · سعر الجرام · المصنعية للجرام) والدفع من خزنة الفرع، والذهب يدخل
 * مخزونه دفعةً للتكويد. القيد في الفرع: 5110 مقابل 1110 أو 1120.
 */
export default function HqPurchaseCard({ branchId }) {
  const [open, setOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [payFrom, setPayFrom] = useState("safe_cash");
  const [needApproval, setNeedApproval] = useState(true);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([blank()]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const upd = (k, f, v) => setLines((p) => p.map((l) => (l.key === k ? { ...l, [f]: v } : l)));
  const calc = lines.map((l) => {
    const w = Number(l.weight) || 0;
    const gold = Math.round(w * (Number(l.costPerGram) || 0) * 100) / 100;
    const wm = Math.round((Number(l.wmPerGram) || 0) * w * 100) / 100;
    return { ...l, w, gold, wm, total: gold + wm };
  });
  const total = calc.reduce((a, l) => a + l.total, 0);
  const ok = supplierName.trim() && calc.some((l) => l.w > 0 && Number(l.costPerGram) > 0);

  const send = async () => {
    if (!ok || busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await storeApi.createHqPurchase(branchId, {
        supplierName: supplierName.trim(), payFrom, requireApproval: needApproval, note,
        lines: calc.filter((l) => l.w > 0).map((l) => ({ karat: Number(l.karat), weight: l.w, costPerGram: Number(l.costPerGram) || 0, wmPerGram: Number(l.wmPerGram) || 0, pieces: Number(l.pieces) || 0 })),
      });
      setMsg({ text: r.approvalPending ? `أُرسل لموافقة مدير الفرع (${r.approvalPending.ref}) — يُخصم عند التنفيذ` : `سُجّل الشراء ${r.purchase?.ref} في الفرع — ${nf.format(r.purchase?.grandTotal || 0)}` });
      setLines([blank()]); setNote("");
    } catch (e) {
      setMsg({ bad: true, text: hqError(e, e?.body?.error === "insufficient_safe_balance" ? "رصيد خزنة الفرع لا يكفي" : "تعذّر تسجيل الشراء") });
    } finally { setBusy(false); }
  };

  const inp = "rounded-md bg-neutral-950 border border-neutral-700 px-2 py-1.5 text-sm text-neutral-100 w-full";
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-1.5"><ShoppingBag size={15} className="text-amber-500" /> شراء على حساب الفرع</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="space-y-2">
          <p className="text-[11px] text-neutral-500">الدفع من خزنة الفرع، والذهب يدخل مخزونه دفعةً للتكويد. القيد: مشتريات 5110 مقابل {payFrom === "safe_network" ? "1120 الخزنة — شبكة" : "1110 الخزنة — نقدي"}.</p>
          <input className={inp} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="اسم المورد (يُنشأ في الفرع إن لم يكن)" />
          {calc.map((l) => (
            <div key={l.key} className="space-y-1">
              <div className="grid grid-cols-5 gap-1">
                <select className={inp} value={l.karat} onChange={(e) => upd(l.key, "karat", Number(e.target.value))}>{KARATS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
                <input className={inp} inputMode="decimal" value={l.weight} onChange={(e) => upd(l.key, "weight", num(e.target.value))} placeholder="الوزن" />
                <input className={inp} inputMode="decimal" value={l.costPerGram} onChange={(e) => upd(l.key, "costPerGram", num(e.target.value))} placeholder="سعر الجرام" />
                <input className={inp} inputMode="decimal" value={l.wmPerGram} onChange={(e) => upd(l.key, "wmPerGram", num(e.target.value))} placeholder="مصنعية/جم" />
                <input className={inp} inputMode="numeric" value={l.pieces} onChange={(e) => upd(l.key, "pieces", num(e.target.value))} placeholder="القطع" />
              </div>
              {l.w > 0 && <p className="text-[10px] text-neutral-500">ذهب {nf.format(l.gold)} + مصنعية {nf.format(Number(l.wmPerGram) || 0)} × {l.w} = {nf.format(l.wm)} ← {nf.format(l.total)}</p>}
            </div>
          ))}
          <button type="button" onClick={() => setLines((p) => [...p, blank()])} className="text-xs text-amber-400">+ سطر</button>
          <div className="flex gap-1 bg-neutral-800/60 rounded-lg p-1">
            {[["safe_cash", "من نقد الخزنة"], ["safe_network", "من شبكة الخزنة"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setPayFrom(v)}
                className={`flex-1 px-2.5 py-1 rounded-md text-xs ${payFrom === v ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"}`}>{l}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-300">
            <input type="checkbox" checked={needApproval} onChange={(e) => setNeedApproval(e.target.checked)} />
            يوافق مدير الفرع قبل الخصم من خزنته
          </label>
          <input className={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" />
          {msg && <div className={`text-xs ${msg.bad ? "text-red-400" : "text-emerald-400"}`}>{msg.text}</div>}
          <button type="button" onClick={send} disabled={!ok || busy}
            className="w-full rounded-lg py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950">
            {busy ? "جارِ الإرسال…" : `أرسل الشراء (${nf.format(total)})`}
          </button>
        </div>
      )}
    </div>
  );
}
