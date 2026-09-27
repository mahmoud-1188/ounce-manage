import { useEffect, useState, useCallback } from "react";
import { ApiError, fetchCurrentUser, logout as apiLogout } from "../core/api.js";
import LoginPage from "../pages/LoginPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import BranchesPage from "../pages/BranchesPage.jsx";
import BranchDetailPage from "../pages/BranchDetailPage.jsx";
import ReportPage from "../pages/ReportPage.jsx";
import AnalyticsPage from "../pages/AnalyticsPage.jsx";
import UsersPage from "../pages/UsersPage.jsx";
import HqDocsPage from "../pages/HqDocsPage.jsx";
import ControlPage from "../pages/ControlPage.jsx";
import ConsolidatedPage from "../pages/ConsolidatedPage.jsx";
import ExpensesPage from "../pages/ExpensesPage.jsx";
import ApprovalsPage from "../pages/ApprovalsPage.jsx";
import PolicyPage from "../pages/PolicyPage.jsx";
import TopBar from "../ui/TopBar.jsx";
import SimpleHqHome from "../ui/SimpleHqHome.jsx";
import DesignPicker from "../ui/DesignPicker.jsx";
import { applyDesign, loadDesign, saveDesign } from "../core/design.js";
import { ChevronRight, LogOut, Menu, X } from "lucide-react";
import { PAGE_REGISTRY, USERS_PAGE, effectivePages } from "../core/pageRegistry.js";

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
  // ⚠ يُحدَّد فعليًّا بعد معرفة صلاحيات المستخدم (انظر الدالتين أدناه) —
  // "home" هنا افتراضٌ أوّلي فقط لموظفٍ قد لا يملك صلاحية رؤيتها أصلًا.
  const [tab, setTab] = useState("home");
  // ⚠ طبقة فوق التبويبات لا بديلًا عنها: يدخل "تفاصيل فرع" من أي تبويب
  // (الرئيسية أو الفروع)، ويرجع لنفس التبويب الذي جاء منه — لا لتبويبٍ
  // ثابت دائمًا.
  const [openBranch, setOpenBranch] = useState(null); // { id, name } | null
  // الشكل (المرجع 2026-09-27): «البسيط» أساسيّ ما لم يختر المستخدم غيره على هذا الجهاز
  const [design, setDesign] = useState(loadDesign);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { applyDesign(design); }, [design]);
  const changeDesign = useCallback((d) => { saveDesign(d); setDesign(d); setTab((t) => (t === "dashboard" ? "home" : t)); }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then(({ storeUser: user }) => {
        if (cancelled) return;
        setStoreUser(user);
        setTab(firstAllowedTab(user));
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

  /** أول تبويبٍ يملك المستخدم صلاحية رؤيته فعليًّا — لا "home" افتراضًا دائمًا. */
  function firstAllowedTab(user) {
    const allowed = effectivePages(user);
    return allowed[0] || "home";
  }

  const handleLoggedIn = useCallback((user) => {
    setStoreUser(user);
    setTab(firstAllowedTab(user));
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

  const canManage = storeUser?.role === "owner" || !!storeUser?.canManageBranches;
  const allowed = effectivePages(storeUser);
  const go = (next) => { setOpenBranch(null); setMenuOpen(false); setTab(next); };

  const pageBody = (
    <>
        {openBranch ? (
          <BranchDetailPage
            branchId={openBranch.id}
            branchName={openBranch.name}
            canManageBranches={storeUser?.role === "owner" || !!storeUser?.canManageBranches}
            onBack={closeBranchDetail}
          />
        ) : tab === "home" ? (
          <DashboardPage onOpenBranch={openBranchDetail}
            onOpenApprovals={effectivePages(storeUser).includes("approvals") ? () => setTab("approvals") : undefined}
            onOpenHqDocs={effectivePages(storeUser).includes("hqDocs") ? () => setTab("hqDocs") : undefined}
            radiant={design === "radiant"} onGoTab={go} />
        ) : tab === "branches" ? (
          <BranchesPage storeUser={storeUser} onOpenBranch={openBranchDetail} />
        ) : tab === "analytics" ? (
          <AnalyticsPage />
        ) : tab === "users" ? (
          <UsersPage />
        ) : tab === "hqDocs" ? (
          <HqDocsPage storeUser={storeUser} />
        ) : tab === "control" ? (
          <ControlPage canManage={storeUser?.role === "owner" || !!storeUser?.canManageBranches} />
        ) : tab === "consolidated" ? (
          <ConsolidatedPage />
        ) : tab === "expenses" ? (
          <ExpensesPage canManage={storeUser?.role === "owner" || !!storeUser?.canManageBranches} />
        ) : tab === "approvals" ? (
          <ApprovalsPage canManage={storeUser?.role === "owner" || !!storeUser?.canManageBranches} />
        ) : tab === "policy" ? (
          <PolicyPage canManage={storeUser?.role === "owner" || !!storeUser?.canManageBranches} />
        ) : (
          <ReportPage />
        )}
    </>
  );

  // ── البسيط: صفحةٌ واحدة بلا تبويبات — ☰ يحمل كل شاشة والشكل، وكل شاشةٍ ترجع للرئيسية ──
  if (design === "simple") {
    const menuPages = [...PAGE_REGISTRY.filter((p) => allowed.includes(p.id)), ...(storeUser?.role === "owner" ? [USERS_PAGE] : [])];
    const atHome = !openBranch && tab === "home";
    return (
      <div className="min-h-screen text-neutral-100" style={{ background: "#1B1A17", color: "#F1ECE2" }}>
        <header className="sticky top-0 z-40" style={{ background: "rgba(27,26,23,.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #332F28" }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="القائمة" className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#2E2A20", border: "1px solid #4D4230", color: "#E4C47D" }}><Menu size={18} /></button>
            <img src="/brand/logo-mark-transparent.png" alt="أوقية" className="h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">أوقية — الإدارة المركزية</div>
              {storeUser?.name && <div className="text-xs truncate" style={{ color: "#8F887A" }}>{storeUser.name}</div>}
            </div>
            {!atHome && (
              <button type="button" onClick={() => go("home")} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: "#2E2A20", color: "#E4C47D", border: "1px solid #4D4230" }}><ChevronRight size={14} /> الرئيسية</button>
            )}
            <button type="button" onClick={handleLogout} aria-label="خروج" className="text-neutral-400 hover:text-neutral-100"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4">
          {atHome ? (
            <SimpleHqHome allowed={allowed} onGo={go} onOpenBranch={openBranchDetail} />
          ) : tab === "dashboard" && !openBranch ? (
            <DashboardPage onOpenBranch={openBranchDetail}
              onOpenApprovals={allowed.includes("approvals") ? () => go("approvals") : undefined}
              onOpenHqDocs={allowed.includes("hqDocs") ? () => go("hqDocs") : undefined} />
          ) : pageBody}
        </main>
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setMenuOpen(false)}>
            <div className="w-80 max-w-[85vw] h-full overflow-y-auto p-4" style={{ background: "#25231F", borderInlineEnd: "1px solid #332F28" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold">القائمة</span>
                <button type="button" onClick={() => setMenuOpen(false)} aria-label="إغلاق"><X size={20} /></button>
              </div>
              <div className="flex flex-col gap-1 mb-4">
                {menuPages.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button key={p.id} type="button" onClick={() => go(p.id)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-start"
                      style={{ background: tab === p.id && !openBranch ? "#2E2A20" : "transparent", color: tab === p.id ? "#E4C47D" : "#F1ECE2" }}>
                      <Icon size={17} /> {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-bold mb-2" style={{ color: "#D9B566" }}>شكل التطبيق</div>
              <DesignPicker design={design} onChange={(d) => { setMenuOpen(false); changeDesign(d); }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-neutral-100 ${design === "radiant" ? "ons-root" : "bg-neutral-950"}`}>
      <TopBar
        storeUser={storeUser}
        tab={tab}
        onTabChange={(next) => { setOpenBranch(null); setTab(next); }}
        onLogout={handleLogout}
        design={design}
        onDesign={changeDesign}
      />
      <main className="max-w-6xl mx-auto p-4">
        {pageBody}
      </main>
    </div>
  );
}

export { ApiError };
