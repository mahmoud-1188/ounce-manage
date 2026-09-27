/// شكل تطبيق الإدارة (المرجع 2026-09-27): «البسيط الداكن» هو الأساسي ما لم يختر المستخدم غيره.
///   البسيط: صفحةٌ واحدة — الأسعار ← ذهب الفروع ← ما ينتظر ← الفروع · الاعتمادات · الشحن والتكويد ← المال · التقارير.
///   المُضيء: الرئيسية المعتادة تبدأ بـ«الآن» (المهامّ بأولويّتها) وضوءٌ حيّ خلف الشاشة.
///   الكلاسيكي: الشكل السابق بتبويباتٍ علوية.
const DESIGNS = {
  simple: { label: "البسيط", hint: "صفحةٌ واحدة — أهمّ الأزرار كبيرة وداخل كلٍّ ملحقاته", bg: "#1B1A17", isNew: true },
  radiant: { label: "المُضيء", hint: "ضوءٌ حيّ — والرئيسية ترتّب مهامّك بأولويّتها الآن", bg: "#090A12", isNew: true },
  classic: { label: "الكلاسيكي", hint: "الشكل السابق بتبويباتٍ في الأعلى", bg: "#0a0a0a" },
};
const DEFAULT_DESIGN = "simple";
const KEY = "ounce_hq_design_v1";

function loadDesign() {
  try { const v = localStorage.getItem(KEY); return DESIGNS[v] ? v : DEFAULT_DESIGN; } catch { return DEFAULT_DESIGN; }
}
function saveDesign(d) {
  try { localStorage.setItem(KEY, d); } catch { /* تفضيلٌ محلّي — لا يضرّ فقده */ }
}
function applyDesign(d) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-design", d);
  document.body.style.background = DESIGNS[d]?.bg || DESIGNS[DEFAULT_DESIGN].bg;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", DESIGNS[d]?.bg || DESIGNS[DEFAULT_DESIGN].bg);
}

/// «الآن» للإدارة — ما يوقف ← ما ينتظر قرارك ← ما حان وقته. دالّةٌ نقيّة.
const RANK = { block: 0, act: 1, soon: 2 };
function hqNowTasks({ branches = 0, idle = 0, inbox = 0, alerts = [] } = {}) {
  const t = [];
  if (!branches) t.push({ id: "branches", level: "block", label: "أضف فرعك الأوّل", hint: "الإدارة تبدأ بفرع" });
  if (inbox > 0) t.push({ id: "approvals", level: "act", label: `${inbox} طلبًا من الفروع ينتظر اعتمادك`, hint: "الاعتمادات" });
  const serious = alerts.filter((a) => a.level !== "info");
  if (serious.length) t.push({ id: "home", level: serious.some((a) => a.level === "block") ? "block" : "act", label: `${serious.length} يحتاج انتباهك`, hint: `${serious[0].name || ""}: ${serious[0].label || ""}`, branchId: serious[0].branchId, branchName: serious[0].name });
  if (branches && idle > 0) t.push({ id: "branches", level: "soon", label: `${idle} فرعًا بلا مبيعات هذا الشهر`, hint: "تحقّق من اتصالها" });
  return t.sort((a, b) => RANK[a.level] - RANK[b.level]);
}

/// سعر البيع لجرام 24 من سياسة الإدارة: العالمي اليدوي + الزيادة (نسبة أو مبلغ)
function hqSell24(policy) {
  const w = Number(policy?.world24Manual) || 0;
  if (!(w > 0)) return 0;
  const m = policy?.markup || {};
  const v = Number(m.value) || 0;
  return m.mode === "percent" ? w * (1 + v / 100) : w + v;
}

export { DEFAULT_DESIGN, DESIGNS, applyDesign, hqNowTasks, hqSell24, loadDesign, saveDesign };
