import { useCallback, useEffect, useState } from "react";
import { LineChart } from "lucide-react";
import { storeApi } from "../core/api.js";

const numberFmt = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

function fmt(n) {
  return numberFmt.format(Number(n) || 0);
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

const METRICS = {
  sales30: { label: "مبيعات الشهر", get: (r) => r.sales30, fmt: (v) => fmt(v) },
  growth: { label: "النمو عن الشهر السابق", get: (r) => r.growth ?? -999, fmt: (v) => (v === -999 ? "—" : `${v > 0 ? "+" : ""}${v}٪`) },
  turnover: { label: "دوران المخزون", get: (r) => r.turnover, fmt: (v) => `${v}×`, hint: "كم مرةً خرج المخزون هذا الشهر — بالوزن" },
  perStaff: { label: "مبيعات لكل موظف", get: (r) => r.perStaff, fmt: (v) => fmt(v) },
  creditOutstanding: { label: "الآجل هذا الشهر", get: (r) => -(r.creditOutstanding || 0), fmt: (v) => fmt(-v), invert: true, hint: "الأقلّ أفضل" },
};

/**
 * التحليلات المقارنة — نظير HqAnalytics.js في المرجع، لكن حيّة بالكامل
 * عبر GET /store/analytics (لا "لقطات" مستوردة يدويًّا). راجع
 * src/domain/analyticsReport.js في الباك إند لمصدر كل رقم هنا.
 */
export default function AnalyticsPage() {
  const [period] = useState(currentPeriod());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState("sales30");

  const load = useCallback(() => {
    setError("");
    storeApi
      .fetchAnalytics(period)
      .then(setData)
      .catch(() => setError("تعذّر تحميل التحليلات"));
  }, [period]);

  useEffect(load, [load]);

  if (error) {
    return <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>;
  }
  if (!data) {
    return <div className="text-neutral-400 text-sm">جارِ التحميل…</div>;
  }

  const rows = data.branches || [];
  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <Header />
        <div className="text-neutral-500 text-sm rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          لا فروع مسجّلة بعد.
        </div>
      </div>
    );
  }

  const M = METRICS[metric];
  const sorted = [...rows].sort((a, b) => M.get(b) - M.get(a));
  const max = Math.max(...sorted.map((r) => Math.abs(M.get(r))), 1);

  return (
    <div className="space-y-5">
      <Header />

      {/* ── الترتيب بمقياس ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {Object.entries(METRICS).map(([id, m]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMetric(id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              metric === id ? "bg-amber-500 text-neutral-950" : "bg-neutral-800 text-neutral-300 hover:text-neutral-100"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {M.hint && <p className="text-xs text-neutral-500">⚠ {M.hint}</p>}

      <div className="space-y-2">
        {sorted.map((r, i) => {
          const v = M.get(r);
          const pct = Math.round((Math.abs(v) / max) * 100);
          const good = i < sorted.length / 2;
          return (
            <div key={r.branchId} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-neutral-500">{i + 1}</span>
                <span className="text-sm font-medium flex-1 truncate">{r.branchName}</span>
                <span className={`text-sm font-bold tabular-nums ${good ? "text-emerald-400" : "text-neutral-300"}`}>
                  {M.fmt(v)}
                </span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${good ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${pct}%`, opacity: 0.8 }}
                />
              </div>
              {metric === "sales30" && r.growth !== null && (
                <p className={`text-[11px] mt-1.5 ${r.growth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {r.growth >= 0 ? "▲" : "▼"} {Math.abs(r.growth)}٪ عن الشهر السابق ({fmt(r.salesPrev30)})
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── طرق الدفع ── */}
      {data.byMethod?.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-300">طرق الدفع — كل الفروع</h3>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2.5">
            {data.byMethod.map((m) => (
              <div key={m.method}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-neutral-300">{m.method}</span>
                  <span className="font-medium tabular-nums">{fmt(m.total)} · {m.pct}٪</span>
                </div>
                <div className="h-1 bg-neutral-800 rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.method === "آجل" ? "bg-red-500" : "bg-amber-500"}`}
                    style={{ width: `${m.pct}%`, opacity: 0.8 }}
                  />
                </div>
              </div>
            ))}
            {data.byMethod.find((m) => m.method === "آجل")?.pct > 35 && (
              <p className="text-xs text-red-400 leading-6">
                ⚠ الآجل {data.byMethod.find((m) => m.method === "آجل").pct}٪ من المبيعات —
                أكثر من ثلث البضاعة تخرج بلا نقد.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── تركيبة المخزون ── */}
      {data.byKarat?.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-300">المخزون بالعيار — كل الفروع</h3>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-1.5">
            {data.byKarat.map((k) => (
              <div key={k.karat} className="flex items-baseline justify-between text-sm">
                <span className="text-neutral-400">عيار {k.karat}</span>
                <span className="tabular-nums">{fmt(k.weight)} جم · {k.pct}٪</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── أعلى البائعين ── */}
      {data.topSellers?.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-300">أعلى البائعين — هذا الشهر</h3>
          <div className="space-y-1.5">
            {data.topSellers.map((s, i) => (
              <div key={`${s.sellerName}-${s.branchId}`} className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
                <span className="text-xs text-neutral-500">{i + 1}</span>
                <span className="font-medium flex-1 truncate">{s.sellerName}</span>
                <span className="text-xs text-neutral-500">{s.branchName}</span>
                <span className="text-amber-400 font-semibold tabular-nums">{fmt(s.total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <LineChart size={20} className="text-amber-500" />
      <h2 className="text-lg font-semibold">التحليلات</h2>
    </div>
  );
}
