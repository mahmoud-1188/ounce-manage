import { useEffect, useState } from "react";
import { storeApi } from "../core/api.js";
import { CashTransferModal, ShipCodingModal } from "./HqDocsPage.jsx";
import { BankFeesDistribution } from "./ExpensesPage.jsx";
import HqPurchaseCard from "./HqPurchaseCard.jsx";
import CapitalDrawCard from "./CapitalDrawCard.jsx";
import RemoteStocktakeCard from "./RemoteStocktakeCard.jsx";
import BranchAccountsCard from "./BranchAccountsCard.jsx";

/**
 * أوامر للفروع (المرجع HqOrdersPanel تحت «التحكّم والإرسال»): كل ما ترسله الإدارة لفرعٍ في مكانٍ واحد —
 * تحويل نقد · شراء على حساب فرع · سحب من رأس مال فرع · مهمّة جرد · تسوية ومراجعة · توزيع عمولة البنك ·
 * بضاعة من الإدارة. كل أمرٍ بطاقةٌ تُفتح بنموذجه، والفرع يُختار مرّةً أعلى الصفحة. النماذج هي نفسها في بطاقة الفرع.
 */
export default function OrdersPanel({ canManage }) {
  const [branches, setBranches] = useState(null);
  const [pick, setPick] = useState("");
  const [open, setOpen] = useState(null);
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    storeApi.fetchBranches().then((d) => setBranches(Array.isArray(d) ? d : d.branches || [])).catch(() => setBranches([]));
  }, []);

  // الفروع العاملة وحدها: لا الفرع الرئيسي (دفتر الإدارة نفسها) ولا المقفل
  const live = (branches || []).filter((b) => b.active !== false && !b.locked && !(b.is_hq || b.isHq));
  const branchId = pick || live[0]?.id || "";
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };

  const picker = (
    <label className="block text-xs text-neutral-400 space-y-1">
      <span>الفرع</span>
      <select value={branchId} onChange={(e) => setPick(e.target.value)} aria-label="الفرع"
        className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-100">
        {!live.length && <option value="">لا فروع عاملة</option>}
        {live.map((b) => <option key={b.id} value={b.id}>{b.name || b.ref}</option>)}
      </select>
    </label>
  );
  const action = (label, onClick) => (
    <button type="button" onClick={onClick} disabled={!canManage}
      className="w-full rounded-lg py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950">{label}</button>
  );

  const rows = [
    { id: "cash", title: "تحويل نقد لفرع", hint: "من الخزنة المركزية — يصل الفرع ويدخل خزنته حين يؤكّد استلامه",
      body: () => action("حوّل ←", () => setModal("cash")) },
    { id: "purchase", title: "شراء على حساب فرع", hint: "الإدارة تشتري والفرع يستلم على حسابه",
      body: () => (<>{picker}{branchId && <HqPurchaseCard key={branchId} branchId={branchId} />}</>) },
    { id: "capitalDraw", title: "سحب من رأس مال فرع", hint: "نقدٌ أو ذهبٌ خام من خزنة الفرع إلى الإدارة — بموافقة مديره",
      body: () => (<>{picker}{branchId && <CapitalDrawCard key={branchId} branchId={branchId} />}</>) },
    { id: "stocktake", title: "مهمّة جرد", hint: "تُعدّ من رفّ الفرع وتصله نتيجتها",
      body: () => (<>{picker}{branchId && <RemoteStocktakeCard key={branchId} branchId={branchId} />}</>) },
    { id: "accounts", title: "تسوية ومراجعة", hint: "قيد تسوية · عكس · حكم مراجعة من حسابات الفرع",
      body: () => (<>{picker}{branchId && <BranchAccountsCard key={branchId} branchId={branchId} canManage={canManage} />}</>) },
    { id: "bankFee", title: "توزيع عمولة البنك", hint: "كشف بنكٍ واحد للمنشأة — تُوزَّع بنسبة ما سجّله كل فرع",
      body: () => <BankFeesDistribution canManage={canManage} /> },
    { id: "goods", title: "بضاعة من الإدارة — مستند", hint: "مستندٌ يؤكّده الفرع حين يستلم",
      body: () => action("أنشئ المستند ←", () => setModal("goods")) },
  ];

  return (
    <div className="space-y-2" data-hq-orders>
      {msg && <div className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">{msg}</div>}
      {branches === null && <div className="text-xs text-neutral-500">جارِ التحميل…</div>}
      {rows.map((r) => (
        <div key={r.id} className={`rounded-xl border bg-neutral-900 p-3 ${open === r.id ? "border-amber-500/40" : "border-neutral-800"}`}>
          <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} className="w-full text-right">
            <div className="text-sm font-semibold text-neutral-100">{r.title}</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">{r.hint}</div>
          </button>
          {open === r.id && <div className="mt-3 space-y-3">{r.body()}</div>}
        </div>
      ))}
      {modal === "cash" && <CashTransferModal toBranchId={branchId} onClose={() => setModal(null)} onCreated={() => { setModal(null); flash("أُرسل التحويل — يدخل خزنة الفرع حين يؤكّد استلامه"); }} />}
      {modal === "goods" && <ShipCodingModal onClose={() => setModal(null)} onCreated={() => { setModal(null); flash("أُرسل المستند للفرع"); }} />}
    </div>
  );
}
