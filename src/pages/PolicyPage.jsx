import { useEffect, useMemo, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

/**
 * الصلاحيات المركزية — تبويبا «الشاشات» و«العمليات» في المرجع:
 *   • الشاشات: لكل دور (في كل الفروع أو فرعٍ بعينه) — بيد الفرع ← ممنوعة ←
 *     ممنوحة. ما تمنعه الإدارة يُغلق مهما فتحه المدير، وما تمنحه يُفتح ولو
 *     لم يملكه الدور. المنع يغلب المنح.
 *   • العمليات: منعُ الفعل نفسه (لا إخفاء الشاشة) — فلا يقع من أي مكان.
 * الخادم يفرض الاثنين على كل طلب.
 */
const clone = (x) => JSON.parse(JSON.stringify(x || {}));

export default function PolicyPage({ canManage }) {
  const [meta, setMeta] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [saved, setSaved] = useState("{}");
  const [mode, setMode] = useState("screens");
  const [role, setRole] = useState("employee");
  const [scope, setScope] = useState("*");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    storeApi.fetchHqPolicy().then((d) => {
      setMeta(d); setPolicy(clone(d.policy)); setSaved(JSON.stringify(d.policy));
    }).catch(() => setError("تعذّر تحميل السياسة"));
  }, []);

  // «كل الأدوار» للعمليات فقط — الشاشات تُضبط لدورٍ بعينه
  const effRole = mode === "screens" && role === "*" ? "employee" : role;
  const entry = useMemo(() => {
    if (!policy) return {};
    return (scope === "*" ? policy.byRole?.[effRole] : policy.byBranch?.[scope]?.[effRole]) || {};
  }, [policy, scope, effRole]);

  const writeEntry = (next) => {
    const p = clone(policy);
    const empty = !(next.deny?.length || next.grant?.length || next.denyActions?.length);
    if (scope === "*") {
      p.byRole = p.byRole || {};
      if (empty) delete p.byRole[effRole]; else p.byRole[effRole] = next;
    } else {
      p.byBranch = p.byBranch || {};
      const m = { ...(p.byBranch[scope] || {}) };
      if (empty) delete m[effRole]; else m[effRole] = next;
      if (Object.keys(m).length) p.byBranch[scope] = m; else delete p.byBranch[scope];
    }
    setPolicy(p);
  };

  const cycleScreen = (id) => {
    if (!canManage) return;
    const d = new Set(entry.deny || []), g = new Set(entry.grant || []);
    if (d.has(id)) { d.delete(id); g.add(id); } else if (g.has(id)) g.delete(id); else d.add(id);
    writeEntry({ ...entry, deny: [...d], grant: [...g] });
  };
  const toggleAction = (id) => {
    if (!canManage) return;
    const d = new Set(entry.denyActions || []);
    if (d.has(id)) d.delete(id); else d.add(id);
    writeEntry({ ...entry, denyActions: [...d] });
  };

  const dirty = policy && JSON.stringify(policy) !== saved;
  const save = async () => {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await storeApi.saveHqPolicy(policy);
      setPolicy(clone(r.policy)); setSaved(JSON.stringify(r.policy));
      setMsg("اعتُمدت السياسة — تسري على كل طلبٍ في الفروع فورًا، وتظهر في شاشاتها عند التحديث التالي");
    } catch (e) { setError(hqError(e, "تعذّر حفظ السياسة")); } finally { setBusy(false); }
  };

  if (!meta || !policy) {
    return <div className="text-sm text-neutral-400">{error || "جارِ التحميل…"}</div>;
  }

  const roleLabel = (id) => (id === "*" ? "كل الأدوار" : meta.roles.find((r) => r.id === id)?.label || id);
  const branchLabel = (id) => meta.branches.find((b) => b.id === id)?.name || "فرع";
  const deny = new Set(entry.deny || []), grant = new Set(entry.grant || []), dAct = new Set(entry.denyActions || []);
  const screens = meta.screens.filter((s) => !q || s.label.includes(q) || s.id.toLowerCase().includes(q.toLowerCase()));

  // ملخّص كل ما هو مضبوط الآن
  const summary = [];
  Object.entries(policy.byRole || {}).forEach(([r, e]) => summary.push({ scope: "كل الفروع", role: roleLabel(r), e }));
  Object.entries(policy.byBranch || {}).forEach(([b, m]) => Object.entries(m).forEach(([r, e]) => summary.push({ scope: branchLabel(b), role: roleLabel(r), e })));

  const sel = "rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LockKeyhole size={20} className="text-amber-500" />
        <h2 className="text-lg font-semibold">الصلاحيات المركزية</h2>
      </div>
      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
      {msg && <div className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">{msg}</div>}

      <div className="rounded-xl border border-amber-500/30 bg-neutral-900 p-3 text-xs text-neutral-400 leading-6">
        {mode === "screens" ? (
          <>ما تُغلقه هنا يُغلق في الفرع مهما فتحه مديره، وما تمنحه يُفتح ولو لم يملكه الدور، وما تتركه «بيد الفرع» يبقى بقرار مديره. <b className="text-neutral-200">المنع يغلب المنح</b> — فخطأٌ في الضبط يُغلق لا يفتح.</>
        ) : (
          <><b className="text-neutral-200">الشاشة تُخفى، والعملية تُمنع.</b> إغلاق شاشة «النقد» لا يمنع البيع النقدي — هنا تمنع الفعل نفسه فلا يقع من أي شاشة، ويرفضه الخادم.</>
        )}
      </div>

      <div className="flex gap-1 bg-neutral-800/60 rounded-lg p-1">
        {[["screens", "الشاشات"], ["actions", "العمليات"]].map(([id, l]) => (
          <button key={id} type="button" onClick={() => setMode(id)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm ${mode === id ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"}`}>{l}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-neutral-400 space-y-1">
          <span>الدور</span>
          <select className={`w-full ${sel}`} value={effRole} onChange={(e) => setRole(e.target.value)}>
            {mode === "actions" && <option value="*">كل الأدوار</option>}
            {meta.roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-neutral-400 space-y-1">
          <span>النطاق</span>
          <select className={`w-full ${sel}`} value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="*">كل الفروع</option>
            {meta.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      </div>
      {scope !== "*" && mode === "screens" && (
        <p className="text-[11px] text-neutral-500">⚖ قيد هذا الفرع للدور يحلّ محلّ قيد «كل الفروع» له بالكامل.</p>
      )}

      {mode === "screens" ? (
        <>
          <div className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن شاشة"
              className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-sm" />
            <span className="text-xs text-neutral-500 shrink-0">{deny.size + grant.size === 0 ? "لا تدخّل" : `${deny.size} ممنوعة · ${grant.size} ممنوحة`}</span>
          </div>
          <p className="text-[11px] text-neutral-500">اضغط الشاشة لتنتقل: بيد الفرع ← ممنوعة ← ممنوحة ← بيد الفرع.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {screens.map((s) => {
              const off = deny.has(s.id), on = grant.has(s.id);
              return (
                <button key={s.id} type="button" onClick={() => cycleScreen(s.id)} disabled={!canManage}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-start ${off ? "border-red-900 bg-red-950/40 text-red-300" : on ? "border-emerald-900 bg-emerald-950/30 text-emerald-300" : "border-neutral-800 bg-neutral-900 text-neutral-200"}`}>
                  <span>{s.label}</span>
                  <span className="text-[11px] opacity-80">{off ? "ممنوعة" : on ? "ممنوحة" : "بيد الفرع"}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {Object.entries(meta.actionGroups).map(([g, gl]) => (
            <div key={g} className="space-y-1.5">
              <div className="text-xs font-semibold text-amber-400">{gl}</div>
              {meta.actions.filter((a) => a.group === g).map((a) => {
                const off = dAct.has(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => toggleAction(a.id)} disabled={!canManage}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${off ? "border-red-900 bg-red-950/40 text-red-300" : "border-neutral-800 bg-neutral-900 text-neutral-200"}`}>
                    <span>{a.label}</span>
                    <span className={`text-[11px] ${off ? "" : "text-emerald-400"}`}>{off ? "ممنوعة" : "مسموحة"}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="sticky bottom-2">
          <button type="button" onClick={save} disabled={busy || !dirty}
            className="w-full rounded-lg py-2.5 text-sm font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 shadow-lg">
            {dirty ? "اعتمد السياسة وانشرها للفروع" : "لا تغييرات"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 space-y-1.5">
        <div className="text-xs font-semibold">المضبوط الآن{meta.at ? <span className="text-neutral-500 font-normal"> · آخر اعتماد {new Date(meta.at).toLocaleString("en-GB")}{meta.by ? ` — ${meta.by}` : ""}</span> : null}</div>
        {summary.length === 0 ? <div className="text-xs text-neutral-500">لا تدخّل — كل الشاشات والعمليات بيد الفروع.</div> : summary.map((x, i) => (
          <div key={i} className="text-[11px] text-neutral-400">
            <span className="text-neutral-200">{x.role}</span> · {x.scope} ·{" "}
            {[x.e.deny?.length && `${x.e.deny.length} شاشة ممنوعة`, x.e.grant?.length && `${x.e.grant.length} ممنوحة`, x.e.denyActions?.length && `${x.e.denyActions.length} عملية ممنوعة`].filter(Boolean).join(" · ")}
          </div>
        ))}
      </div>
    </div>
  );
}
