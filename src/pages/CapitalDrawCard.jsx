import { useEffect, useState } from "react";
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
  // آخر طلبات السحب لهذا الفرع وقرار مديره — يتحدّث كل دقيقة
  const [recent, setRecent] = useState([]);
  const load = () => storeApi.fetchHqTransactions()
    .then((rows) => setRecent((rows || []).filter((t) => t.flow === "capital_draw" && t.branchId === branchId).slice(0, 5)))
    .catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    const a = Number(String(amount).replace(/[^\d.]/g, ""));
    if (!(a > 0)) { setMsg({ bad: true, text: "اكتب المبلغ" }); return; }
    setBusy(true); setMsg(null);
    try {
      await storeApi.requestCapitalDraw({ branchId, amount: a, note: note.trim() });
      setMsg({ text: "أُرسل طلب السحب — ينتظر موافقة مدير الفرع" }); setAmount(""); setNote(""); load();
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
      {recent.length > 0 && (
        <div className="pt-2 border-t border-neutral-800 space-y-1" data-capital-draw-recent>
          {recent.map((t) => (
            <div key={t.id} className="text-xs">
              <span className="text-neutral-300">{Number(t.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <span className="text-neutral-500"> · {new Date(t.createdAt).toLocaleDateString("en-GB")} · </span>
              {t.status === "pending" && <span className="text-amber-400">بانتظار موافقة مدير الفرع</span>}
              {t.status === "received" && <span className="text-emerald-400">وافق المدير — دخل خزنة الإدارة{t.decidedAt ? ` (${new Date(t.decidedAt).toLocaleString("en-GB")})` : ""}</span>}
              {t.status === "rejected" && <span className="text-red-400">رفضه المدير{t.decisionNote ? `: ${t.decisionNote}` : ""}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
