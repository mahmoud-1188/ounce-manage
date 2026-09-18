import { LogOut, Building2, BarChart3, LayoutDashboard } from "lucide-react";

export default function TopBar({ storeUser, tab, onTabChange, onLogout }) {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/brand/logo-mark-transparent.png" alt="أوقية" className="h-8 w-8" />
          <div>
            <div className="font-semibold text-sm">أوقية — الإدارة المركزية</div>
            {storeUser?.name && (
              <div className="text-xs text-neutral-400">{storeUser.name}</div>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-neutral-800/60 rounded-lg p-1">
          <TabButton
            active={tab === "home"}
            onClick={() => onTabChange("home")}
            icon={<LayoutDashboard size={16} />}
            label="الرئيسية"
          />
          <TabButton
            active={tab === "branches"}
            onClick={() => onTabChange("branches")}
            icon={<Building2 size={16} />}
            label="الفروع"
          />
          <TabButton
            active={tab === "report"}
            onClick={() => onTabChange("report")}
            icon={<BarChart3 size={16} />}
            label="التقرير المجمّع"
          />
        </nav>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
        >
          <LogOut size={16} />
          خروج
        </button>
      </div>
    </header>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
        active ? "bg-neutral-100 text-neutral-900" : "text-neutral-300 hover:text-neutral-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
