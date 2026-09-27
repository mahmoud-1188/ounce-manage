import { useEffect, useState } from "react";
import { AlertTriangle, Network } from "lucide-react";
import { storeApi } from "../core/api.js";
import { PAGE_REGISTRY } from "../core/pageRegistry.js";
import { HQ_ROLES, SOD_CONFLICTS, conflictsOf } from "../core/hqRoles.js";
import { hqError } from "../ui/hqErrors.js";

/**
 * الهيكل الإداري (المرجع HqOrgChart · migration 061): أدوار الإدارة ومهامّها، ومن يشغل كلًّا منها،
 * وتعارضات فصل المهام في صلاحيات كل موظف. المالك يُسند الدور ويطبّق صلاحياته المقترحة بضغطة.
 */
export default function OrgPage({ isOwner }) {
  const [users, setUsers] = useState(null);
  const [msg, setMsg] = useState(null);
  const all = PAGE_REGISTRY.map((p) => p.id);
  const load = () => storeApi.fetchUsers().then((d) => setUsers(Array.isArray(d) ? d : d.users || [])).catch(() => setUsers([]));
  useEffect(() => { if (isOwner) load(); else setUsers([]); }, [isOwner]);
  const setRole = async (u, hqRole) => {
    setMsg(null);
    try { await storeApi.setUserHqRole(u.id, hqRole || null); load(); } catch (e) { setMsg({ bad: true, text: hqError(e) }); }
  };
  const applyPreset = async (u) => {
    const r = HQ_ROLES[u.hqRole]; if (!r) return;
    setMsg(null);
    try {
      await storeApi.updateUser(u.id, { allowedPages: r.pages, canManageBranches: r.manage, canSendCoding: r.coding });
      setMsg({ text: `طُبّقت صلاحيات «${r.label}» على ${u.name}` }); load();
    } catch (e) { setMsg({ bad: true, text: hqError(e) }); }
  };
  const staff = (users || []).filter((u) => u.role !== "owner");
  const owners = (users || []).filter((u) => u.role === "owner");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Network size={20} className="text-amber-500" />
        <h2 className="text-lg font-semibold">الهيكل الإداري</h2>
      </div>
      {msg && <div className={`text-sm ${msg.bad ? "text-red-400" : "text-emerald-400"}`}>{msg.text}</div>}
      {isOwner && users && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
          <h3 className="text-sm font-semibold">موظفو الإدارة وأدوارهم</h3>
          {owners.map((u) => <div key={u.id} className="text-xs text-neutral-400">{u.name} — المالك (كل الصلاحيات)</div>)}
          {staff.length === 0 && <div className="text-xs text-neutral-500">لا موظفين بعد — أضفهم من «الموظفون».</div>}
          {staff.map((u) => {
            const r = HQ_ROLES[u.hqRole];
            const conflicts = conflictsOf(u, all);
            const matches = r && JSON.stringify(r.pages == null ? null : [...r.pages].sort()) === JSON.stringify(u.allowedPages == null ? null : [...u.allowedPages].sort())
              && !!u.canManageBranches === r.manage && !!u.canSendCoding === r.coding;
            return (
              <div key={u.id} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium flex-1">{u.name} <span className="text-xs text-neutral-500">{u.email}</span></span>
                  <select value={u.hqRole || ""} onChange={(e) => setRole(u, e.target.value)} className="rounded-lg bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs">
                    <option value="">بلا دور</option>
                    {Object.entries(HQ_ROLES).map(([id, x]) => <option key={id} value={id}>{x.label}</option>)}
                  </select>
                  {r && !matches && <button type="button" onClick={() => applyPreset(u)} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950">طبّق صلاحيات الدور</button>}
                  {r && matches && <span className="text-[11px] text-emerald-400">صلاحياته تطابق دوره</span>}
                </div>
                {conflicts.map((c) => (
                  <div key={c.a + c.b} className="flex items-start gap-1.5 text-[11px] text-amber-300"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> تعارض {HQ_ROLES[c.a]?.label || c.a} و{HQ_ROLES[c.b]?.label || c.b}: {c.why}</div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(HQ_ROLES).map(([id, r]) => {
          const holders = staff.filter((u) => u.hqRole === id);
          return (
            <div key={id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold flex-1">{r.label}</span>
                {r.readOnly && <span className="text-[10px] px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-400">قراءة فقط</span>}
              </div>
              <div className="text-xs text-neutral-400">{r.hint}</div>
              <div className="flex flex-wrap gap-1">{r.duties.map((d) => <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">{d}</span>)}</div>
              <div className="text-[11px] text-neutral-500">الشاشات: {r.pages == null ? "كلها" : r.pages.map((p) => PAGE_REGISTRY.find((x) => x.id === p)?.label || p).join(" · ")}{r.manage ? " · يدير الفروع" : ""}{r.coding ? " · يرسل التكويد" : ""}</div>
              {isOwner && <div className="text-[11px] text-amber-300">{holders.length ? holders.map((u) => u.name).join("، ") : "شاغر"}</div>}
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-1.5">
        <h3 className="text-sm font-semibold">فصل المهام — ما لا يُجمع في شخصٍ واحد</h3>
        <p className="text-[11px] text-neutral-500">تُعرض لا تُمنع: شركةٌ صغيرة قد تجمع دورين، لكنها يجب أن تعرف ما قبلت.</p>
        {SOD_CONFLICTS.map((c) => <div key={c.a + c.b} className="text-xs"><b>{HQ_ROLES[c.a].label} + {HQ_ROLES[c.b].label}</b> — <span className="text-neutral-400">{c.why}</span></div>)}
      </div>
    </div>
  );
}
