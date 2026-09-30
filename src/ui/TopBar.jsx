import { useState } from "react";
import { LogOut, Palette } from "lucide-react";
import DesignPicker from "./DesignPicker.jsx";
import { hubOfPage, visibleHubs } from "../core/pageRegistry.js";

export default function TopBar({ storeUser, tab, onTabChange, onLogout, design, onDesign }) {
  const [showDesign, setShowDesign] = useState(false);
  const hubs = visibleHubs(storeUser);
  const current = hubs.find((h) => h.key === hubOfPage(tab)?.key) || null;

  return (
    <header className={`border-b border-neutral-800 ${design === "radiant" ? "bg-neutral-900/60 backdrop-blur" : "bg-neutral-900"}`}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <img src="/brand/logo-mark-transparent.png" alt="أونصة" className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">أونصة — الإدارة المركزية</div>
            {storeUser?.name && (
              <div className="text-xs text-neutral-400 truncate">{storeUser.name}</div>
            )}
          </div>
        </div>

        {onDesign && (
          <div className="relative order-2 sm:order-3 shrink-0">
            <button type="button" onClick={() => setShowDesign((v) => !v)} aria-label="شكل التطبيق"
              className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-100"><Palette size={16} /> الشكل</button>
            {showDesign && (
              <div className="absolute z-50 mt-2 end-0 w-72 rounded-2xl border border-neutral-700 bg-neutral-900 p-3 shadow-2xl">
                <div className="text-xs font-bold text-amber-400 mb-2">شكل التطبيق</div>
                <DesignPicker design={design} onChange={(d) => { setShowDesign(false); onDesign(d); }} />
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-100 transition-colors shrink-0 order-2 sm:order-3"
        >
          <LogOut size={16} />
          خروج
        </button>

        <nav aria-label="أبواب الإدارة" className="flex items-center gap-1 bg-neutral-800/60 rounded-lg p-1 overflow-x-auto min-w-0 w-full sm:w-auto order-3 sm:order-2">
          {hubs.map((h) => {
            const Icon = h.icon;
            return (
              <TabButton
                key={h.key}
                active={current?.key === h.key}
                onClick={() => { if (current?.key !== h.key) onTabChange(h.pages[0].id); }}
                icon={<Icon size={16} />}
                label={h.label}
              />
            );
          })}
        </nav>
      </div>
      {/* شاشات الباب المفتوح — لا صفّ لبابٍ بشاشةٍ واحدة */}
      {current && current.pages.length > 1 && (
        <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto" aria-label={`شاشات ${current.label}`}>
          {current.pages.map((p) => {
            const Icon = p.icon;
            const on = tab === p.id;
            return (
              <button key={p.id} type="button" onClick={() => { if (!on) onTabChange(p.id); }} aria-current={on ? "page" : undefined}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs shrink-0 ${on ? "bg-neutral-800 text-neutral-100 font-semibold" : "text-neutral-400 hover:text-neutral-100"}`}>
                <Icon size={13} /> {p.label}
              </button>
            );
          })}
        </div>
      )}
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
