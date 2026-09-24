// ═══════════════════════════════════════════════════════════════
//  طبقة الاتصال بالباك إند — تطبيق الإدارة المركزية (Central/Store)
// ═══════════════════════════════════════════════════════════════
//
// ⚠ هذا تطبيق منفصل تمامًا عن ounce-frontend (الفرع) — لكنه يتصل بنفس
// الباك إند الحقيقي (نفس قاعدة PostgreSQL)، عبر مسارات /api/store-auth/*
// و/api/store/* المخصَّصة للمستخدم المركزي (store_users)، لا مسارات
// المستخدم الفرعي (users) التي يستخدمها ounce-frontend. راجع
// storeAuth.routes.js وstore.routes.js في الباك إند.
//
// ⚠ لا bootstrap واحد ضخم هنا كما في تطبيق الفرع — الشاشات المركزية
// قليلة العدد وخفيفة (قائمة فروع، تقرير مجمّع)، فكل شاشة تطلب بياناتها
// مباشرة عند فتحها بدل تحميل كل شيء دفعة واحدة عند الدخول.

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// ⚠ مفتاح تخزين مختلف عمدًا عن ounce_auth_token_v1 (تطبيق الفرع) — توكن
// مستخدم مركزي (scope: "store") وتوكن مستخدم فرع (scope: "branch") لا
// يجوز أن يختلطا أبدًا حتى لو فُتح التطبيقان من نفس المتصفح (مثلًا في
// تبويبين)، وbackend نفسه يرفض توكن بscope خاطئ صراحة (راجع
// middleware/storeAuth.js وmiddleware/auth.js).
const TOKEN_STORAGE_KEY = "ounce_store_auth_token_v1";

let authToken = null;
try {
  authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || null;
} catch {
  // localStorage غير متاح (وضع خصوصية صارم) — الجلسة تبقى في الذاكرة فقط.
}

function setAuthToken(token) {
  authToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // تجاهل — الجلسة تبقى شغّالة في الذاكرة حتى لو فشل الحفظ.
  }
}

function getAuthToken() {
  return authToken;
}

function clearAuthToken() {
  setAuthToken(null);
}

/** خطأ API منظَّم — يحمل status وbody (نفس نمط ounce-frontend/core/api.js). */
class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body || {};
  }
}

async function apiFetch(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: "invalid_response", raw: text };
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, payload);
  }
  return payload;
}

// ── المصادقة (store-auth.routes.js) ──

/** POST /store-auth/login — يرجّع {token, storeUser: {id, name, role, storeId}}. */
async function login({ email, password }) {
  const result = await apiFetch("/store-auth/login", {
    method: "POST",
    body: { email, password },
  });
  setAuthToken(result.token);
  return result;
}

function logout() {
  clearAuthToken();
}

/**
 * GET /store-auth/me — يتحقق من توكن محفوظ عند إقلاع التطبيق ويرجّع
 * بيانات المستخدم المركزي الحالي، لاستعادة الجلسة تلقائيًا بعد أي
 * refresh. يرمي ApiError(401) إن كان التوكن غائبًا أو منتهيًا.
 */
function fetchCurrentUser() {
  return apiFetch("/store-auth/me");
}

// ── الفروع والتقرير المجمّع (store.routes.js) ──

const storeApi = {
  /** GET /store/branches — فروع المتجر الحالي. */
  fetchBranches: () => apiFetch("/store/branches"),

  /** GET /store/report?period=YYYY-MM — تقرير مجمّع لكل فروع المتجر. */
  fetchReport: (period) => apiFetch(`/store/report${period ? `?period=${period}` : ""}`),

  /**
   * GET /store/analytics?period=YYYY-MM — ترتيب الفروع بمقاييس متعددة
   * (نمو، دوران مخزون، مبيعات لكل موظف)، طرق الدفع، توزيع العيار،
   * وأعلى البائعين. راجع src/domain/analyticsReport.js في الباك إند.
   */
  fetchAnalytics: (period) => apiFetch(`/store/analytics${period ? `?period=${period}` : ""}`),

  /**
   * POST /store/branches { name, managerName, managerPin } — إنشاء فرع
   * جديد + أول مستخدم manager له. يرجّع 403 بـreason محدَّد
   * (branch_limit_reached, subscription_expired, store_suspended...) إن
   * تجاوز المتجر سقف اشتراكه — راجع storeCanAddBranch في الباك إند.
   */
  createBranch: (payload) => apiFetch("/store/branches", { method: "POST", body: payload }),

  /**
   * DELETE /store/branches/:branchId  { confirm: "DELETE" }
   * تعطيل منطقي (soft-delete) لا حذف فعلي — راجع migration
   * 025_branches_soft_delete في الباك إند. يرفض 403 cannot_delete_hq_branch
   * للفرع الرئيسي، و400 confirmation_required إن لم تُطابق confirm الكلمة
   * "DELETE" تمامًا (فحصٌ يُعاد من الخادم بصرف النظر عمّا أرسلته الواجهة).
   */
  deleteBranch: (branchId) =>
    apiFetch(`/store/branches/${branchId}`, { method: "DELETE", body: { confirm: "DELETE" } }),

  /**
   * PATCH /store/branches/:branchId/lock { locked, reason } — قفل الفرع من
   * الإدارة: الخادم يرفض كل طلباته (423 branch_locked) حتى يُفكّ.
   */
  setBranchLock: (branchId, locked, reason) =>
    apiFetch(`/store/branches/${branchId}/lock`, { method: "PATCH", body: { locked, reason } }),

  /** GET /store/users — موظفو المتجر المركزيون (owner فقط). */
  fetchUsers: () => apiFetch("/store/users"),

  /**
   * POST /store/users { name, email, password, allowedPages?, canManageBranches? }
   * موظفٌ مركزي جديد بدور staff — allowedPages مصفوفة معرّفات شاشات أو
   * null (بلا قيد).
   */
  createUser: (payload) => apiFetch("/store/users", { method: "POST", body: payload }),

  /** PATCH /store/users/:id { allowedPages?, canManageBranches?, active? } */
  updateUser: (id, payload) => apiFetch(`/store/users/${id}`, { method: "PATCH", body: payload }),

  // ── إدارة موظفي فرعٍ بعينه عن بعد (store.routes.js + domain/branchUsers.js) ──
  // ⚠ نفس منطق AccessSettingsPage.jsx (رقم سري 4-6 أرقام، منع تكرار
  // الاسم/الرقم، حارس آخر manager) لكن مُنادًى من المركزية لأي فرعٍ يملكه
  // المتجر — يتطلب requireCanManageBranches في الباك إند.

  /** GET /store/branches/:branchId/users — موظفو فرعٍ بعينه. */
  fetchBranchUsers: (branchId, { includeInactive = false } = {}) =>
    apiFetch(`/store/branches/${branchId}/users${includeInactive ? "?includeInactive=1" : ""}`),

  /** PATCH /store/branches/:branchId/users/:id/pin { pin } — إعادة الرقم السري (لا يتكرّر في الفرع) */
  resetBranchUserPin: (branchId, userId, pin) =>
    apiFetch(`/store/branches/${branchId}/users/${userId}/pin`, { method: "PATCH", body: { pin } }),

  /** PATCH /store/branches/:branchId/users/:id/active { active } — تفعيل/تعطيل، لا يُعطَّل آخر مدير */
  setBranchUserActive: (branchId, userId, active) =>
    apiFetch(`/store/branches/${branchId}/users/${userId}/active`, { method: "PATCH", body: { active } }),

  /** POST /store/branches/:branchId/close-day { note } — إقفال يوم الفرع من الإدارة */
  closeBranchDay: (branchId, note) =>
    apiFetch(`/store/branches/${branchId}/close-day`, { method: "POST", body: { note } }),

  /** GET /store/branches/:branchId/audit — آخر 200 حركة في سجل تدقيق الفرع */
  fetchBranchAudit: (branchId) => apiFetch(`/store/branches/${branchId}/audit`),

  /** GET/PUT /store/price-policy — زيادة الإدارة على السعر العالمي لكل الفروع */
  fetchPricePolicy: () => apiFetch("/store/price-policy"),
  savePricePolicy: (payload) => apiFetch("/store/price-policy", { method: "PUT", body: payload }),

  /** إعلانات الإدارة — تظهر في رئيسية كل فرع حتى تاريخ انتهائها */
  fetchNotices: () => apiFetch("/store/notices"),
  createNotice: (text, days) => apiFetch("/store/notices", { method: "POST", body: { text, days } }),
  deleteNotice: (id) => apiFetch(`/store/notices/${id}`, { method: "DELETE" }),

  // ── لوحة الإدارة (storeConsole.routes.js) ──
  /** GET /store/alerts — «يحتاج انتباهك الآن» لكل الفروع (block/warn/info) */
  fetchAlerts: () => apiFetch("/store/alerts"),
  /** GET /store/consolidated?to=YYYY-MM-DD — الميزان الموحّد مفصّلًا على الفروع */
  fetchConsolidated: (to) => apiFetch(`/store/consolidated${to ? `?to=${to}` : ""}`),
  /** GET /store/expenses-matrix?period=d30|mtd|ytd|all — المصروفات حساب × فرع */
  fetchExpensesMatrix: (period) => apiFetch(`/store/expenses-matrix?period=${period || "mtd"}`),
  /** GET /store/bank-fees?period=YYYY-MM — عمولة الشبكة المسجّلة والمسوّاة لكل فرع */
  fetchBankFeesAll: (period) => apiFetch(`/store/bank-fees?period=${period}`),
  /** POST /store/bank-fees/distribute — توزيع عمولة كشف البنك على الفروع بنسبة المسجّل */
  distributeBankFees: (period, actualFee, note) =>
    apiFetch("/store/bank-fees/distribute", { method: "POST", body: { period, actualFee, note } }),
  /** GET /store/targets — هدف ٣٠ يومًا ومبيعاتها ونسبة التحقيق لكل فرع */
  fetchTargets: () => apiFetch("/store/targets"),
  setBranchTarget: (branchId, target30) =>
    apiFetch(`/store/branches/${branchId}/target`, { method: "PATCH", body: { target30 } }),
  /** من يعتمد ماذا: expense/refund/supplier_settle → hq | branch */
  fetchApprovalRouting: () => apiFetch("/store/approval-routing"),
  saveApprovalRouting: (routing) => apiFetch("/store/approval-routing", { method: "PUT", body: { routing } }),
  /** صندوق الاعتمادات — status=all للسجلّ كاملًا */
  fetchStoreApprovals: (all = false) => apiFetch(`/store/approvals${all ? "?status=all" : ""}`),
  decideStoreApproval: (id, decision, note) =>
    apiFetch(`/store/approvals/${id}/decide`, { method: "POST", body: { decision, note } }),
  /** دفاتر الفرع للقراءة: sales|returns|cash|purchases|expenses|receipts|scrap|users */
  fetchBranchBooks: (branchId, kind) => apiFetch(`/store/branches/${branchId}/books?kind=${kind}`),
  /** حسابات الفرع عن بعد */
  fetchAccounts: () => apiFetch("/store/accounts"),
  fetchBranchReviewQueue: (branchId) => apiFetch(`/store/branches/${branchId}/review-queue`),
  postBranchReview: (branchId, payload) =>
    apiFetch(`/store/branches/${branchId}/reviews`, { method: "POST", body: payload }),
  fetchBranchJournal: (branchId, limit = 100) => apiFetch(`/store/branches/${branchId}/journal?limit=${limit}`),
  reverseBranchEntry: (branchId, entryId, reason) =>
    apiFetch(`/store/branches/${branchId}/journal/${entryId}/reverse`, { method: "POST", body: { reason } }),
  postBranchAdjustment: (branchId, lines, note) =>
    apiFetch(`/store/branches/${branchId}/adjustment`, { method: "POST", body: { lines, note } }),
  settleBranchBankFees: (branchId, period, actualFee, note) =>
    apiFetch(`/store/branches/${branchId}/bank-fees/settle`, { method: "POST", body: { period, actualFee, note } }),

  /** POST /store/branches/:branchId/users { name, pin, role, salary } */
  createBranchUser: (branchId, payload) =>
    apiFetch(`/store/branches/${branchId}/users`, { method: "POST", body: payload }),

  /** PATCH /store/branches/:branchId/users/:id/rename { name } */
  renameBranchUser: (branchId, userId, name) =>
    apiFetch(`/store/branches/${branchId}/users/${userId}/rename`, { method: "PATCH", body: { name } }),

  /** PATCH /store/branches/:branchId/users/:id/ai { canUseAi } */
  setBranchUserAi: (branchId, userId, canUseAi) =>
    apiFetch(`/store/branches/${branchId}/users/${userId}/ai`, { method: "PATCH", body: { canUseAi } }),

  /** PATCH /store/branches/:branchId/users/:id/permissions { allowedPages } */
  setBranchUserPermissions: (branchId, userId, allowedPages) =>
    apiFetch(`/store/branches/${branchId}/users/${userId}/permissions`, { method: "PATCH", body: { allowedPages } }),

  /** DELETE /store/branches/:branchId/users/:id — تعطيل منطقي (active=false)، لا حذف. */
  removeBranchUser: (branchId, userId) =>
    apiFetch(`/store/branches/${branchId}/users/${userId}`, { method: "DELETE" }),

  // ── معاملات الإدارة (hqDocs — migration 027 في الباك إند) ──
  // طلبات/تحويلات حقيقية بدأها فرعٌ وتنتظر قرار المركزي، أو شحنة
  // تكويد (goods_from_hq) تُنشئها الإدارة نفسها.

  /** GET /store/hq-transactions — كل معاملات فروع هذا المتجر. */
  fetchHqTransactions: () => apiFetch("/store/hq-transactions"),

  /**
   * POST /store/hq-transactions { branchId, weight, karat, pieces, note? }
   * تُنشئ goods_from_hq فقط — تتطلّب canSendCoding (403 cannot_send_coding
   * لموظفٍ بلا هذه الصلاحية صراحةً).
   */
  createHqShipment: (payload) => apiFetch("/store/hq-transactions", { method: "POST", body: payload }),

  /** PATCH /store/hq-transactions/:id/decide { decision: 'approved'|'rejected', note? } */
  decideHqTransaction: (id, decision, note) =>
    apiFetch(`/store/hq-transactions/${id}/decide`, { method: "PATCH", body: { decision, note } }),

  /** POST /store/hq-transactions/:id/receive — تستلم الإدارة (goods_to_hq/taskir_to_hq/cash_transfer). */
  receiveHqTransaction: (id) => apiFetch(`/store/hq-transactions/${id}/receive`, { method: "POST" }),
};

export {
  ApiError,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  login,
  logout,
  fetchCurrentUser,
  storeApi,
};
