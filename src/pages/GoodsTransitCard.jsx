import { useEffect, useState } from "react";
import { PackageSearch } from "lucide-react";
import { storeApi } from "../core/api.js";

const nf = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

/**
 * بضاعةٌ في الطريق بين الفروع: صافي 1350/2140 في دفاتر الفروع يساوي تكلفة ما أُرسل ولم يُستلم
 * وما وصل ناقصًا ولم يقرّره مدير المرسِل — والقديم (3 أيام فأكثر) يُعلَّم.
 */
export default function GoodsTransitCard({ reloadKey = 0 }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    storeApi.fetchGoodsTransit().then(setD).catch(() => setD(false));
  }, [reloadKey]);
  if (!d) return null;
  if (d.ok && d.items.length === 0 && d.ledger === 0) return null;
  const stale = d.items.filter((t) => t.stale).length;
  const short = d.items.filter((t) => t.status === "short").length;
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${d.ok ? "border-neutral-800 bg-neutral-900" : "border-red-900 bg-red-950/40"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <PackageSearch size={15} className={d.ok ? "text-amber-500" : "text-red-400"} /> بضاعةٌ في الطريق
        </h3>
        <span className={`text-xs font-medium ${d.ok ? "text-emerald-400" : "text-red-300"}`}>
          {d.ok ? "✓ مطابق" : `فرق ${nf.format(d.diff)}`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-neutral-950/50 px-3 py-2">
          <div className="text-neutral-500">في دفاتر الفروع (1350 − 2140)</div>
          <div className="font-semibold mt-0.5">{nf.format(d.ledger)}</div>
        </div>
        <div className="rounded-lg bg-neutral-950/50 px-3 py-2">
          <div className="text-neutral-500">في الطريق بالتكلفة</div>
          <div className="font-semibold mt-0.5">{nf.format(d.pending)}</div>
        </div>
      </div>
      {(stale > 0 || short > 0) && (
        <p className="text-[11px] text-red-300/90">
          {stale > 0 ? `${stale} تحويل في الطريق منذ 3 أيام فأكثر` : ""}{stale > 0 && short > 0 ? " · " : ""}
          {short > 0 ? `${short} وصل ناقصًا وينتظر قرار مدير المرسِل` : ""}
        </p>
      )}
      {d.items.length > 0 && (
        <div className="space-y-1">
          {d.items.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-xs text-neutral-400">
              <span className="truncate">
                {t.ref} · {t.from} ← {t.to} · {t.status === "short" ? `ناقص ${t.missing}` : `${t.pieces} قطعة`}
                {t.stale ? <span className="text-red-300"> · {t.ageDays} أيام</span> : ""}
              </span>
              <span className="shrink-0 font-medium text-neutral-200">{nf.format(t.cost)}</span>
            </div>
          ))}
        </div>
      )}
      {!d.ok && (
        <p className="text-[11px] text-red-300/90">
          الفرق يعني قيدًا على 1350 أو 2140 بلا تحويلٍ مقابل — راجع دفاتر الفرعين.
        </p>
      )}
    </div>
  );
}
