import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { storeApi } from "../core/api.js";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => (n == null || n === "" ? "—" : money.format(Number(n) || 0));
const dt = (v) => (v ? new Date(v).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—");

const POOL = { safe: "الخزنة", daily: "اليومي", custody: "العهدة" };
const METHOD = { cash: "نقدي", network: "شبكة", credit: "آجل", mixed: "مختلط", transfer: "تحويل" };
const DIR = { in: "وارد", out: "صادر" };
const ROLE = { manager: "مدير", assistant: "مساعد", employee: "موظف" };
const SRC = { safe_cash: "خزنة نقدي", safe_network: "خزنة شبكة", daily_cash: "يومي نقدي", daily_network: "يومي شبكة", custody_cash: "عهدة", credit: "آجل" };
const src = (v) => SRC[v] || METHOD[v] || POOL[v] || v || "—";

const KINDS = [
  { id: "sales", label: "المبيعات", cols: [["ref", "الرقم"], ["at", "التاريخ", dt], ["party", "العميل"], ["method", "الدفع", (v) => METHOD[v] || v], ["amount", "المبلغ", fmt], ["by", "البائع"]] },
  { id: "returns", label: "المرتجعات", cols: [["ref", "الرقم"], ["at", "التاريخ", dt], ["party", "العميل"], ["method", "من", src], ["amount", "المبلغ", fmt], ["note", "السبب"]] },
  { id: "cash", label: "الصندوق", cols: [["at", "التاريخ", dt], ["pool", "الصندوق", (v) => POOL[v] || v], ["method", "الطريقة", (v) => METHOD[v] || v], ["direction", "الاتجاه", (v) => DIR[v] || v], ["amount", "المبلغ", fmt], ["category", "البند"], ["note", "ملاحظة"]] },
  { id: "purchases", label: "المشتريات", cols: [["ref", "الرقم"], ["at", "التاريخ", dt], ["party", "المورد"], ["method", "الدفع", (v) => METHOD[v] || v], ["weight", "الوزن", fmt], ["amount", "الإجمالي", fmt], ["invoice_pending", "الفاتورة", (v) => (v ? "معلّقة" : "✓")]] },
  { id: "expenses", label: "المصروفات", cols: [["ref", "الرقم"], ["at", "التاريخ", dt], ["party", "البيان"], ["category", "البند"], ["method", "من", src], ["amount", "المبلغ", fmt], ["note", "ملاحظة"]] },
  { id: "receipts", label: "السندات", cols: [["ref", "الرقم"], ["at", "التاريخ", dt], ["party", "العميل"], ["method", "الطريقة", (v) => METHOD[v] || v], ["amount", "المبلغ", fmt], ["note", "ملاحظة"]] },
  { id: "scrap", label: "الكسر", cols: [["ref", "الرقم"], ["at", "التاريخ", dt], ["party", "البيان"], ["weight", "الوزن", fmt], ["karat", "العيار"], ["stage", "المرحلة"], ["amount", "المدفوع", fmt]] },
  { id: "users", label: "المستخدمون", cols: [["name", "الاسم"], ["ref", "الرقم"], ["role", "الدور", (v) => ROLE[v] || v], ["active", "الحالة", (v) => (v ? "نشط" : "معطّل")], ["salary", "الراتب", fmt], ["at", "أُضيف", dt]] },
];

/** دفاتر الفرع — تصفّحٌ للقراءة فقط لآخر ٢٠٠ حركة في كل دفتر. */
export default function BranchBooksCard({ branchId }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("sales");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setRows(null); setError("");
    storeApi.fetchBranchBooks(branchId, kind).then((d) => setRows(d.rows || [])).catch(() => setError("تعذّر تحميل الدفتر"));
  }, [open, kind, branchId]);

  const def = KINDS.find((k) => k.id === kind);
  const shown = (rows || []).filter((r) => !q || Object.values(r).some((v) => String(v ?? "").includes(q)));
  const sum = shown.reduce((a, r) => a + (Number(r.amount) || 0), 0);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2">
        <BookOpen size={15} className="text-amber-500" />
        <span className="text-sm font-medium flex-1 text-start">دفاتر الفرع</span>
        <span className="text-[11px] text-neutral-500">للقراءة</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <>
          <div className="flex gap-1 overflow-x-auto bg-neutral-800/60 rounded-lg p-1">
            {KINDS.map((k) => (
              <button key={k.id} type="button" onClick={() => setKind(k.id)}
                className={`px-2.5 py-1 rounded-md text-xs shrink-0 ${kind === k.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"}`}>{k.label}</button>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في الدفتر"
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs" />
          {error && <div className="text-xs text-red-400">{error}</div>}
          {rows === null && !error ? <div className="text-xs text-neutral-500">جارِ التحميل…</div> : shown.length === 0 ? (
            <div className="text-xs text-neutral-500">لا سجلات.</div>
          ) : (
            <div className="max-h-96 overflow-auto rounded-lg border border-neutral-800">
              <table className="w-full text-[11px] whitespace-nowrap">
                <thead className="bg-neutral-800/80 text-neutral-400 sticky top-0">
                  <tr>{def.cols.map(([k, l]) => <th key={k} className="p-1.5 text-start">{l}</th>)}</tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => (
                    <tr key={r.ref || i} className="border-t border-neutral-800">
                      {def.cols.map(([k, , f]) => <td key={k} className="p-1.5 text-neutral-300">{f ? f(r[k]) : (r[k] ?? "—")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows && kind !== "users" && <div className="text-[11px] text-neutral-500">{shown.length} سجل{def.cols.some(([k]) => k === "amount") ? ` · المجموع ${fmt(sum)}` : ""}</div>}
        </>
      )}
    </div>
  );
}
