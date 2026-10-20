import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { storeApi } from "../core/api.js";
import WastageCard from "./WastageCard.jsx";

const wf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const PRICE_KEY = "ounce_hq_zakat_price24";
const KARAT_KEY = "ounce_hq_netweight_karat";
const read = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };

/**
 * صافي الفروع بالوزن بعد الالتزامات: كل فرعٍ على سطره بمعادلة بطاقة الفرع نفسها —
 * الذهب المملوك + النقد كلّه بسعر اليوم − الالتزامات — ثم مجموع الفروع. الفرع في فترة التجهيز بلا أرقام.
 */
export default function NetWeightPage() {
  const [price, setPrice] = useState(() => read(PRICE_KEY, ""));
  const [karat, setKarat] = useState(() => (read(KARAT_KEY, "21") === "24" ? 24 : 21));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setError("");
    try { localStorage.setItem(PRICE_KEY, price); localStorage.setItem(KARAT_KEY, String(karat)); } catch { /* تفضيلٌ للجهاز */ }
    const t = setTimeout(() => storeApi.fetchNetWeight(price, karat).then(setData).catch(() => setError("تعذّر حساب صافي الفروع")), 300);
    return () => clearTimeout(t);
  }, [price, karat]);
  const cell = "px-3 py-2 text-xs text-end tabular-nums";
  const neg = (v) => (Number(v) < 0 ? "text-red-400" : "");
  return (
    <div className="space-y-4" data-net-weight-table>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Scale size={20} className="text-amber-500" />
          <h2 className="text-lg font-semibold">صافي الفروع بالوزن بعد الالتزامات</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          {[21, 24].map((k) => (
            <button key={k} type="button" onClick={() => setKarat(k)} data-karat={k}
              className={`px-2 py-1 rounded-lg border ${karat === k ? "border-amber-500 text-amber-400" : "border-neutral-700"}`}>عيار {k}</button>
          ))}
          <label className="flex items-center gap-2">
            سعر جرام 24
            <input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} dir="ltr"
              className="w-24 rounded-lg px-2 py-1 bg-neutral-900 border border-neutral-700 text-neutral-100" placeholder="0.00" />
          </label>
        </div>
      </div>
      {!Number(price) && <p className="text-xs text-amber-400">أدخل سعر جرام 24 اليوم — بلا سعرٍ لا يُحوَّل النقد والالتزامات وزنًا.</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {data && (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[640px]">
            <thead className="bg-neutral-900 text-[11px] text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-start">الفرع</th>
                <th className="px-3 py-2 text-end">الذهب المملوك</th>
                <th className="px-3 py-2 text-end">+ النقد وزنًا</th>
                <th className="px-3 py-2 text-end">− الالتزامات وزنًا</th>
                <th className="px-3 py-2 text-end">= الصافي</th>
                <th className="px-3 py-2 text-end">مع ما لنا عند الناس</th>
              </tr>
            </thead>
            <tbody>
              {data.branches.map((b) => (
                <tr key={b.branchId} data-nw-row={b.ref} className="border-t border-neutral-800">
                  <td className="px-3 py-2 text-xs">{b.name} <span className="text-neutral-500">{b.ref}</span></td>
                  {b.setup ? (
                    <td colSpan={5} className="px-3 py-2 text-xs text-neutral-500 text-center">فترة التجهيز — لا حسابات بعد</td>
                  ) : (
                    <>
                      <td className={`${cell} ${neg(b.gold)}`}>{wf.format(b.gold)}</td>
                      <td className={cell}>{wf.format(b.cashGrams)}</td>
                      <td className={cell}>{wf.format(b.liabilitiesGrams)}</td>
                      <td className={`${cell} font-bold ${neg(b.net) || "text-amber-400"}`}>{wf.format(b.net)}</td>
                      <td className={`${cell} text-neutral-400`}>{wf.format(b.withReceivables)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-900">
              <tr className="border-t border-neutral-700" data-nw-total>
                <td className="px-3 py-2 text-xs font-bold">مجموع الفروع</td>
                <td className={cell}>{wf.format(data.totals.gold)}</td>
                <td className={cell}>{wf.format(data.totals.cashGrams)}</td>
                <td className={cell}>{wf.format(data.totals.liabilitiesGrams)}</td>
                <td className={`${cell} font-bold text-amber-400`}>{wf.format(data.totals.net)}</td>
                <td className={`${cell} text-neutral-400`}>{wf.format(data.totals.withReceivables)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="text-[11px] text-neutral-500">جرامات بعيار {karat}. الذهب المملوك: القطع غير المباعة والكسر وذهب الخزنة بعد ما علينا ذهبًا للموردين. النقد: كاش وشبكة وبنوك. الالتزامات: الموردون والرواتب والضريبة الصافية.</p>
      <WastageCard />
    </div>
  );
}
