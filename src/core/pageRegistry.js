import { LayoutDashboard, Building2, BarChart3, LineChart, Users, Send, SlidersHorizontal } from "lucide-react";

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
];

const USERS_PAGE = { id: "users", label: "الموظفون", icon: Users };

/** الصفحات الفعلية المسموحة لمستخدمٍ مركزي: owner كل شيء دائمًا، staff حسب allowedPages (null = بلا قيد أيضًا). */
function effectivePages(storeUser) {
  if (!storeUser) return [];
  if (storeUser.role === "owner" || storeUser.allowedPages == null) {
    return PAGE_REGISTRY.map((p) => p.id);
  }
  return PAGE_REGISTRY.filter((p) => storeUser.allowedPages.includes(p.id)).map((p) => p.id);
}

export { PAGE_REGISTRY, USERS_PAGE, effectivePages };
