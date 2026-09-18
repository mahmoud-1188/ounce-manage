import { useState } from "react";
import { login, ApiError } from "../core/api.js";

/**
 * شاشة دخول المستخدم المركزي — بريد + كلمة مرور (لا PIN كما في تطبيق
 * الفرع؛ راجع قرار "إيميل + كلمة مرور" الصريح من المستخدم عند تصميم
 * store_users).
 */
export default function LoginPage({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("الرجاء إدخال البريد وكلمة المرور");
      return;
    }
    setBusy(true);
    try {
      const { storeUser } = await login({ email: email.trim(), password });
      onLoggedIn(storeUser);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(loginErrorMessage(err));
      } else {
        setError("تعذّر الاتصال بالخادم");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4"
      >
        <div className="text-center space-y-1 mb-2">
          <img
            src="/brand/logo-mark-transparent.png"
            alt="أوقية"
            className="h-12 w-12 mx-auto"
          />
          <h1 className="text-lg font-semibold">الإدارة المركزية</h1>
          <p className="text-xs text-neutral-400">أوقية — Oqiyyah</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-neutral-300" htmlFor="email">البريد الإلكتروني</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-neutral-300" htmlFor="password">كلمة المرور</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            dir="ltr"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-neutral-950 font-medium py-2 text-sm transition-colors"
        >
          {busy ? "جارِ الدخول…" : "دخول"}
        </button>
      </form>
    </div>
  );
}

function loginErrorMessage(err) {
  switch (err.body?.error) {
    case "invalid_credentials":
      return "البريد أو كلمة المرور غير صحيحة";
    case "store_suspended":
      return "تم إيقاف اشتراك متجرك — تواصل مع الدعم";
    case "store_expired":
      return "انتهى اشتراك متجرك — يلزم تجديده";
    case "subscription_expired":
      return "انتهى اشتراك متجرك — يلزم تجديده";
    default:
      return "تعذّر تسجيل الدخول";
  }
}
