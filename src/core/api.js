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
