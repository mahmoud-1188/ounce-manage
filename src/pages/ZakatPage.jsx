import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { storeApi } from "../core/api.js";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => money.format(Number(n) || 0);
const PRICE_KEY = "ounce_hq_zakat_price24";
const readPrice = () => { try { return localStorage.getItem(PRICE_KEY) || ""; } catch { return ""; } };

/**
 * زكاة الفروع (المرجع 5.2.0: HqZakatReport · قرار المالك 2026-09-29).
 * كل فرعٍ على سطره بالدالّة نفسها التي في الفرع — من سجلّاته على الخادم وبسعر اليوم هنا —
 * ثم إجمالي المجموعة. فرعٌ أطفأ الزكاة «متوقفة» خارج المجموع. المجموع جمع زكاة كل فرع،
 * لا زكاة وعاءٍ موحّد: فرعٌ التزاماته أكبر من أصوله لا يُنقص زكاة غيره.
 */
export default function ZakatPage() {
  const [price, setPrice] = useState(readPrice);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setData(null); setError("");
    try { localStorage.setItem(PRICE_KEY, price); } catch { /* تفضيلٌ للجهاز فقط */ }
    const t = setTimeout(() => storeApi.fetchZakat(price).then(setData).catch(() => setError("تعذّر حساب زكاة الفروع")), 350);
    return () => clearTimeout(t);
  }, [price]);

  const rows = (z) => [
    ["النقد والبنك", z.cash], ["الذمم المرجوّة", z.receivables],
    [`الذهب المملوك ${Number(z.goldFine || 0).toFixed(3)} جم24`, z.goldValue], ["مصنعيّة القطع المملوكة", z.workmanship],
    ["ذهبٌ لنا عند الغير", z.goldRecvValue], ["− الالتزامات المتداولة", -z.liabilities], ["− ما علينا ذهبًا", -z.goldOwedValue],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Landmark size={20} className="text-amber-500" />
          <h2 className="text-lg font-semibold">زكاة الفروع</h2>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          سعر جرام 24 اليوم
          <input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} dir="ltr"
            className="w-28 rounded-lg px-2 py-1 bg-neutral-900 border border-neutral-700 text-neutral-100" placeholder="0.00" />
        </label>
      </div>
      {!Number(price) && <p className="text-xs text-amber-400">أدخل سعر جرام 24 اليوم — بلا سعرٍ يُحسب الذهب بلا قيمة في الوعاء.</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!data && !error && <p className="text-sm text-neutral-500">يُحسب من دفاتر الفروع…</p>}
      {data && (
        <>
          <div className="rounded-2xl border border-amber-700/50 bg-neutral-900 p-4">
            <p className="text-xs text-neutral-400">إجمالي المجموعة — {data.counted} فرع{data.off ? ` · ${data.off} متوقفة` : ""}{data.errors ? ` · ${data.errors} تعذّر` : ""}</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm text-neutral-300">الوعاء {fmt(data.total.base)}</span>
              <span className="text-2xl font-bold text-amber-400">{fmt(data.total.due)}</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">كل سطرٍ بسنة فرعه (هجرية 2.5٪ · ميلادية 2.5777٪) وبسعر {fmt(data.price24)} — تاريخ {data.date}</p>
          </div>
          <div className="space-y-2">
            {data.lines.map((l) => (
              <div key={l.branchId} className="rounded-xl border border-neutral-800 bg-neutral-900/60">
                <button type="button" onClick={() => setOpen(open === l.branchId ? null : l.branchId)} className="w-full flex items-center justify-between px-4 py-3 text-start">
                  <span className="text-sm font-semibold">{l.name} <span className="text-xs text-neutral-500">{l.ref}</span></span>
                  {l.status === "ok" ? (
                    <span className="text-sm font-bold text-neutral-100">{fmt(l.z.due)} <span className="text-[11px] font-normal text-neutral-500">{l.year === "hijri" ? "هجرية" : "ميلادية"}</span></span>
                  ) : <span className="text-xs text-neutral-500">{l.status === "off" ? "متوقفة في الفرع" : "تعذّر الحساب"}</span>}
                </button>
                {open === l.branchId && l.status === "ok" && (
                  <div className="px-4 pb-3 space-y-1">
                    {rows(l.z).map(([label, v]) => (
                      <div key={label} className="flex justify-between text-xs"><span className="text-neutral-400">{label}</span><span>{fmt(v)}</span></div>
                    ))}
                    <div className="flex justify-between text-xs font-bold border-t border-neutral-800 pt-1"><span>الوعاء</span><span>{fmt(l.z.base)}</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
