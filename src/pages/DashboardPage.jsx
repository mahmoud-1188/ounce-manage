import { useCallback, useEffect, useState } from "react";
import { LayoutDashboard, TrendingUp } from "lucide-react";
import { storeApi } from "../core/api.js";
import AlertsCard from "./AlertsCard.jsx";

const numberFmt = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

function fmt(n) {
  return numberFmt.format(Number(n) || 0);
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * لوحة الرئيسية — أول ما يفتحه صاحب المتجر: "كيف الشركة؟" بنظرة واحدة،
 * ثم فروعه مرتَّبة بمبيعات الشهر، اضغط أيًّا منها لتدخل تفاصيله.
 *
 * ⚠ نظير HqDashboard.js في المرجع، لكن مبنيّة على نفس /store/report
 * الحيّ (لا "لقطات" مستوردة يدويًّا) — نفس البيانات التي تعرضها
 * ReportPage.jsx بالضبط، معروضة هنا بترتيب وتجميع مختلفين لغرض مختلف:
 * "من الأفضل والأسوأ أداءً هذا الشهر؟" بدل "أعطني كل الأرقام في جدول".
 */
export default function DashboardPage({ onOpenBranch, onOpenApprovals }) {
  const [period] = useState(currentPeriod());
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    storeApi
      .fetchReport(period)
      .then(setReport)
      .catch(() => setError("تعذّر تحميل بيانات الرئيسية"));
  }, [period]);

  useEffect(load, [load]);

  const totals = report?.totals;
  const branches = report?.branches || [];
  const ranked = [...branches].sort((a, b) => (b.sales?.net || 0) - (a.sales?.net || 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LayoutDashboard size={20} className="text-amber-500" />
        <h2 className="text-lg font-semibold">الرئيسية</h2>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!report && !error ? (
        <div className="text-neutral-400 text-sm">جارِ التحميل…</div>
      ) : (
        <>
          {/* ── المركز المجمّع ── */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 space-y-2">
            <div className="text-xs text-amber-400 font-medium">
              {branches.length} فرعًا · الشهر الحالي
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {fmt(totals?.salesNet)} <span className="text-sm font-medium text-neutral-400">صافي مبيعات الشهر</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <MiniStat label="وزن المخزون (ع24)" value={`${fmt(totals?.inventoryFineWeight)} جم`} />
              <MiniStat label="ذمم مدينة" value={fmt(totals?.receivable)} tone="good" />
              <MiniStat label="ذمم دائنة" value={fmt(totals?.payable)} tone="bad" />
              <MiniStat label="خزنة (نقد+شبكة)" value={fmt((totals?.safeCash || 0) + (totals?.safeNetwork || 0))} />
            </div>
          </div>

          <AlertsCard onOpenBranch={onOpenBranch} onOpenApprovals={onOpenApprovals} />

          {/* ⚠ الذمم مقابل المبيعات: رقمٌ وحده لا يُقلق، ونسبته تُقلق. */}
          {totals?.receivable > totals?.salesNet && totals?.salesNet > 0 && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              ⚠ الذمم المدينة ({fmt(totals.receivable)}) تفوق صافي مبيعات الشهر ({fmt(totals.salesNet)}) —
              رأس مالٍ عند العملاء أكثر ممّا يدور في المتجر.
            </div>
          )}

          {/* ── الفروع مرتَّبة ── */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-300 flex items-center gap-1.5">
              <TrendingUp size={15} className="text-amber-500" /> الفروع — اضغط فرعًا لتدخله
            </h3>
            <span className="text-xs text-neutral-500">مرتَّبة بمبيعات الشهر</span>
          </div>

          <div className="space-y-2">
            {ranked.map((b, i) => (
              <button
                key={b.branchId}
                type="button"
                onClick={() => onOpenBranch(b.branchId, b.branchName)}
                className="w-full text-start rounded-xl border border-neutral-800 bg-neutral-900 hover:border-amber-500/50 transition-colors p-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{b.branchName}</div>
                    <div className="text-xs text-neutral-500 font-mono">{b.branchRef}</div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="text-amber-400 font-semibold tabular-nums">{fmt(b.sales?.net)}</div>
                    <div className="text-[11px] text-neutral-500">{b.sales?.count || 0} فاتورة</div>
                  </div>
                </div>
              </button>
            ))}
            {ranked.length === 0 && (
              <div className="text-neutral-500 text-sm rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                لا فروع مسجّلة بعد.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const color = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-neutral-100";
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
