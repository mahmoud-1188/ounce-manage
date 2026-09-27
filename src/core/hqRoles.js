/// الهيكل الإداري (المرجع 5.2.0 — HQ_ROLES · SOD_CONFLICTS): من يفعل ماذا في الإدارة، ومن لا يستطيع.
///   `pages`: شاشات الإدارة المقترحة للدور (null = كل الشاشات) · `manage`: إدارة الفروع (الإقفال والجرد والتجهيز) · `coding`: إرسال التكويد.
///   تنبيه: تعارضات فصل المهام تُعرض لا تُمنع — شركةٌ صغيرة قد تجمع دورين في شخص، لكنها يجب أن تعرف ما قبلت.
const HQ_ROLES = {
  chairman: { label: "رئيس مجلس الإدارة", hint: "المالك — يرى كل شيء ويُقرّر في رأس المال والشركاء",
    duties: ["الملكية ورأس المال", "توزيع الأرباح", "تعيين المدير العام", "إصدار مفاتيح الفروع"], pages: null, manage: true, coding: true },
  gm: { label: "المدير العام", hint: "يُدير الشركة تشغيليًّا — لا يمسّ الملكية",
    duties: ["اعتماد الميزانيات", "الإشراف على الفروع", "اعتماد المشتريات الكبيرة", "تعيين مديري الفروع"],
    pages: ["home", "branches", "report", "analytics", "hqDocs", "control", "consolidated", "expenses", "approvals", "policy", "fiscal", "org", "opsLog"], manage: true, coding: true },
  finance: { label: "المدير المالي", hint: "الدفاتر والقوائم والضريبة — لا يُدير مستخدمين ولا مخزونًا",
    duties: ["الدفتر والقيود", "القوائم المالية", "الضريبة والزكاة", "مطابقة البنوك", "اعتماد الصرف"],
    pages: ["home", "report", "analytics", "consolidated", "expenses", "approvals", "fiscal", "opsLog"], manage: true, coding: false },
  operations: { label: "مدير العمليات", hint: "الفروع والمخزون والحركة — لا يمسّ الدفتر",
    duties: ["توزيع البضاعة على الفروع", "اعتماد طلبات الشراء", "التكويد المركزي", "الجرد والتحويلات"],
    pages: ["home", "branches", "hqDocs", "report"], manage: true, coding: true },
  admin: { label: "المدير الإداري", hint: "الموظفون والصلاحيات والرواتب — لا دفتر ولا مخزون",
    duties: ["التوظيف والصلاحيات", "الرواتب والمستحقات", "ربط الأجهزة", "سياسات الفروع"],
    pages: ["home", "branches", "policy", "control", "org"], manage: true, coding: false },
  auditor: { label: "المراجع الداخلي", hint: "يرى كل شيء ولا يُغيّر شيئًا",
    duties: ["مراجعة القيود", "فحص الفروق", "تقارير الالتزام", "رفع الملاحظات"], pages: null, manage: false, coding: false, readOnly: true },
  hq_clerk: { label: "محاسب مركزي", hint: "يدخل حسابات أي فرع: يعتمد ويُسوّي الأخطاء — لا يُقفل",
    duties: ["إدخال القيود", "مراجعة حسابات الفروع واعتمادها", "تسوية الأخطاء الحسابية", "تجهيز الكشوف"],
    pages: ["home", "branches", "report", "consolidated", "expenses"], manage: true, coding: false },
  hq_coder: { label: "موظف التكويد المركزي", hint: "يُكوّد القطع ويشحنها للفروع — لا يبيع ولا يقبض",
    duties: ["التكويد المركزي", "شحنات القطع للفروع"], pages: ["home", "hqDocs"], manage: false, coding: true },
  hq_warehouse: { label: "مسؤول المخازن", hint: "يجرد الفروع من الإدارة ويتابع فروقاتها",
    duties: ["جرد الفروع", "فروقات الجرد", "التحويلات بين الفروع"], pages: ["home", "branches", "hqDocs", "report"], manage: true, coding: false },
};

const SOD_CONFLICTS = [
  { a: "finance", b: "operations", why: "من يُمسك الدفتر ويحرّك المخزون يُغطّي أي فرقٍ بقيدٍ يكتبه بنفسه" },
  { a: "finance", b: "admin", why: "من يفتح الحسابات ويملك الدفتر يصرف لحسابٍ أنشأه" },
  { a: "auditor", b: "finance", why: "مراجعٌ يُراجع دفترًا كتبه ليس مراجعًا" },
  { a: "auditor", b: "operations", why: "من يجرد ما حرّكه لا يجد فرقًا" },
  { a: "hq_clerk", b: "gm", why: "من يُدخل القيد ويعتمده أزال الرقابة المزدوجة" },
  { a: "admin", b: "operations", why: "من يمنح الصلاحيات ويشتري يمنح نفسه ما يحتاج" },
];

/// مجالات عمل الموظف من صلاحياته الفعلية — لكشف التعارض ولو بلا دورٍ مسمّى
function areasOf(u, allPages) {
  const pages = new Set(u.allowedPages == null ? allPages : u.allowedPages);
  const a = new Set();
  if (u.hqRole) a.add(u.hqRole);
  if (pages.has("consolidated") || pages.has("expenses") || pages.has("fiscal")) a.add("finance");
  if (pages.has("hqDocs") || u.canSendCoding) a.add("operations");
  if (pages.has("policy") || pages.has("control")) a.add("admin");
  if (pages.has("approvals") && u.hqRole === "gm") a.add("gm");
  return a;
}
function conflictsOf(u, allPages) {
  if (u.role === "owner") return [];
  const a = areasOf(u, allPages);
  return SOD_CONFLICTS.filter((c) => a.has(c.a) && a.has(c.b));
}

export { HQ_ROLES, SOD_CONFLICTS, areasOf, conflictsOf };
