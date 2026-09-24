import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Store, Trash2, X } from "lucide-react";
import { storeApi, ApiError } from "../core/api.js";
import BranchStaffSection from "./BranchStaffSection.jsx";
import BranchLinkCard from "./BranchLinkCard.jsx";
import BranchLockCard from "./BranchLockCard.jsx";

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
export default function BranchDetailPage({ branchId, branchName, canManageBranches, onBack, onDeleted }) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branch, setBranch] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

          {canManageBranches && <BranchLinkCard branchRef={branch.branchRef} />}
          {canManageBranches && <BranchLockCard branchId={branchId} />}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

          <BranchStaffSection branchId={branchId} canManage={canManageBranches} />

          {canManageBranches && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-red-400">منطقة الخطر</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  حذف هذا الفرع يخفيه من كل القوائم والتقارير ويمنع تسجيل الدخول إليه فورًا — بياناته (المبيعات والمخزون والمحاسبة) تبقى محفوظة ولا تُفقد.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-sm font-medium px-3 py-1.5 transition-colors"
              >
                <Trash2 size={15} />
                حذف الفرع
              </button>
            </div>
          )}
        </>
      )}

      {showDeleteModal && (
        <DeleteBranchModal
          branchName={branch?.branchName || branchName || "الفرع"}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            setShowDeleteModal(false);
            onDeleted ? onDeleted() : onBack?.();
          }}
          deleteFn={() => storeApi.deleteBranch(branchId)}
        />
      )}
    </div>
  );
}

/**
 * ⚠ تأكيدٌ بكتابة كلمة "DELETE" حرفيًّا (لا زر تأكيد بسيط) — إجراءٌ
 * هدّامٌ يخفي فرعًا كاملًا من كل مكان فورًا (راجع تعليق DELETE
 * /store/branches/:branchId في الباك إند لسبب اختيار هذا النمط
 * تحديدًا). الفحص الحقيقي من الخادم دائمًا (deleteBranch يرسل confirm
 * ثابتًا) — هذا الحقل هنا لمنع ضغطة/نقرة خاطئة من المستخدم نفسه، لا
 * بديلًا عن ذلك الفحص.
 */
function DeleteBranchModal({ branchName, onClose, onDeleted, deleteFn }) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = confirmText.trim() === "DELETE";

  async function handleConfirm() {
    if (!canSubmit || busy) return;
    setError("");
    setBusy(true);
    try {
      await deleteFn();
      onDeleted();
    } catch (err) {
      setError(deleteBranchErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-neutral-900 border border-red-900/60 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-red-400">حذف فرع "{branchName}"</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="text-sm text-neutral-300 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 space-y-1.5">
          <p>هذا الفرع سيختفي فورًا من كل القوائم والتقارير، ولن يستطيع أي موظفٍ فيه تسجيل الدخول بعد الآن.</p>
          <p className="text-neutral-500">بياناته المحاسبية (المبيعات، المخزون، الخزنة...) لا تُحذف — يمكن لدعم أوقية استعادة الفرع لاحقًا عند الحاجة.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-neutral-300">
            اكتب <span dir="ltr" className="font-mono text-red-400">DELETE</span> للتأكيد
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            dir="ltr"
            autoFocus
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="DELETE"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit || busy}
          className="w-full rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 text-sm transition-colors"
        >
          {busy ? "جارِ الحذف…" : "حذف الفرع نهائيًا من القوائم"}
        </button>
      </div>
    </div>
  );
}

function deleteBranchErrorMessage(err) {
  if (!(err instanceof ApiError)) return "تعذّر حذف الفرع";
  switch (err.body?.error) {
    case "cannot_delete_hq_branch":
      return "لا يمكن حذف الفرع الرئيسي";
    case "branch_not_found":
      return "الفرع غير موجود (قد يكون محذوفًا بالفعل)";
    case "confirmation_required":
      return "التأكيد غير مطابق";
    case "cannot_manage_branches":
      return "لا تملك صلاحية حذف الفروع";
    default:
      return "تعذّر حذف الفرع";
  }
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
