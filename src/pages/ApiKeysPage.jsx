import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { API_BASE, storeApi } from "../core/api.js";

const when = (v) => (v ? new Date(v).toLocaleString("en-GB") : "—");
const RESOURCES = "items · sales · returns · journal · gold_ledger · customers · suppliers · lots · expenses · receipts · scrap · safe";

/**
 * الواجهة البرمجية العامّة: مفاتيح قراءةٍ فقط للأنظمة الأخرى (محاسبة خارجية · لوحات · متجر).
 * المفتاح يظهر مرّةً عند إنشائه ويُحفظ مُجزَّأً — من ضاع منه ينشئ غيره ويلغي القديم.
 */
export default function ApiKeysPage() {
  const [keys, setKeys] = useState(null);
  const [branches, setBranches] = useState([]);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState("ALL");
  const [fresh, setFresh] = useState(null);
  const [error, setError] = useState("");
  const load = () => storeApi.fetchApiKeys().then((d) => setKeys(d.keys || [])).catch((e) => setError(e?.status === 403 ? "للمالك وحده" : "تعذّر جلب المفاتيح"));
  useEffect(() => { load(); storeApi.fetchBranches().then((d) => setBranches(Array.isArray(d) ? d : d.branches || [])).catch(() => {}); }, []);
  const create = async () => {
    setError("");
    try { const r = await storeApi.createApiKey(label.trim(), scope); setFresh(r); setLabel(""); load(); }
    catch { setError("تعذّر إنشاء المفتاح"); }
  };
  const revoke = async (k) => {
    if (!window.confirm(`إلغاء المفتاح «${k.label}»؟ كل نظامٍ يستعمله يتوقّف فورًا.`)) return;
    try { await storeApi.revokeApiKey(k.id); load(); } catch { setError("تعذّر الإلغاء"); }
  };
  const base = `${API_BASE}/v1`;
  return (
    <div className="space-y-4" data-api-keys>
      <div className="flex items-center gap-2">
        <KeyRound size={20} className="text-amber-500" />
        <h2 className="text-lg font-semibold">الواجهة البرمجية للأنظمة الأخرى</h2>
      </div>
      <p className="text-xs text-neutral-400">قراءةٌ فقط: نظامٌ خارجي يقرأ بيانات الفروع بمفتاحٍ منك — لا يكتب ولا يحذف. لكل مفتاحٍ حدّ 120 طلبًا في الدقيقة وسجلّ استعمال.</p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="اسم النظام (مثلًا: برنامج المحاسب)" data-api-label
            className="flex-1 min-w-[200px] rounded-lg px-3 py-2 bg-neutral-950 border border-neutral-700 text-sm" />
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-lg px-2 py-2 bg-neutral-950 border border-neutral-700 text-sm">
            <option value="ALL">كل الفروع</option>
            {branches.map((b) => <option key={b.id} value={b.ref}>{b.name} ({b.ref})</option>)}
          </select>
          <button type="button" disabled={!label.trim()} onClick={create} data-api-create className="px-4 rounded-lg bg-amber-500 text-neutral-950 text-sm font-bold disabled:opacity-40">أنشئ مفتاحًا</button>
        </div>
        {fresh && (
          <div className="rounded-lg border border-amber-600/60 bg-amber-950/30 p-3 space-y-1" data-api-fresh>
            <p className="text-xs text-amber-300">انسخ المفتاح الآن — لن يظهر مرّةً أخرى:</p>
            <div className="flex gap-2 items-center">
              <code dir="ltr" className="flex-1 break-all text-xs bg-neutral-950 rounded px-2 py-1">{fresh.key}</code>
              <button type="button" onClick={() => navigator.clipboard?.writeText(fresh.key)} className="text-xs px-2 py-1 rounded border border-neutral-700">نسخ</button>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {(keys || []).map((k) => (
          <div key={k.id} data-api-key={k.hint} className={`rounded-xl border px-4 py-3 bg-neutral-900/60 ${k.revokedAt ? "border-neutral-800 opacity-50" : "border-neutral-700"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{k.label} <span dir="ltr" className="text-xs text-neutral-500">…{k.hint}</span></span>
              {!k.revokedAt && <button type="button" onClick={() => revoke(k)} className="text-xs px-2 py-1 rounded-lg border border-red-800 text-red-300">إلغاء</button>}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              {k.scope === "ALL" ? "كل الفروع" : `فرع ${k.scope}`} · أُنشئ {when(k.createdAt)}{k.createdBy ? ` بيد ${k.createdBy}` : ""} · آخر استعمال {when(k.lastUsedAt)} · {k.calls24h} طلبًا في 24 ساعة{k.revokedAt ? ` · أُلغي ${when(k.revokedAt)}` : ""}
            </div>
          </div>
        ))}
        {keys && keys.length === 0 && <p className="text-sm text-neutral-500">لا مفاتيح بعد.</p>}
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-[11px] text-neutral-400 space-y-1" dir="ltr">
        <div>GET {base}/branches</div>
        <div>GET {base}/{"{branch}"}/{"{resource}"}?since=&lt;ms&gt;&amp;limit=500</div>
        <div>Header: X-Api-Key: ounce_…</div>
        <div>resources: {RESOURCES}</div>
        <div>{"{ ok, data, meta: { count, next_since, has_more }, error }"}</div>
      </div>
    </div>
  );
}
