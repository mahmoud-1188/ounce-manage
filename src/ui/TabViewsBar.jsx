import { ExternalLink } from "lucide-react";

/**
 * شاشات التبويب المفتوح (المرجع: رقائق العروض تحت التبويب) — «الفروع · الامتثال · لوحة الإدارة» مثلًا.
 * شاشة دفتر الإدارة («book:») تُعلَّم بسهمٍ لأنها تُفتح في تطبيق الفرع على الفرع الرئيسي.
 */
export default function TabViewsBar({ tab, current, onGo }) {
  if (!tab || tab.views.length < 2) return null;
  return (
    <nav aria-label={`شاشات ${tab.label}`} className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
      {tab.views.map((x) => {
        const on = x.id === current;
        const ext = x.id.startsWith("book:");
        return (
          <button key={x.id} type="button" onClick={() => { if (!on) onGo(x.id); }} aria-current={on ? "page" : undefined}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${on ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 text-neutral-300"}`}>
            {x.label}{ext && <ExternalLink size={11} />}
          </button>
        );
      })}
    </nav>
  );
}
