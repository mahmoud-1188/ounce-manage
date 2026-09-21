import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Send, X } from "lucide-react";
import { storeApi, ApiError } from "../core/api.js";

const numberFmt = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });
function fmt(n) {
  return numberFmt.format(Number(n) || 0);
}

const STATUS_STYLE = {
  pending: { label: "بانتظار القرار", cls: "text-amber-400" },
  approved: { label: "معتمد — بانتظار الاستلام", cls: "text-emerald-400" },
  rejected: { label: "مرفوض", cls: "text-red-400" },
  received: { label: "منفَّذ", cls: "text-neutral-400" },
};

/**
 * "معاملات الإدارة" (hqDocs) من جهة المركزي — نظير القسم المقابل من
 * HqConsolePage.js في المرجع، لكن حيّ بالكامل عبر /store/hq-transactions
 * (لا نصوصًا مُلصقة يدويًّا). راجع تعليق migration
 * 027_hq_transactions.sql للسبب الكامل.
 *
 * ⚠ goods_from_hq وحدها تُنشأ من هنا (شحنة تكويد للفرع) — الخمسة الباقية
 * يبدؤها الفرع دائمًا وتصل هنا فقط لاعتماد/رفض أو تأكيد استلام.
 */
export default function HqDocsPage({ storeUser }) {
  const [txns, setTxns] = useState(null);
  const [error, setError] = useState("");
  const [showShip, setShowShip] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setError("");
    storeApi
      .fetchHqTransactions()
      .then(setTxns)
      .catch(() => setError("تعذّر تحميل معاملات الإدارة"));
  }, []);

  useEffect(load, [load]);

  const canSendCoding = storeUser?.role === "owner" || !!storeUser?.canSendCoding;
  const canManage = storeUser?.role === "owner" || !!storeUser?.canManageBranches;

  async function decide(id, decision) {
    setBusyId(id);
    try {
      await storeApi.decideHqTransaction(id, decision);
      load();
    } catch {
      setError("تعذّر تسجيل القرار");
    } finally {
      setBusyId(null);
    }
  }

  async function receive(id) {
    setBusyId(id);
    try {
      await storeApi.receiveHqTransaction(id);
      load();
    } catch {
      setError("تعذّر تسجيل الاستلام");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-amber-500" />
          <h2 className="text-lg font-semibold">معاملات الإدارة</h2>
        </div>
        {canSendCoding && (
          <button
            type="button"
            onClick={() => setShowShip(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-medium px-3 py-1.5 transition-colors"
          >
            <Send size={16} />
            شحنة تكويد لفرع
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>
      )}

      {txns === null && !error ? (
        <div className="text-neutral-400 text-sm">جارِ التحميل…</div>
      ) : (
        <div className="space-y-2">
          {txns?.map((t) => (
            <div key={t.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.flowLabel}</div>
                  <div className="text-xs text-neutral-500 truncate">{t.branchName}</div>
                </div>
                <span className={`text-xs font-medium shrink-0 ${STATUS_STYLE[t.status]?.cls || "text-neutral-400"}`}>
                  {STATUS_STYLE[t.status]?.label || t.status}
                </span>
              </div>
              <div className="text-xs text-neutral-500 mt-1.5">
                {t.weight ? `${fmt(t.weight)} جم عيار ${t.karat}` : ""}
                {t.pieces ? ` · ${t.pieces} قطعة` : ""}
                {t.amount ? `${t.weight ? " · " : ""}${fmt(t.amount)}` : ""}
              </div>
              {t.note && <div className="text-xs text-neutral-500 mt-1">{t.note}</div>}

              {canManage && t.status === "pending" && t.dir === "branch" && (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => decide(t.id, "approved")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-900"
                  >
                    <CheckCircle2 size={12} /> اعتماد
                  </button>
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => decide(t.id, "rejected")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-red-950/40 text-red-400 border border-red-900"
                  >
                    <X size={12} /> رفض
                  </button>
                </div>
              )}
              {canManage && t.status === "approved" && (t.flow === "goods_to_hq" || t.flow === "taskir_to_hq" || t.flow === "cash_transfer") && (
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => receive(t.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30"
                >
                  <CheckCircle2 size={12} /> تأكيد الاستلام
                </button>
              )}
            </div>
          ))}
          {txns?.length === 0 && (
            <div className="text-neutral-500 text-sm">لا معاملات بعد.</div>
          )}
        </div>
      )}

      {showShip && (
        <ShipCodingModal onClose={() => setShowShip(false)} onCreated={() => { setShowShip(false); load(); }} />
      )}
    </div>
  );
}

function ShipCodingModal({ onClose, onCreated }) {
  const [branches, setBranches] = useState(null);
  const [branchId, setBranchId] = useState("");
  const [weight, setWeight] = useState("");
  const [karat, setKarat] = useState("21");
  const [pieces, setPieces] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    storeApi.fetchBranches().then((rows) => {
      setBranches(rows);
      if (rows[0]) setBranchId(rows[0].id);
    }).catch(() => setError("تعذّر تحميل الفروع"));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await storeApi.createHqShipment({
        branchId,
        weight: Number(weight),
        karat: Number(karat),
        pieces: Number(pieces),
        note,
      });
      onCreated();
    } catch (err) {
      setError(shipErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <form onSubmit={submit} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">شحنة تكويد لفرع</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-neutral-300">الفرع</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <NumField label="الوزن (جم)" value={weight} onChange={setWeight} step="0.001" />
        <div className="space-y-1.5">
          <label className="text-sm text-neutral-300">العيار</label>
          <select
            value={karat}
            onChange={(e) => setKarat(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {[24, 22, 21, 18, 14].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <NumField label="عدد القطع" value={pieces} onChange={setPieces} />
        <div className="space-y-1.5">
          <label className="text-sm text-neutral-300">ملاحظة (اختياري)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}

        <button
          type="submit"
          disabled={busy || !branchId}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950 font-medium py-2 text-sm transition-colors"
        >
          {busy ? "جارِ الإرسال…" : "إرسال الشحنة"}
        </button>
      </form>
    </div>
  );
}

function NumField({ label, value, onChange, step }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-neutral-300">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  );
}

function shipErrorMessage(err) {
  if (!(err instanceof ApiError)) return "تعذّر إرسال الشحنة";
  switch (err.body?.error) {
    case "cannot_send_coding":
      return "لا تملك صلاحية إرسال تكويد";
    case "branch_not_found":
      return "الفرع غير موجود";
    case "missing_field":
      return `أدخل ${err.body?.fieldLabel || "الحقل المطلوب"}`;
    default:
      return "تعذّر إرسال الشحنة";
  }
}
