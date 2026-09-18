import { useCallback, useEffect, useState } from "react";
import { storeApi } from "../core/api.js";

const numberFmt = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

function fmt(n) {
  return numberFmt.format(Number(n) || 0);
}

/** الشهر الحالي بصيغة YYYY-MM (نفس افتراض الباك إند إن لم يُحدَّد period). */
function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export default function ReportPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback((p) => {
    setLoading(true);
    setError("");
    storeApi
      .fetchReport(p)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => {
        setError("تعذّر تحميل التقرير");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load(period);
  }, [load, period]);

  const totals = report?.totals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">التقرير المجمّع لكل الفروع</h2>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value || currentPeriod())}
          className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          dir="ltr"
        />
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="text-neutral-400 text-sm">جارِ التحميل…</div>
      ) : (
        <>
          {totals && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="صافي المبيعات" value={fmt(totals.salesNet)} />
              <StatCard label="تكلفة المشتريات" value={fmt(totals.purchasesCost)} />
              <StatCard label="وزن المخزون (عيار 24)" value={`${fmt(totals.inventoryFineWeight)} جم`} />
              <StatCard label="رصيد الخزنة (نقدًا)" value={fmt(totals.safeCash)} />
              <StatCard label="رصيد الخزنة (شبكة)" value={fmt(totals.safeNetwork)} />
              <StatCard label="ذهب الخزنة (عيار 24)" value={`${fmt(totals.safeGoldFineWeight)} جم`} />
              <StatCard label="ذمم مدينة" value={fmt(totals.receivable)} />
              <StatCard label="ذمم دائنة" value={fmt(totals.payable)} />
            </div>
          )}

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-400 text-xs border-b border-neutral-800">
                  <th className="text-start px-4 py-2.5 font-medium">الفرع</th>
                  <th className="text-start px-4 py-2.5 font-medium">مبيعات (صافي)</th>
                  <th className="text-start px-4 py-2.5 font-medium">مشتريات</th>
                  <th className="text-start px-4 py-2.5 font-medium">مخزون (عيار 24)</th>
                  <th className="text-start px-4 py-2.5 font-medium">خزنة (نقد/شبكة)</th>
                  <th className="text-start px-4 py-2.5 font-medium">مدين/دائن</th>
                </tr>
              </thead>
              <tbody>
                {report?.branches?.map((b) => (
                  <tr key={b.branchId} className="border-b border-neutral-800/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{b.branchName}</div>
                      <div className="text-xs text-neutral-500 font-mono">{b.branchRef}</div>
                    </td>
                    <td className="px-4 py-2.5">{fmt(b.sales.net)}</td>
                    <td className="px-4 py-2.5">{fmt(b.purchases.cost)}</td>
                    <td className="px-4 py-2.5">{fmt(b.inventory.fineWeight)} جم</td>
                    <td className="px-4 py-2.5">
                      {fmt(b.safe.cash)} / {fmt(b.safe.network)}
                    </td>
                    <td className="px-4 py-2.5">
                      {fmt(b.receivable)} / {fmt(b.payable)}
                    </td>
                  </tr>
                ))}
                {report?.branches?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                      لا توجد فروع بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-1">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
