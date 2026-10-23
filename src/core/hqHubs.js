import { BarChart3, BookOpen, Building2, Check, RadioTower, Send, Settings, ShoppingCart, UserRound, Wallet } from "lucide-react";

/**
 * أبواب الإدارة كما في المرجع (core/navigation.js — HQ_HUBS): عشرة أبواب بترتيبها ومكانها وتلميحها،
 * وفي كل بابٍ إجراءاته وتبويباته وما تحت «المزيد»، وفي كل تبويبٍ شاشاته.
 *
 * معرّف الشاشة واحدٌ من ثلاثة:
 *   • صفحةٌ في هذا التطبيق ("branches" · "approvals" · …)
 *   • قسمٌ من «التحكّم والإرسال» ("control:orders" …)
 *   • "book:<شاشة>" — شاشةٌ من دفتر الإدارة نفسها (المخزون المركزي · المشتريات · الخزنة المركزية · الدفاتر …):
 *     تُفتح في تطبيق الفرع على الفرع الرئيسي، وهي نفس شاشة المرجع (المرجع تطبيقٌ واحد بإصدارين).
 */
const v = (id, label) => ({ id, label });

const HQ_HUBS = [
  { key: "branches", title: "الفروع", icon: Building2, tone: "central", place: "big", leadTab: true,
    hint: "صحّة الفروع · بطاقة الفرع · ＋ فرع · جرد الفروع",
    actions: [{ label: "＋ فرع — بكود من المشغّل", views: [v("branches:add", "＋ فرع")] }],
    tabs: [
      { label: "الفروع", views: [v("branches", "الفروع"), v("compliance", "الامتثال"), v("dashboard", "لوحة الإدارة")] },
      { label: "جرد الفروع", views: [v("stocktake", "جرد الفروع")] },
    ] },
  { key: "inbox", title: "الوارد", icon: Check, tone: "accounting", place: "big",
    hint: "اعتمادات · مستندات · تنبيهات",
    tabs: [
      { label: "الوارد", views: [v("approvals", "الوارد"), v("hqDocs", "معاملات الإدارة"), v("book:approvals", "اعتمادات الإدارة"), v("alerts", "التنبيهات")] },
    ] },
  { key: "ship", title: "الشحن والتكويد", icon: Send, tone: "inventory", place: "big", leadTab: true,
    hint: "شحن · تكويد · المخزون المركزي · المشتريات",
    actions: [
      { label: "شحنة قطعٍ مكوَّدة لفرع", views: [v("coding", "الشحن")] },
      { label: "بضاعة من الإدارة — مستند", views: [v("hqDocs", "معاملات الإدارة")] },
    ],
    tabs: [
      { label: "الشحن", views: [v("coding", "الشحن"), v("transit", "في الطريق")] },
      { label: "التكويد", views: [v("book:addGoods", "التكويد"), v("book:printing", "إعادة الطباعة"), v("book:codingReport", "ما كُوّد"), v("coding", "بضاعة الفروع")] },
      { label: "المخزون المركزي", views: [v("book:inventory", "القطع"), v("book:stocktake", "العدّ"), v("book:rfidReader", "قارئ RFID"), v("book:itemEdit", "تعديل القطع"),
        v("book:categories", "التصنيفات"), v("book:conversions", "التحويلات"), v("book:reorder", "الحدّ الأدنى"), v("book:branchTransfers", "بين الفروع")] },
      { label: "المشتريات والموردون", views: [v("book:purchases", "المشتريات"), v("book:purchaseOrders", "أوامر الشراء"), v("book:suppliers", "الموردون"),
        v("book:taskirat", "التسكير"), v("book:officeLedger", "المكاتب"), v("book:workshop", "الورش")] },
    ] },
  { key: "store", title: "المتجر", icon: ShoppingCart, tone: "sales", place: "big",
    hint: "الحال الآن · القطع المعروضة · الطلبات · التسوية",
    tabs: [
      { label: "المتجر الآن", views: [v("book:storeLink", "المتجر الآن")] },
    ] },
  { key: "control", title: "التحكّم والإرسال", icon: RadioTower, tone: "links", place: "small",
    hint: "السعر · الإعلانات · الإقفال · أوامر للفروع",
    tabs: [
      { label: "التحكّم — السعر والأهداف", views: [v("control:price", "السعر والأهداف")] },
      { label: "الإعلانات", views: [v("control:notices", "الإعلانات")] },
      { label: "الإقفال", views: [v("control:close", "الإقفال")] },
      { label: "أوامر للفروع", views: [v("control:orders", "أوامر للفروع")] },
    ] },
  { key: "money", title: "المال", icon: Wallet, tone: "money", place: "small", leadTab: true,
    hint: "الخزنة المركزية · المصروفات · البنك",
    actions: [{ label: "سجّل مصروفًا", views: [v("book:expenses", "سجّل مصروفًا")] }],
    tabs: [
      { label: "الخزنة المركزية", views: [v("book:cash", "الخزنة المركزية")] },
      { label: "مصروفات الإدارة", views: [v("book:expenses", "مصروفات الإدارة"), v("book:budgets", "مقابل الموازنة")] },
      { label: "البنك", views: [v("expenses", "عمولات البنك"), v("book:bankRecon", "مطابقة البنك")] },
    ],
    moreLabel: "متقدّم",
    more: [
      { label: "الشركاء", views: [v("book:partners", "الشركاء")] },
      { label: "الأصول الثابتة", views: [v("book:fixedAssets", "الأصول الثابتة")] },
      { label: "جرد الخزنة", views: [v("book:safeAudit", "جرد الخزنة")] },
    ] },
  { key: "reports", title: "التقارير", icon: BarChart3, tone: "reports", place: "small",
    hint: "كم ربحنا؟ · بيعٌ وشراءٌ وصرف · أين الذهب؟ · من يدين لمن؟",
    tabs: [
      { label: "كم ربحنا؟", views: [v("book:reportsHub", "الملخّص"), v("netWeight", "الصافي بالوزن"), v("analytics", "بين الفروع"), v("book:dashboard", "لوحة التحكم"),
        v("book:masterReport", "التقارير الموحّدة"), v("book:combinedBook", "الذهب والنقد معًا"), v("book:sellerReports", "بالبائع"), v("book:reports", "مقارنة فترات"), v("assistant", "التحليل الذكي")] },
      { label: "بيعٌ وشراءٌ وصرف", views: [v("report", "الملخّص"), v("expenses", "مصروفات الفروع"), v("book:reports", "المبيعات والمشتريات والمصروفات")] },
      { label: "أين الذهب؟", views: [v("book:reportsHub", "الملخّص"), v("book:openingCompare", "مقارنة بالافتتاحي"), v("wastage", "الهدر")] },
      { label: "من يدين لمن؟", views: [v("book:anyStatement", "كشف حساب"), v("book:supplierLedger", "دفتر الموردين"), v("book:customerReport", "تقرير العملاء")] },
    ],
    moreLabel: "المزيد",
    more: [
      { label: "النقد والبنك", views: [v("book:reportsHub", "النقد والبنك")] },
      { label: "الضريبة والزكاة", views: [v("control:close", "الإقرار الموحّد"), v("zakat", "زكاة الفروع"), v("book:taxReport", "تقرير الضرائب")] },
    ] },
  { key: "ledgers", title: "الدفاتر", icon: BookOpen, tone: "accounting", place: "menu", leadTab: true,
    actions: [{ label: "الرصيد الافتتاحي وبدء التشغيل", views: [v("book:openingBalance", "الرصيد الافتتاحي")] }],
    tabs: [
      { label: "الدفاتر", views: [v("book:generalLedger", "دفتر الإدارة"), v("consolidated", "الموحّد — كل الفروع"), v("book:trialBalance", "ميزان المراجعة")] },
      { label: "القوائم", views: [v("book:fullStatements", "القوائم المالية"), v("book:financials", "الزكاة"), v("book:ifrs", "IFRS")] },
      { label: "اليومية", views: [v("book:journal", "ورقة اليوم"), v("book:documents", "المستندات"), v("book:queryBuilder", "تصفية متقدّمة")] },
      { label: "الامتثال", views: [v("book:vatReturn", "إقرار ضريبة القيمة المضافة"), v("book:einvoice", "الفوترة الإلكترونية"), v("book:amlRegister", "مكافحة غسل الأموال")] },
    ] },
  { key: "staff", title: "الموظفون", icon: UserRound, tone: "central", place: "menu",
    tabs: [
      { label: "الموظفون", views: [v("users", "موظفو الإدارة"), v("org", "الهيكل الإداري"), v("book:attendanceHr", "الحضور والإجازات")] },
      { label: "الرواتب", views: [v("book:payroll", "مسيّر الرواتب")] },
    ] },
  { key: "settings", title: "الإعدادات", icon: Settings, tone: "links", place: "menu",
    tabs: [
      { label: "الإعدادات", views: [v("book:settings", "الأساسيات"), v("book:navCustomize", "تخصيص القائمة")] },
      { label: "الأمان والصلاحيات", views: [v("users", "الأشخاص"), v("policy", "ما يراه الفرع"), v("approvals", "من يعتمد ماذا")] },
      { label: "الأجهزة", views: [v("book:printerSetup", "الطابعة")] },
      { label: "الربط", views: [v("book:integration", "الربط مع الأنظمة"), v("book:exchange", "التبادل مع الأنظمة"), v("apiKeys", "الواجهة البرمجية")] },
    ],
    moreLabel: "المزيد",
    more: [
      { label: "الوحدات والنسخ", views: [v("book:modules", "الوحدات"), v("book:backup", "النسخ الاحتياطي")] },
      { label: "سجلّ الإدارة وأعطال الفروع", views: [v("opsLog", "سجلّ الإدارة"), v("clientErrors", "أعطال الفروع")] },
    ] },
];

/** عناصر ورقة الباب بترتيب المرجع (hubSheetItems): التبويب الأوّل ثم الإجراءات ثم بقية التبويبات، ثم «المزيد». */
function hubSheetItems(hub) {
  const tabs = hub.tabs || [];
  const more = (hub.more || []).map((m) => ({ ...m, group: hub.moreLabel || "متقدّم" }));
  return hub.leadTab && tabs.length ? [tabs[0], ...(hub.actions || []), ...tabs.slice(1), ...more] : [...(hub.actions || []), ...tabs, ...more];
}

export { HQ_HUBS, hubSheetItems };
