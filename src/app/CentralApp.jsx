import { useEffect, useState, useCallback } from "react";
import { ApiError, fetchCurrentUser, logout as apiLogout } from "../core/api.js";
import LoginPage from "../pages/LoginPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import BranchesPage from "../pages/BranchesPage.jsx";
import BranchDetailPage from "../pages/BranchDetailPage.jsx";
import ReportPage from "../pages/ReportPage.jsx";
import AnalyticsPage from "../pages/AnalyticsPage.jsx";
import TopBar from "../ui/TopBar.jsx";

/**
 * تطبيق الإدارة المركزية — نقطة الدخول.
 *
 * ⚠ لا حاجة لمكتبة توجيه (react-router) هنا: ثلاثة تبويبات بعد الدخول
 * (الرئيسية، الفروع، التقرير المجمّع)، وفوقها طبقة واحدة اختيارية —
 * "تفاصيل فرع" — تُفتح من الرئيسية أو من الفروع بضغطة، وتُغلق برجوعٍ
 * صريح. هذا حجم التنقّل الفعلي، لا حجمٌ مُتخيَّل يبرِّر مكتبة توجيه.
 */
export default function CentralApp() {
  // "loading" أثناء التحقق من جلسة محفوظة، ثم "login" أو "app".
  const [status, setStatus] = useState("loading");
  const [storeUser, setStoreUser] = useState(null);
  const [tab, setTab] = useState("home");
  // ⚠ طبقة فوق التبويبات لا بديلًا عنها: يدخل "تفاصيل فرع" من أي تبويب
  // (الرئيسية أو الفروع)، ويرجع لنفس التبويب الذي جاء منه — لا لتبويبٍ
  // ثابت دائمًا.
  const [openBranch, setOpenBranch] = useState(null); // { id, name } | null

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

  const openBranchDetail = useCallback((id, name) => {
    setOpenBranch({ id, name });
  }, []);

  const closeBranchDetail = useCallback(() => {
    setOpenBranch(null);
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
      <TopBar
        storeUser={storeUser}
        tab={tab}
        onTabChange={(next) => { setOpenBranch(null); setTab(next); }}
        onLogout={handleLogout}
      />
      <main className="max-w-6xl mx-auto p-4">
        {openBranch ? (
          <BranchDetailPage
            branchId={openBranch.id}
            branchName={openBranch.name}
            onBack={closeBranchDetail}
          />
        ) : tab === "home" ? (
          <DashboardPage onOpenBranch={openBranchDetail} />
        ) : tab === "branches" ? (
          <BranchesPage storeUser={storeUser} onOpenBranch={openBranchDetail} />
        ) : tab === "analytics" ? (
          <AnalyticsPage />
        ) : (
          <ReportPage />
        )}
      </main>
    </div>
  );
}

export { ApiError };
