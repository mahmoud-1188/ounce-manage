import { LayoutDashboard, Building2, BarChart3, LineChart, Users, Landmark, Send, Plus, TrendingUp } from "lucide-react";

/**
 * سجلّ شاشات التطبيق المركزي — نظير NAV_REGISTRY في ounce-frontend.
 * بدأ بأربع شاشات، وأُضيفت له أربعة أخرى (hqConsole/hqAnalytics/
 * hqDocs/hqCoding) ضمن خطة توسعة المركزي — إدارة الموظفين نفسها لا
 * تُمنع عن نفسها (راجع USERS_PAGE أسفل). يُستخدم في مكانين: بناء
 * تبويبات TopBar (مفلترة حسب allowedPages للمستخدم الحالي)، وشاشة
 * UsersPage عند تحديد صلاحيات موظفٍ مركزي جديد أو قائم.
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
  // ⚠ أربعة معرّفات جديدة فقط (لا ستّة) من خطة توسعة المركزي — لا
  // تحتاج عمود قاعدة بيانات جديد: allowedPages مصفوفة jsonb مرنة أصلًا
  // (راجع 026_store_user_coding_permission.sql). hqCoding وحده له
  // صلاحية مستقلة إضافية (canSendCoding) لأنه فعلٌ تجاري لا مجرّد عرض
  // شاشة.
  //
  // ⚠ استُبعد عمدًا من هذا السجلّ اثنان من نقاط المرجع لأنهما ليسا
  // "صفحة" في هيكل تنقّلنا الفعلي:
  //   • hqBranchDetail — موجودة بالفعل كـBranchDetailPage.jsx، تُفتح
  //     بالنقر على فرعٍ من داخل شاشة "branches" نفسها، لا مسارًا
  //     مستقلًا له صلاحية خاصة به. تفعيل "branches" يكفي لرؤيتها.
  //   • hqOrgChart — إدارة أدوار/صلاحيات store_users أنفسهم، من نفس
  //     فئة شاشة "users" الحالية تمامًا (owner فقط دائمًا، مستبعدة
  //     عمدًا من هذا السجلّ لنفس السبب الموثَّق أعلى الملف) — لا معنى
  //     لمنح موظفٍ صلاحية "رؤية" شاشة تُدير صلاحيات الموظفين أنفسهم.
  { id: "hqConsole", label: "الإدارة المركزية", icon: Landmark },
  { id: "hqAnalytics", label: "تحليلات متقدّمة", icon: TrendingUp },
  { id: "hqDocs", label: "معاملات الإدارة", icon: Send },
  { id: "hqCoding", label: "التكويد المركزي", icon: Plus },
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
