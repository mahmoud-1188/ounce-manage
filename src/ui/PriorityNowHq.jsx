import { Check } from "lucide-react";

/// «الآن» في المُضيء (الإدارة): المهامّ مرقّمةً بأولويّتها — ما يوقف العمل ينبض، ويختفي ما يُنجَز.
const LEVEL = { block: ["يوقف العمل", "text-red-300 bg-red-500/15 border-red-500/40"], act: ["ينتظرك", "text-amber-200 bg-amber-500/15 border-amber-500/40"], soon: ["حان وقته", "text-cyan-200 bg-cyan-500/15 border-cyan-500/40"] };
export default function PriorityNowHq({ tasks = [], onPick }) {
  return (
    <div className="ons-in">
      <div className="flex items-center gap-2 mb-2">
        <span className="ons-dot w-2 h-2 rounded-full" style={{ background: tasks.length ? "#FFC940" : "#3DF5A0" }} />
        <h3 className="text-sm font-black">الآن</h3>
        {tasks.length > 0 && <span className="text-[11px] text-neutral-400">مرتّبةً بأولويّتها</span>}
      </div>
      {tasks.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <Check size={18} className="text-emerald-400" /> <span className="text-sm font-bold">كل شيءٍ على ما يرام — لا شيء ينتظرك</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((t, i) => (
            <button key={t.id + i} type="button" onClick={() => onPick(t)}
              className={`ons-tile ons-in w-full text-start flex items-center gap-3 rounded-2xl border px-3 py-3 bg-white/5 backdrop-blur ${LEVEL[t.level][1]} ${t.level === "block" ? "ons-live" : ""}`}
              style={{ animationDelay: `${60 * i}ms` }}>
              <span className="flex items-center justify-center w-8 h-8 rounded-xl font-black bg-black/30">{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-extrabold text-neutral-100">{t.label}</span>
                <span className="block text-[11px] text-neutral-400 truncate">{t.hint}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border">{LEVEL[t.level][0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
