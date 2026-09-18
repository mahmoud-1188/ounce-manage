import { useEffect, useState, useCallback } from "react";
import { ApiError, fetchCurrentUser, logout as apiLogout } from "../core/api.js";
import LoginPage from "../pages/LoginPage.jsx";
import BranchesPage from "../pages/BranchesPage.jsx";
import ReportPage from "../pages/ReportPage.jsx";
import TopBar from "../ui/TopBar.jsx";

/**
 * تطبيق الإدارة المركزية — نقطة الدخول.
 *
 * ⚠ لا حاجة لمكتبة توجيه (react-router) هنا: شاشتان فقط بعد الدخول
 * (الفروع، التقرير المجمّع) خلف تبويب بسيط — تمامًا كحجم المشكلة
 * الفعلي، لا حجم مُتخيَّل. لو زاد عدد الشاشات مستقبلًا (مثلًا صفحة
 * إعدادات اشتراك) يصير التوجيه الحقيقي مبرَّرًا.
 */
export default function CentralApp() {
  // "loading" أثناء التحقق من جلسة محفوظة، ثم "login" أو "app".
  const [status, setStatus] = useState("loading");
  const [storeUser, setStoreUser] = useState(null);
  const [tab, setTab] = useState("branches");

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then(({ storeUser: user }) => {
        if (cancelled) return;
        setStoreUser(user);
        setStatus("app");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("login");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoggedIn = useCallback((user) => {
    setStoreUser(user);
    setStatus("app");
  }, []);

  const handleLogout = useCallback(() => {
    apiLogout();
    setStoreUser(null);
    setStatus("login");
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-400">
        جارِ التحميل…
      </div>
    );
  }

  if (status === "login") {
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopBar storeUser={storeUser} tab={tab} onTabChange={setTab} onLogout={handleLogout} />
      <main className="max-w-6xl mx-auto p-4">
        {tab === "branches" ? (
          <BranchesPage storeUser={storeUser} />
        ) : (
          <ReportPage />
        )}
      </main>
    </div>
  );
}

export { ApiError };
