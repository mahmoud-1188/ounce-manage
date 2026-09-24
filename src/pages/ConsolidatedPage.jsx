import { useEffect, useState } from "react";
import { Scale, ChevronDown, ChevronUp } from "lucide-react";
import { storeApi } from "../core/api.js";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => money.format(Number(n) || 0);
const today = () => new Date().toISOString().slice(0, 10);

/**
 * الميزان الموحّد — أرصدة كل حسابات المنشأة حتى تاريخٍ، مجمّعةً من دفاتر
 * كل الفروع مباشرةً (لا لقطات)، مع تفصيل كل حساب على الفروع، والمركز
 * الذهبي الصافي (جم24) لكل فرع من دفتر الوزن.
 */
export default function ConsolidatedPage() {
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    setData(null); setError("");
    storeApi.fetchConsolidated(to).then(setData).catch(() => setError("تعذّر تحميل الميزان الموحّد"));
  }, [to]);

  const accounts = (data?.accounts || []).filter((a) => !q || a.code.includes(q) || (a.name || "").includes(q));
  const groups = {};
  accounts.forEach((a) => { const k = a.code[0]; (groups[k] = groups[k] || []).push(a); });
  const GROUP = { 1: "الأصول", 2: "الخصوم", 3: "حقوق الملكية", 4: "الإيرادات", 5: "تكلفة المبيعات", 6: "المصروفات" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Scale size={20} className="text-amber-500" />
          <h2 className="text-lg font-semibold">الميزان الموحّد</h2>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          حتى
          <input type="date" value={to} max={today()} onChange={(e) => setTo(e.target.value || today())} dir="ltr"
            className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-sm" />
        </label>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
      {!data && !error && <div className="text-neutral-400 text-sm">جارِ التحميل…</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Box label="إجمالي المدين" value={fmt(data.totalDebit)} />
            <Box label="إجمالي الدائن" value={fmt(data.totalCredit)} />
            <Box label="التوازن" value={data.balanced ? "✓ متوازن" : `فرق ${fmt(data.totalDebit - data.totalCredit)}`} tone={data.balanced ? "good" : "bad"} />
            <Box label="المركز الذهبي (جم24)" value={fmt(data.goldTotal)} />
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-neutral-400">
                <tr><th className="p-1.5 text-start">الفرع</th><th className="p-1.5 text-end">ذهب صافٍ جم24</th><th className="p-1.5 text-end">قيود</th><th className="p-1.5 text-end">آخر قيد</th></tr>
              </thead>
              <tbody>
                {data.branches.map((b) => (
                  <tr key={b.id} className="border-t border-neutral-800">
                    <td className="p-1.5">{b.name}</td>
                    <td className="p-1.5 text-end tabular-nums text-amber-400">{fmt(b.goldNet)}</td>
                    <td className="p-1.5 text-end tabular-nums">{b.entries}</td>
                    <td className="p-1.5 text-end text-neutral-500" dir="ltr">{b.lastAt ? new Date(b.lastAt).toLocaleDateString("en-GB") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الحساب أو اسمه"
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" />

          {accounts.length === 0 ? (
            <div className="text-neutral-500 text-sm rounded-xl border border-neutral-800 bg-neutral-900 p-4">لا أرصدة حتى هذا التاريخ.</div>
          ) : Object.keys(groups).sort().map((g) => (
            <div key={g} className="rounded-xl border border-neutral-800 bg-neutral-900">
              <div className="px-3 py-2 text-xs font-semibold text-amber-400 border-b border-neutral-800">{GROUP[g] || g}</div>
              {groups[g].map((a) => (
                <div key={a.code} className="border-b border-neutral-800 last:border-0">
                  <button type="button" onClick={() => setOpen(open === a.code ? null : a.code)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-800/40">
                    <span className="font-mono text-xs text-neutral-500 w-12 text-start">{a.code}</span>
                    <span className="flex-1 text-start truncate">{a.name}</span>
                    <span className={`tabular-nums ${a.total < 0 ? "text-red-400" : ""}`}>{fmt(a.total)}</span>
                    <span className="text-[10px] text-neutral-500 w-10">{a.total >= 0 ? "مدين" : "دائن"}</span>
                    {open === a.code ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {open === a.code && (
                    <div className="px-3 pb-2 space-y-1">
                      {a.branches.map((b) => (
                        <div key={b.branchId} className="flex items-center text-xs text-neutral-400">
                          <span className="flex-1">{b.name}</span>
                          <span className="tabular-nums">{fmt(b.balance)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          <p className="text-[11px] text-neutral-500">الرصيد = مدين − دائن. موجبٌ مدين وسالبٌ دائن. اضغط حسابًا لرؤية نصيب كل فرع.</p>
        </>
      )}
    </div>
  );
}

function Box({ label, value, tone }) {
  const c = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-neutral-100";
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 space-y-0.5">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${c}`}>{value}</div>
    </div>
  );
}
