import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { storeApi } from "../core/api.js";

const nf = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

/**
 * مطابقة النقد في الطريق (المرجع 5.2.0): رصيد 1170 في دفاتر كل الفروع
 * يساوي تحويلات النقد المرسلة التي لم يستلمها فرعها بعد — وإلا ففرقٌ يُبحث.
 */
export default function CashTransitCard({ reloadKey = 0 }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    storeApi.fetchCashTransit().then(setD).catch(() => setD(false));
  }, [reloadKey]);
  if (!d) return null;
  if (d.ok && d.pending === 0 && d.ledger === 0) return null;
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${d.ok ? "border-neutral-800 bg-neutral-900" : "border-red-900 bg-red-950/40"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Truck size={15} className={d.ok ? "text-amber-500" : "text-red-400"} /> نقدٌ في الطريق
        </h3>
        <span className={`text-xs font-medium ${d.ok ? "text-emerald-400" : "text-red-300"}`}>
          {d.ok ? "✓ مطابق" : `فرق ${nf.format(d.diff)}`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-neutral-950/50 px-3 py-2">
          <div className="text-neutral-500">في دفاتر الفروع (1170)</div>
          <div className="font-semibold mt-0.5">{nf.format(d.ledger)}</div>
        </div>
        <div className="rounded-lg bg-neutral-950/50 px-3 py-2">
          <div className="text-neutral-500">أُرسل ولم يُستلم</div>
          <div className="font-semibold mt-0.5">{nf.format(d.pending)}</div>
        </div>
      </div>
      {d.items.length > 0 && (
        <div className="space-y-1">
          {d.items.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-xs text-neutral-400">
              <span className="truncate">{t.from ? `${t.from} ← ` : ""}{t.to}{t.note ? ` · ${t.note}` : ""}</span>
              <span className="shrink-0 font-medium text-neutral-200">{nf.format(t.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {!d.ok && (
        <p className="text-[11px] text-red-300/90">
          الفرق يعني قيدًا على 1170 بلا تحويلٍ مقابل، أو تحويلًا استُلم بلا قيد — راجع دفاتر الفروع.
        </p>
      )}
    </div>
  );
}
