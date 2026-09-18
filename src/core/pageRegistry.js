import { LayoutDashboard, Building2, BarChart3, LineChart, Users } from "lucide-react";

/**
 * سجلّ شاشات التطبيق المركزي — نظير NAV_REGISTRY في ounce-frontend، لكن
 * بحجم التطبيق المركزي الفعلي (أربع شاشات + إدارة الموظفين نفسها لا
 * تُمنع عن نفسها). يُستخدم في مكانين: بناء تبويبات TopBar (مفلترة حسب
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
