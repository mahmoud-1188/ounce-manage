import { storeApi } from "./api.js";

/**
 * شاشات دفتر الإدارة نفسها (المخزون المركزي · المشتريات · الخزنة المركزية · الدفاتر · الموظفون · الإعدادات):
 * دفتر الإدارة هو دفتر «الفرع الرئيسي»، فتُفتح شاشته في تطبيق الفرع على الفرع الرئيسي — رابط الفرع
 * (/b/<رمزه>) ومعه ?open=<الشاشة> فيفتحها تطبيق الفرع بعد الدخول. هي نفس شاشات المرجع.
 */
const BRANCH_APP = (import.meta.env.VITE_BRANCH_APP_URL || "").replace(/\/+$/, "");

let hqRef = null;
async function hqBranchRef() {
  if (hqRef) return hqRef;
  const d = await storeApi.fetchBranches();
  const rows = Array.isArray(d) ? d : d?.branches || [];
  hqRef = (rows.find((b) => b.is_hq || b.isHq) || null)?.ref || null;
  return hqRef;
}

/** يفتح شاشة دفتر الإدارة في تبويبٍ جديد؛ يعيد سبب التعذّر نصًّا أو null. */
async function openHqBook(view) {
  const win = window.open("", "_blank");
  try {
    const ref = await hqBranchRef();
    if (!ref) { win?.close(); return "لا فرع رئيسي للإدارة — عيّن الفرع الرئيسي أولًا"; }
    const url = `${BRANCH_APP}/b/${encodeURIComponent(ref)}?open=${encodeURIComponent(view)}`;
    if (win) win.location.href = url; else window.location.href = url;
    return BRANCH_APP ? null : "لم يُضبط رابط تطبيق الفرع (VITE_BRANCH_APP_URL) — فُتح بمسارٍ نسبي";
  } catch {
    win?.close();
    return "تعذّر فتح دفتر الإدارة";
  }
}

export { openHqBook };
