import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Store } from "lucide-react";
import { storeApi } from "../core/api.js";

const numberFmt = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

function fmt(n) {
  return numberFmt.format(Number(n) || 0);
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * تفاصيل فرعٍ واحد — نظير HqBranchDetail.js في المرجع، لكن بلا "لقطة"
 * مستوردة يدويًّا: نفس /store/report الحيّ الذي تعرضه ReportPage.jsx،
 * مفلترًا هنا على فرعٍ بعينه فقط (period قابل للتغيير من هذه الشاشة
 * نفسها لا موروثًا من الرئيسية، لأن من يدقّق فرعًا بعينه قد يريد شهرًا
 * غير الذي كان مفتوحًا في الرئيسية).
 *
 * ⚠ لا "كشف حسابات" كامل بعد (account-by-account ledger) كما في المرجع
 * — ذلك يحتاج مسارًا جديدًا في الباك إند يكشف أرصدة كل حساب لفرعٍ بعينه
 * (consolidatedReport.js الحالي يبني فقط الأرقام المجمّعة هنا)، ولم
 * يُطلب بعد. ما هنا اليوم: كل رقم فعليًّا موجود في التقرير المجمّع
 * الحالي، معروضًا لفرعٍ واحد بدل كل الفروع معًا.
 */
export default function BranchDetailPage({ branchId, branchName, onBack }) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branch, setBranch] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback((p) => {
    setError("");
    setNotFound(false);
    storeApi
      .fetchReport(p)
      .then((data) => {
        const found = (data.branches || []).find((b) => b.branchId === branchId);
        if (!found) setNotFound(true);
        setBranch(found || null);
      })
      .catch(() => setError("تعذّر تحميل تفاصيل الفرع"));
  }, [branchId]);

  useEffect(() => { load(period); }, [load, period]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
      >
        <ArrowRight size={16} /> كل الفروع
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-amber-500" />
          <h2 className="text-lg font-semibold">{branch?.branchName || branchName || "الفرع"}</h2>
        </div>
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

      {notFound && !error && (
        <div className="text-neutral-500 text-sm rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          لا بيانات لهذا الفرع في هذا الشهر.
        </div>
      )}

      {!branch && !error && !notFound && (
        <div className="text-neutral-400 text-sm">جارِ التحميل…</div>
      )}

      {branch && (
        <>
          <div className="text-xs text-neutral-500 font-mono">{branch.branchRef}</div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="مبيعات (صافي)" value={fmt(branch.sales.net)} sub={`${branch.sales.count} فاتورة`} />
            <Stat label="إجمالي المبيعات" value={fmt(branch.sales.total)} />
            <Stat label="مشتريات (تكلفة)" value={fmt(branch.purchases.cost)} sub={`${branch.purchases.count} عملية · ${fmt(branch.purchases.weight)} جم`} />
            <Stat label="مخزون قائم (عيار 24)" value={`${fmt(branch.inventory.fineWeight)} جم`} sub={`تكلفة ${fmt(branch.inventory.cost)}`} />
            <Stat label="خزنة — نقدًا" value={fmt(branch.safe.cash)} />
            <Stat label="خزنة — شبكة" value={fmt(branch.safe.network)} />
            <Stat label="ذهب الخزنة (عيار 24)" value={`${fmt(branch.safe.goldFineWeight)} جم`} />
            <Stat label="ذمم مدينة (عملاء)" value={fmt(branch.receivable)} tone="good" />
            <Stat label="ذمم دائنة (موردون)" value={fmt(branch.payable)} tone="bad" />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }) {
  const color = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-neutral-100";
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-1">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-neutral-500">{sub}</div>}
    </div>
  );
}
