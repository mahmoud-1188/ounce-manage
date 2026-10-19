import { useState } from "react";
import { Banknote } from "lucide-react";
import { storeApi } from "../core/api.js";

/**
 * سحب الإدارة من رأس مال الفرع: الإدارة تطلب المبلغ، ومدير الفرع يوافق فيخرج النقد من خزنته
 * إلى خزنة الإدارة (أو يرفض بسببه). الطلب وحالته في «معاملات الإدارة».
 */
export default function CapitalDrawCard({ branchId }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const send = async () => {
    const a = Number(String(amount).replace(/[^\d.]/g, ""));
    if (!(a > 0)) { setMsg({ bad: true, text: "اكتب المبلغ" }); return; }
    setBusy(true); setMsg(null);
    try {
      await storeApi.requestCapitalDraw({ branchId, amount: a, note: note.trim() });
      setMsg({ text: "أُرسل طلب السحب — ينتظر موافقة مدير الفرع" }); setAmount(""); setNote("");
    } catch { setMsg({ bad: true, text: "تعذّر إرسال الطلب" }); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 space-y-2" data-capital-draw-card>
      <div className="flex items-center gap-2">
        <Banknote size={15} className="text-amber-500" />
        <span className="text-sm font-medium">سحب من رأس مال الفرع</span>
      </div>
      <p className="text-xs text-neutral-500">يخرج المبلغ من خزنة الفرع إلى خزنة الإدارة بعد موافقة مديره، بقيدٍ على الطرفين.</p>
      <div className="flex gap-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="المبلغ"
          className="w-28 rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-amber-600" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="السبب (اختياري)"
          className="flex-1 rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-amber-600" />
      </div>
      {msg && <div className={`text-xs ${msg.bad ? "text-red-400" : "text-emerald-400"}`}>{msg.text}</div>}
      <button type="button" onClick={send} disabled={busy} className="w-full rounded-lg py-2 text-sm font-medium bg-amber-600 text-black hover:bg-amber-500 disabled:opacity-50">
        {busy ? "…" : "اطلب السحب"}
      </button>
    </div>
  );
}
