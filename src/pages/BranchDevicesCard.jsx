import { useEffect, useState } from "react";
import { MonitorSmartphone, ShieldCheck, Tablet } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";
import EnrollCodeModal from "../ui/EnrollCodeModal.jsx";

const MODES = [
  ["off", "غير مفعّل", "الدخول من أي جهاز كما هو الآن"],
  ["managers", "المديرون فقط", "المدير ونائبه والمحاسب من أجهزتهم المربوطة فقط"],
  ["all", "كل الموظفين", "لا دخول إلا من جهازٍ مربوط أو من «جهاز الفرع»"],
];

/**
 * أجهزة الدخول المربوطة (migration 062): السياسة لكل فرع، وأجهزة كل موظف، وإلغاء جهازٍ ضاع،
 * ورمز «جهاز الفرع» للتابلت المشترك. الإلغاء يُخرج صاحبه من أول طلب.
 */
export default function BranchDevicesCard({ branchId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);
  const load = () => storeApi.fetchBranchDevices(branchId).then(setData).catch((e) => setError(hqError(e, "تعذّر تحميل الأجهزة")));
  useEffect(() => { load(); }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps
  const setMode = async (mode) => {
    if (!data || mode === data.lock) return;
    const req = mode === "all" ? data.staff : mode === "managers" ? data.staff.filter((s) => ["manager", "assistant", "accountant"].includes(s.role)) : [];
    const missing = req.filter((s) => !s.hasDevice);
    if (missing.length && !window.confirm(`${missing.length} موظف لم يربط جهازه بعد (${missing.map((s) => s.name).slice(0, 5).join("، ")}${missing.length > 5 ? "…" : ""}) — لن يستطيعوا الدخول حتى يربطوا. متابعة؟`)) return;
    setBusy(true); setError("");
    try { setData(await storeApi.setDeviceLock(branchId, mode)); } catch (e) { setError(hqError(e)); } finally { setBusy(false); }
  };
  const revoke = async (d) => {
    if (!window.confirm(`إلغاء ${d.shared ? "«جهاز الفرع»" : `جهاز ${d.userName}`}؟ سيخرج منه فورًا.`)) return;
    try { await storeApi.revokeBranchDevice(branchId, d.id); load(); } catch (e) { setError(hqError(e)); }
  };
  if (!data) return <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-xs text-neutral-500">{error || "جارِ تحميل الأجهزة…"}</div>;
  const active = data.devices.filter((d) => !d.revokedAt);
  const missing = data.staff.filter((s) => s.required && !s.hasDevice);
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold flex-1">أجهزة الدخول</h3>
        <button type="button" onClick={() => setShared(true)} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300">
          <Tablet size={13} /> رمز «جهاز الفرع»
        </button>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="grid sm:grid-cols-3 gap-2">
        {MODES.map(([id, label, hint]) => (
          <button key={id} type="button" disabled={busy} onClick={() => setMode(id)}
            className={`text-start rounded-lg border px-3 py-2 ${data.lock === id ? "border-amber-500/60 bg-amber-500/10" : "border-neutral-700 bg-neutral-950/50"}`}>
            <div className="text-sm font-bold">{data.lock === id ? "✓ " : ""}{label}</div>
            <div className="text-[11px] text-neutral-400">{hint}</div>
          </button>
        ))}
      </div>
      {missing.length > 0 && <div className="text-xs text-red-400">لم يربطوا جهازًا بعد ولا يستطيعون الدخول: {missing.map((s) => s.name).join("، ")} — «رمز ربط جهاز» بجانب كلٍّ منهم في الموظفين.</div>}
      {active.length === 0 ? <div className="text-xs text-neutral-500">لا أجهزة مربوطة بعد.</div> : (
        <div className="space-y-1.5">
          {active.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg bg-neutral-950/60 border border-neutral-800 px-3 py-2 text-xs">
              {d.shared ? <Tablet size={14} className="text-amber-400" /> : <MonitorSmartphone size={14} className="text-amber-400" />}
              <span className="font-medium">{d.shared ? "جهاز الفرع" : d.userName}</span>
              <span className="text-neutral-400 flex-1 truncate">{d.label} · رُبط {new Date(d.createdAt).toLocaleDateString("en-GB")}{d.lastSeenAt ? ` · آخر دخول ${new Date(d.lastSeenAt).toLocaleDateString("en-GB")}` : ""}</span>
              <button type="button" onClick={() => revoke(d)} className="text-red-400 hover:text-red-300">إلغاء</button>
            </div>
          ))}
        </div>
      )}
      {shared && <EnrollCodeModal branchId={branchId} shared onClose={() => { setShared(false); load(); }} />}
    </div>
  );
}
