import { useEffect, useState } from "react";
import { BarChart3, Building2, Check, ChevronLeft, Send, Wallet, Warehouse, X } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqNowTasks, hqSell24 } from "../core/design.js";

/// الرئيسية بالتصميم البسيط (المرجع 2026-09-27): صفحةٌ واحدة بلا تبويبات —
///   ① أسعار العيارات ② ذهب الفروع المملوك ③ ما ينتظر ④ الفروع ← الاعتمادات ← الشحن والتكويد ⑤ المال · التقارير.
///   كل زرٍّ يفتح ورقةً بملحقاته؛ وما لا يملكه المستخدم يسقط.
const C = {
  bg: "#1B1A17", panel: "#25231F", field: "#2C2A25", line: "#332F28", text: "#F1ECE2", text2: "#B5AD9E", text3: "#8F887A",
  accent: "#D9B566", accentText: "#E4C47D", accentBg: "#2E2A20", accentLine: "#4D4230", bad: "#E38B76", badBg: "#2E1F1B", badLine: "#4D302A",
  grad: "linear-gradient(135deg, #E6C77E, #BF9848)", shadow: "0 1px 0 rgba(255,255,255,.03) inset, 0 12px 28px -16px rgba(0,0,0,.7)",
};
const TONE = { central: ["#E5A276", "#36271D"], accounting: ["#A5A9E0", "#252739"], inventory: ["#8FB3E0", "#1F2A38"], money: ["#8ACB9F", "#1E2F24"], reports: ["#86C6D6", "#1C2E33"] };
const PURITY = { 24: 1, 22: 0.916, 21: 0.875, 18: 0.75 };
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const wf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3, minimumFractionDigits: 3 });

const LAYOUT = {
  big: [
    { key: "branches", title: "الفروع", hint: "عرض · تجهيز · صلاحيات", icon: Building2, tone: "central",
      items: [["branches", "إدارة الفروع والجرد عن بُعد"], ["dashboard", "لوحة الإدارة"], ["policy", "الصلاحيات"], ["org", "الهيكل الإداري"], ["users", "الموظفون"]] },
    { key: "approvals", title: "الاعتمادات", hint: "طلبات الفروع", icon: Check, tone: "accounting",
      items: [["approvals", "طلبات الفروع وسياسة الاعتماد"]] },
    { key: "ship", title: "الشحن والتكويد", hint: "بضاعة · نقد · معاملات", icon: Send, tone: "inventory",
      items: [["hqDocs", "معاملات الإدارة والشحن للفروع"]] },
  ],
  small: [
    { key: "money", title: "المال", icon: Wallet, tone: "money",
      items: [["expenses", "المصروفات وعمولة البنك"], ["fiscal", "السنة المالية وإقفال الأشهر"], ["control", "الأسعار والإعلانات"], ["consolidated", "الميزان الموحّد"]] },
    { key: "reports", title: "التقارير", icon: BarChart3, tone: "reports",
      items: [["report", "التقرير المجمّع"], ["analytics", "التحليلات"], ["consolidated", "الموحّد"], ["zakat", "زكاة الفروع"], ["opsLog", "سجلّ عمليات الإدارة"], ["dashboard", "لوحة الإدارة"]] },
  ],
};

export default function SimpleHqHome({ allowed = [], isOwner = false, onGo, onOpenBranch }) {
  const [report, setReport] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [inbox, setInbox] = useState(0);
  const [sell24, setSell24] = useState(0);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const period = new Date().toISOString().slice(0, 7);
    storeApi.fetchReport(period).then(setReport).catch(() => setReport({ branches: [], totals: {} }));
    storeApi.fetchAlerts().then((d) => setAlerts(d.alerts || [])).catch(() => {});
    storeApi.fetchStoreApprovals().then((d) => setInbox((d.approvals || []).filter((a) => a.status === "pending" && a.approverKind === "hq").length)).catch(() => {});
    storeApi.fetchPricePolicy().then((d) => setSell24(hqSell24(d.policy))).catch(() => {});
  }, []);
  const has = (id) => (id === "dashboard" ? allowed.includes("home") : id === "users" ? isOwner : allowed.includes(id));
  const withRows = (g) => ({ ...g, rows: g.items.filter(([id]) => has(id)) });
  const big = LAYOUT.big.map(withRows).filter((g) => g.rows.length);
  const small = LAYOUT.small.map(withRows).filter((g) => g.rows.length);
  const sheet = open ? [...big, ...small].find((g) => g.key === open) : null;
  const branches = report?.branches || [];
  const fine = branches.reduce((s, b) => s + (Number(b.inventory?.fineWeight) || 0) + (Number(b.safe?.goldFineWeight) || 0), 0);
  const tasks = report ? hqNowTasks({ branches: branches.length, idle: branches.filter((b) => !(b.sales?.count > 0)).length, inbox, alerts }) : [];
  const num = { fontVariantNumeric: "tabular-nums" };
  const badges = { approvals: inbox };
  const card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 20, boxShadow: C.shadow };
  const go = (id) => { setOpen(null); onGo(id); };
  const pickTask = (t) => (t.branchId ? onOpenBranch(t.branchId, t.branchName) : onGo(t.id === "home" ? "dashboard" : t.id));

  return (
    <div className="max-w-xl mx-auto pb-16" style={{ color: C.text }}>
      <div className="mb-3 px-2 py-2.5" style={card}>
        <div className="grid grid-cols-4">
          {[24, 22, 21, 18].map((k, i) => (
            <div key={k} className="text-center" style={{ borderInlineStart: i ? `1px solid ${C.line}` : "none" }}>
              <p style={{ color: C.accentText }} className="text-[11px] font-bold">عيار {k}</p>
              <p style={num} className="text-sm font-extrabold">{sell24 > 0 ? nf.format(sell24 * PURITY[k]) : "—"}</p>
            </div>
          ))}
        </div>
        <p style={{ color: C.text3 }} className="text-[10px] text-center mt-1">سعر البيع للجرام اليوم من سياسة الإدارة · ر.س</p>
      </div>

      <button onClick={() => has("consolidated") && onGo("consolidated")} className="w-full text-right mb-3 px-4 py-3"
        style={{ ...card, background: `linear-gradient(135deg, ${C.accentBg}, ${C.panel} 70%)`, border: `1px solid ${C.accentLine}` }}>
        <div className="flex items-center justify-between">
          <span style={{ color: C.text2 }} className="text-xs font-bold">ذهب الفروع المملوك · صافي عيار 24</span>
          <Warehouse size={14} color={C.accent} />
        </div>
        <p style={{ ...num, margin: "2px 0 6px" }} className="text-3xl font-black">{report ? wf.format(fine) : "…"}<span style={{ color: C.text3, fontSize: 12, marginInlineStart: 6 }}>جم</span></p>
        <div className="flex flex-wrap gap-1.5">
          {[["الفروع", branches.length], ["مشغول", wf.format(branches.reduce((s, b) => s + (Number(b.inventory?.fineWeight) || 0), 0))], ["الخزائن", wf.format(branches.reduce((s, b) => s + (Number(b.safe?.goldFineWeight) || 0), 0))]].map(([l, v]) => (
            <span key={l} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: C.panel, color: C.text2, border: `1px solid ${C.line}`, ...num }}>{l} <b style={{ color: C.text }}>{v}</b></span>
          ))}
        </div>
      </button>

      {tasks.slice(0, 3).map((t, i) => (
        <button key={t.id + i} onClick={() => pickTask(t)} className="w-full text-right flex items-center gap-2 px-3 py-2.5 mb-2"
          style={{ background: t.level === "block" ? C.badBg : C.accentBg, border: `1px solid ${t.level === "block" ? C.badLine : C.accentLine}`, borderRadius: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: t.level === "block" ? C.bad : C.accent }} />
          <span className="text-xs font-bold flex-1">{t.label}</span>
          <span style={{ color: C.text3 }} className="text-[11px] truncate max-w-[45%]">{t.hint}</span>
        </button>
      ))}

      <div className="flex flex-col gap-3 mt-2 mb-3">
        {big.map((g, i) => {
          const Icon = g.icon, hero = i === 0, [fg, bg] = TONE[g.tone];
          return (
            <button key={g.key} onClick={() => setOpen(g.key)} aria-label={g.title} className="w-full flex items-center gap-3 px-4 text-right relative"
              style={{ overflow: "hidden", minHeight: hero ? 104 : 84, borderRadius: 26, boxShadow: C.shadow,
                background: hero ? C.grad : `linear-gradient(120deg, ${bg} 0%, ${C.panel} 85%)`, border: hero ? "none" : `1px solid ${C.line}` }}>
              <span aria-hidden="true" style={{ position: "absolute", insetInlineEnd: -14, bottom: -18, opacity: hero ? 0.13 : 0.07, color: hero ? "#3B2A0A" : fg }}><Icon size={hero ? 118 : 96} /></span>
              <span className="flex items-center justify-center" style={{ width: hero ? 58 : 50, height: hero ? 58 : 50, borderRadius: 18, flexShrink: 0,
                background: hero ? "rgba(255,255,255,.5)" : fg, color: hero ? "#3B2A0A" : C.panel }}><Icon size={hero ? 29 : 24} /></span>
              <span className="flex-1 min-w-0" style={{ position: "relative" }}>
                <span style={{ display: "block", color: hero ? "#2B1F07" : C.text }} className={`${hero ? "text-2xl" : "text-lg"} font-black`}>{g.title}</span>
                <span className="flex flex-wrap gap-1 mt-1">
                  {g.hint.split(" · ").map((h) => <span key={h} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: hero ? "rgba(255,255,255,.45)" : C.panel, color: hero ? "#3B2A0A" : fg }}>{h}</span>)}
                </span>
              </span>
              {badges[g.key] > 0 && <span className="text-[11px] font-bold px-2 rounded-full" style={{ background: C.bad, color: "#fff" }}>{badges[g.key]}</span>}
              <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 99, background: hero ? "rgba(255,255,255,.55)" : C.panel }}><ChevronLeft size={16} color={hero ? "#3B2A0A" : C.text2} /></span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {small.map((g) => {
          const Icon = g.icon, [fg, bg] = TONE[g.tone];
          return (
            <button key={g.key} onClick={() => setOpen(g.key)} aria-label={g.title} className="flex flex-col items-center justify-center gap-2 py-4 px-2 relative"
              style={{ ...card, borderRadius: 22, minHeight: 104, overflow: "hidden" }}>
              <span aria-hidden="true" style={{ position: "absolute", top: 0, insetInline: 22, height: 3, borderRadius: 3, background: fg, opacity: 0.7 }} />
              <span className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 16, background: bg, color: fg }}><Icon size={22} /></span>
              <span className="text-sm font-extrabold">{g.title}</span>
            </button>
          );
        })}
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setOpen(null)}>
          <div className="w-full max-w-xl rounded-t-3xl p-5" style={{ background: C.panel, border: `1px solid ${C.line}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{sheet.title}</h2>
              <button onClick={() => setOpen(null)} aria-label="إغلاق"><X size={20} color={C.text2} /></button>
            </div>
            <div className="flex flex-col gap-2 pb-2">
              {sheet.rows.map(([id, label], i) => {
                const [fg, bg] = TONE[sheet.tone], Icon = sheet.icon, lead = i === 0;
                return (
                  <button key={id + i} onClick={() => go(id)} className="w-full flex items-center gap-3 px-3 py-3 text-right"
                    style={{ borderRadius: 16, background: lead ? bg : C.field, border: `1px solid ${lead ? fg : C.line}` }}>
                    <span className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 12, background: lead ? fg : C.panel, color: lead ? C.panel : fg }}><Icon size={18} /></span>
                    <span className={`text-sm flex-1 ${lead ? "font-black" : "font-bold"}`}>{label}</span>
                    <ChevronLeft size={15} color={C.text3} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
