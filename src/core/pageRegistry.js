import { Bot, Bug, Tag, KeyRound, Inbox, FolderCog, LayoutDashboard, Building2, BarChart3, LineChart, Users, Send, SlidersHorizontal, Scale, Receipt, ShieldCheck, LockKeyhole, CalendarCheck, Network, History, Landmark, ClipboardCheck } from "lucide-react";

/**
 * سجلّ شاشات التطبيق المركزي — نظير NAV_REGISTRY في ounce-frontend.
 * بدأ بأربع شاشات، وأُضيفت له "hqDocs" (معاملات الإدارة) ضمن خطة
 * توسعة المركزي — إدارة الموظفين نفسها لا تُمنع عن نفسها (راجع
 * USERS_PAGE أسفل). يُستخدم في مكانين: بناء تبويبات TopBar (مفلترة حسب
 * allowedPages للمستخدم الحالي)، وشاشة UsersPage عند تحديد صلاحيات
 * موظفٍ مركزي جديد أو قائم.
 *
 * ⚠ "users" (شاشة الموظفين نفسها) عمدًا ليست في هذا السجلّ: هي مقصورة
 * على owner دائمًا (requireStoreOwner في الباك إند)، فلا معنى لإدراجها
 * ضمن صلاحيات staff قابلة للمنح — منحها لموظفٍ كان سيعرض له تبويبًا
 * يفتح شاشة يرفضها الخادم فورًا بـ403.
 */
const PAGE_REGISTRY = [
  { id: "home", label: "الرئيسية", icon: LayoutDashboard },
  { id: "branches", label: "الفروع", icon: Building2 },
  { id: "report", label: "التقرير المجمّع", icon: BarChart3 },
  { id: "analytics", label: "التحليلات", icon: LineChart },
  // ⚠ معرّف واحد جديد فقط (لا أربعة كما بدأنا سابقًا) — لا يحتاج عمود
  // قاعدة بيانات جديد: allowedPages مصفوفة jsonb مرنة أصلًا (راجع
  // 026_store_user_coding_permission.sql).
  //
  // ⚠ استُبعد عمدًا من هذا السجلّ أربعة من نقاط المرجع لأنها ليست
  // "صفحة" جديدة فعليًّا في هيكل تنقّلنا:
  //   • hqConsole — في المرجع غلافٌ (wrapper) بتبويبات داخلية (الرئيسية/
  //     التحليلات/الهيكل التنظيمي/الميزان الموحّد/الفروع) — كل هذه
  //     موجودة بالفعل كتبويبات منفصلة حقيقية عندنا (home/analytics/
  //     branches)، فلا معنى لغلافٍ إضافي فوقها.
  //   • hqAnalytics — نفس شاشة "analytics" الحالية بالضبط (راجع تعليق
  //     أعلى AnalyticsPage.jsx: نظيرها الحيّ المبني على GET
  //     /store/analytics أصلًا، لا ميزة إضافية).
  //   • hqBranchDetail — موجودة بالفعل كـBranchDetailPage.jsx، تُفتح
  //     بالنقر على فرعٍ من داخل شاشة "branches" نفسها، لا مسارًا
  //     مستقلًا له صلاحية خاصة به. تفعيل "branches" يكفي لرؤيتها.
  //   • hqOrgChart — إدارة أدوار/صلاحيات store_users أنفسهم، من نفس
  //     فئة شاشة "users" الحالية تمامًا (owner فقط دائمًا، مستبعدة
  //     عمدًا من هذا السجلّ لنفس السبب الموثَّق أعلى الملف).
  //
  // ⚠ hqCoding (التكويد المركزي الفعلي — تخصيص أكواد/طباعة ملصقات
  // بواسطة المركزي) مُؤجَّلة عمدًا: ميزة مستقلة تحتاج تكامل الطابعة/
  // RFID (خطة لاحقة)، فلا تُدرَج هنا بعد كي لا يظهر تبويبٌ يفتح شاشة
  // غير موجودة. إرسال شحنة تكويد لفرع (بلا واجهة التكويد نفسها) يتم من
  // داخل "hqDocs" أدناه عبر توثيق معاملة goods_from_hq — راجع
  // 027_hq_transactions.sql وcanSendCoding في UsersPage.jsx.
  { id: "hqDocs", label: "معاملات الإدارة", icon: Send },
  // التحكّم (v197): زيادة الإدارة على السعر العالمي وإعلاناتها لكل الفروع
  { id: "control", label: "التحكّم", icon: SlidersHorizontal },
  // لوحة الإدارة (المركزي المعدّل): الميزان الموحّد · مصروفات الفروع وعمولة
  // البنك مركزيًّا · الاعتمادات (من يعتمد ماذا + صندوق الطلبات)
  { id: "consolidated", label: "الموحّد", icon: Scale },
  // المرجع 5.2.0 (قرار المالك 2026-09-29): زكاة الفروع — كل فرعٍ على سطره ثم إجمالي المجموعة
  { id: "zakat", label: "زكاة الفروع", icon: Landmark },
  { id: "netWeight", label: "صافي الفروع بالوزن", icon: Scale },
  // جرد الفروع من الإدارة (المرجع HqBranchStocktakePage): قفل المخزون والعدّ بالمسح وإرسال النتيجة
  { id: "stocktake", label: "جرد الفروع", icon: ClipboardCheck },
  { id: "expenses", label: "المصروفات", icon: Receipt },
  { id: "approvals", label: "الاعتمادات", icon: ShieldCheck },
  // الشاشات والعمليات: ما تمنعه الإدارة أو تمنحه لكل دور في الفروع
  { id: "policy", label: "الصلاحيات", icon: LockKeyhole },
  // المرجع 5.2.0 (migration 061): السنة المالية للفروع · الهيكل الإداري · سجلّ عمليات الإدارة
  { id: "fiscal", label: "السنة المالية", icon: CalendarCheck },
  { id: "org", label: "الهيكل", icon: Network },
  { id: "opsLog", label: "سجلّ الإدارة", icon: History },
  { id: "clientErrors", label: "أعطال الفروع", icon: Bug },
  { id: "apiKeys", label: "الواجهة البرمجية", icon: KeyRound },
  // المساعد (المرجع 2026-10-12 ز): أسئلة الفروع مجتمعةً كتابةً وصوتًا، من أرقامها الفعلية
  { id: "assistant", label: "المساعد", icon: Bot },
];

const USERS_PAGE = { id: "users", label: "الموظفون", icon: Users };
// شاشة التكويد تُفتح بصلاحية «إرسال تكويد لفرع» وحدها — لا بقائمة الشاشات — فالمكوِّد لا يرى غيرها
const CODING_PAGE = { id: "coding", label: "التكويد", icon: Tag };
const canCode = (u) => u?.role === "owner" || !!u?.canSendCoding;

/** الصفحات الفعلية المسموحة لمستخدمٍ مركزي: owner كل شيء دائمًا، staff حسب allowedPages (null = بلا قيد أيضًا). */
// باقة «بدون محاسبة» (migration 070 في الخادم): شاشات الإدارة المحاسبية تُخفى (والخادم يرفض مساراتها)
const ACCOUNTING_PAGES = ["consolidated", "fiscal", "zakat", "netWeight"];
const noAccounting = (storeUser) => storeUser?.storePackage === "no_accounting";

function effectivePages(storeUser) {
  if (!storeUser) return [];
  const pages = storeUser.role === "owner" || storeUser.allowedPages == null
    ? PAGE_REGISTRY.map((p) => p.id)
    : PAGE_REGISTRY.filter((p) => storeUser.allowedPages.includes(p.id)).map((p) => p.id);
  if (canCode(storeUser)) pages.push("coding");
  return noAccounting(storeUser) ? pages.filter((id) => !ACCOUNTING_PAGES.includes(id)) : pages;
}

/**
 * أبواب الإدارة (المرجع م4): الشاشات مجمّعةٌ في أبوابٍ بدل ستة عشر تبويبًا في شريطٍ يُمرَّر.
 * كل شاشةٍ في بابٍ واحد؛ الشريط العلوي أبوابٌ، وتحته شاشات الباب المفتوح. وقائمة ☰ في
 * «البسيط» بالأبواب نفسها. الصلاحية كما هي: بابٌ بلا شاشةٍ مسموحة لا يظهر.
 */
const HQ_HUBS = [
  { key: "branches", label: "الفروع", icon: Building2, pages: ["home", "branches", "stocktake"] },
  { key: "inbox", label: "الوارد", icon: Inbox, pages: ["approvals", "hqDocs", "coding"] },
  { key: "control", label: "التحكّم والإرسال", icon: SlidersHorizontal, pages: ["control", "policy"] },
  { key: "money", label: "المال", icon: Receipt, pages: ["expenses", "consolidated", "fiscal"] },
  { key: "reports", label: "التقارير", icon: BarChart3, pages: ["report", "analytics", "zakat", "netWeight", "assistant"] },
  { key: "admin", label: "الإدارة", icon: FolderCog, pages: ["org", "opsLog", "clientErrors", "apiKeys", "users"] },
];

/** الأبواب بشاشاتها المسموحة (`users` للمالك وحده). */
function visibleHubs(storeUser) {
  const allowed = new Set(effectivePages(storeUser));
  if (storeUser?.role === "owner") allowed.add("users");
  const byId = new Map([...PAGE_REGISTRY, USERS_PAGE, CODING_PAGE].map((p) => [p.id, p]));
  return HQ_HUBS
    .map((h) => ({ ...h, pages: h.pages.filter((id) => allowed.has(id)).map((id) => byId.get(id)) }))
    .filter((h) => h.pages.length);
}

const hubOfPage = (id) => HQ_HUBS.find((h) => h.pages.includes(id)) || null;

export { CODING_PAGE, HQ_HUBS, PAGE_REGISTRY, USERS_PAGE, effectivePages, hubOfPage, visibleHubs, noAccounting };
