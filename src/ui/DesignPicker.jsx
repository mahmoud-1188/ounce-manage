import { DESIGNS } from "../core/design.js";

/// اختيار شكل الإدارة — يُحفظ على هذا الجهاز ويُطبَّق فورًا.
export default function DesignPicker({ design, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {Object.entries(DESIGNS).map(([id, d]) => {
        const on = design === id;
        return (
          <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onChange(id)}
            className={`text-start rounded-xl px-3 py-2.5 border ${on ? "border-amber-500/60 bg-amber-500/10" : "border-neutral-700 bg-neutral-900/60"}`}>
            <div className="text-sm font-bold flex items-center gap-2">
              {on ? "✓ " : ""}{d.label}
              {d.isNew && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg,#FFC83D,#FF8A00)", color: "#141A33" }}>جديد</span>}
            </div>
            <div className="text-[11px] text-neutral-400">{d.hint}</div>
          </button>
        );
      })}
    </div>
  );
}
