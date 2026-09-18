import { LogOut } from "lucide-react";
import { PAGE_REGISTRY, USERS_PAGE, effectivePages } from "../core/pageRegistry.js";

export default function TopBar({ storeUser, tab, onTabChange, onLogout }) {
  const allowed = effectivePages(storeUser);
  const visiblePages = PAGE_REGISTRY.filter((p) => allowed.includes(p.id));
  const tabs = storeUser?.role === "owner" ? [...visiblePages, USERS_PAGE] : visiblePages;

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

        <nav className="flex items-center gap-1 bg-neutral-800/60 rounded-lg p-1 overflow-x-auto">
          {tabs.map((p) => {
            const Icon = p.icon;
            return (
              <TabButton
                key={p.id}
                active={tab === p.id}
                onClick={() => onTabChange(p.id)}
                icon={<Icon size={16} />}
                label={p.label}
              />
            );
          })}
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm shrink-0 transition-colors ${
        active ? "bg-neutral-100 text-neutral-900" : "text-neutral-300 hover:text-neutral-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
