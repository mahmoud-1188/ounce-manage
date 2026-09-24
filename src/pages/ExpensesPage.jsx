import { useCallback, useEffect, useState } from "react";
import { Receipt, Landmark } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => money.format(Number(n) || 0);
const PERIODS = [["d30", "آخر ٣٠ يومًا"], ["mtd", "هذا الشهر"], ["ytd", "هذه السنة"], ["all", "الكل"]];
const thisMonth = () => new Date().toISOString().slice(0, 7);

/**
 * مصروفات الفروع — كل حساب مصروف (6xxx) × كل فرع لفترةٍ، ومن تحتها
 * عمولة البنك مركزيًّا: كشف بنكٍ واحد للمنشأة، تُوزَّع عمولته الفعلية
 * على الفروع بنسبة ما سجّله كلٌّ منها، وتُسوّى في دفاتر كل فرع.
 */
export default function ExpensesPage({ canManage }) {
  const [period, setPeriod] = useState("mtd");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null); setError("");
    storeApi.fetchExpensesMatrix(period).then(setData).catch(() => setError("تعذّر تحميل المصروفات"));
  }, [period]);

  const branches = data?.branches || [];
  const max = Math.max(1, ...branches.map((b) => b.total));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Receipt size={20} className="text-amber-500" />
          <h2 className="text-lg font-semibold">مصروفات الفروع</h2>
        </div>
        <div className="flex gap-1 bg-neutral-800/60 rounded-lg p-1">
          {PERIODS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setPeriod(id)}
              className={`px-2.5 py-1 rounded-md text-xs ${period === id ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"}`}>{label}</button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
      {!data && !error && <div className="text-neutral-400 text-sm">جارِ التحميل…</div>}

      {data && (
        <>
          <div className="rounded-xl border border-amber-500/30 bg-neutral-900 p-4">
            <div className="text-xs text-neutral-400">إجمالي مصروفات المنشأة · من {data.from}</div>
            <div className="text-2xl font-bold tabular-nums">{fmt(data.grand)}</div>
            <div className="space-y-1.5 pt-3">
              {branches.map((b) => (
                <div key={b.id} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate">{b.name}</span>
                  <div className="flex-1 h-2 rounded bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-amber-500/70" style={{ width: `${(b.total / max) * 100}%` }} />
                  </div>
                  <span className="w-24 text-end tabular-nums">{fmt(b.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {data.accounts.length === 0 ? (
            <div className="text-neutral-500 text-sm rounded-xl border border-neutral-800 bg-neutral-900 p-4">لا مصروفات في هذه الفترة.</div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-neutral-800/60 text-neutral-400">
                  <tr>
                    <th className="p-2 text-start">الحساب</th>
                    {branches.map((b) => <th key={b.id} className="p-2 text-end">{b.name}</th>)}
                    <th className="p-2 text-end text-amber-400">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((a) => (
                    <tr key={a.code} className="border-t border-neutral-800">
                      <td className="p-2"><span className="font-mono text-neutral-500">{a.code}</span> {a.name}</td>
                      {branches.map((b) => (
                        <td key={b.id} className="p-2 text-end tabular-nums text-neutral-300">{a.byBranch[b.id] ? fmt(a.byBranch[b.id]) : "—"}</td>
                      ))}
                      <td className="p-2 text-end tabular-nums font-semibold">{fmt(a.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <BankFeesDistribution canManage={canManage} />
    </div>
  );
}

function BankFeesDistribution({ canManage }) {
  const [period, setPeriod] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    setData(null); setError("");
    storeApi.fetchBankFeesAll(period).then(setData).catch((e) => setError(hqError(e, "تعذّر تحميل عمولات الشبكة")));
  }, [period]);
  useEffect(load, [load]);

  const rows = data?.branches || [];
  const total = data?.recordedTotal || 0;
  const a = Number(actual) || 0;
  const pending = rows.filter((r) => r.recorded > 0 && !r.settled);

  const distribute = async () => {
    if (!(a >= 0) || actual === "") return;
    if (!window.confirm(`توزيع عمولة ${fmt(a)} على الفروع بنسبة المسجّل وتسويتها في دفاترها؟`)) return;
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await storeApi.distributeBankFees(period, a, note.trim());
      const failed = r.results.filter((x) => x.error);
      setMsg(`وُزّعت على ${r.results.filter((x) => x.adjustment).length} فرع${failed.length ? ` · تعذّر ${failed.length}: ${failed.map((f) => `${f.name} (${hqError({ body: { error: f.error } }, f.error)})`).join("، ")}` : ""}`);
      setActual(""); setNote("");
      load();
    } catch (e) {
      setError(hqError(e, "تعذّر التوزيع"));
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Landmark size={15} className="text-amber-500" /> عمولة البنك — توزيعٌ مركزي</h3>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value || thisMonth())} dir="ltr"
          className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" />
      </div>
      <p className="text-[11px] text-neutral-500">
        كشف بنكٍ واحد للمنشأة: أدخل العمولة الفعلية للشهر فتُوزَّع على الفروع بنسبة ما سجّله كلٌّ منها على حساب عمولة الشبكة، ويُسوّى الفرق في دفاتر كل فرع (خصمٌ أو ردٌّ على الشبكة).
      </p>
      {error && <div className="text-xs text-red-400">{error}</div>}
      {msg && <div className="text-xs text-emerald-400">{msg}</div>}
      {!data ? (
        <div className="text-xs text-neutral-500">جارِ التحميل…</div>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-neutral-400">
            <tr><th className="p-1.5 text-start">الفرع</th><th className="p-1.5 text-end">المسجّل</th><th className="p-1.5 text-end">نصيبه</th><th className="p-1.5 text-end">الحالة</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const share = total > 0 && actual !== "" && !r.settled ? (a * r.recorded) / total : null;
              return (
                <tr key={r.branchId} className="border-t border-neutral-800">
                  <td className="p-1.5">{r.name}</td>
                  <td className="p-1.5 text-end tabular-nums">{fmt(r.recorded)}</td>
                  <td className="p-1.5 text-end tabular-nums text-amber-400">{share != null && r.recorded > 0 ? fmt(share) : "—"}</td>
                  <td className="p-1.5 text-end">
                    {r.settled ? <span className="text-emerald-400">سُوّيت {fmt(r.settled.actual)} (فرق {fmt(r.settled.diff)})</span>
                      : r.recorded > 0 ? <span className="text-amber-300">بانتظار</span> : <span className="text-neutral-600">لا عمولة</span>}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-neutral-700 font-semibold">
              <td className="p-1.5">الإجمالي</td><td className="p-1.5 text-end tabular-nums">{fmt(total)}</td><td colSpan={2} />
            </tr>
          </tbody>
        </table>
      )}
      {canManage && data && pending.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
          <input inputMode="decimal" value={actual} onChange={(e) => setActual(e.target.value.replace(/[^\d.]/g, ""))} placeholder="العمولة الفعلية من الكشف"
            className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)"
            className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" />
          <button type="button" onClick={distribute} disabled={busy || actual === ""}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950">وزّع وسوِّ</button>
        </div>
      )}
    </div>
  );
}
