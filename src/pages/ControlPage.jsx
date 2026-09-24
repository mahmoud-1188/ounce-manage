import { useEffect, useState } from "react";
import { Coins, Megaphone, Trash2 } from "lucide-react";
import { storeApi } from "../core/api.js";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => money.format(Number(n) || 0);

function applyMarkup(world, mode, value) {
  const w = Number(world) || 0, v = Number(value) || 0;
  if (!(v > 0)) return w;
  return Math.round((mode === "percent" ? w * (1 + v / 100) : w + v) * 100) / 100;
}

/**
 * التحكّم — ما تعتمده الإدارة لكل الفروع (v197 في المرجع):
 *   ① زيادة الإدارة على السعر العالمي: سعر العمل في الفروع = العالمي +
 *      الزيادة (ريال/جم24 أو ٪)، وعالمي يدوي اختياري يحلّ محلّ الجلب الآلي.
 *   ② إعلاناتٌ تظهر في رئيسية كل فرع حتى تاريخ انتهائها.
 */
export default function ControlPage({ canManage }) {
  const [policy, setPolicy] = useState(null);
  const [mode, setMode] = useState("amount");
  const [value, setValue] = useState("");
  const [manual, setManual] = useState("");
  const [notices, setNotices] = useState(null);
  const [text, setText] = useState("");
  const [days, setDays] = useState("7");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    storeApi.fetchPricePolicy().then(({ policy: p }) => {
      setPolicy(p);
      setMode(p?.markup?.mode || "amount");
      setValue(p?.markup ? String(p.markup.value) : "");
      setManual(p?.world24Manual ? String(p.world24Manual) : "");
    }).catch(() => setError("تعذّر تحميل سياسة السعر"));
    storeApi.fetchNotices().then((d) => setNotices(d.notices || [])).catch(() => setNotices([]));
  }, []);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };

  const savePolicy = async () => {
    setBusy(true); setError("");
    try {
      const r = await storeApi.savePricePolicy({ mode, value: Number(value) || 0, world24Manual: manual ? Number(manual) : null });
      setPolicy(r.policy);
      flash("اعتُمدت الزيادة — تُطبَّق آليًّا في كل الفروع على كل سعرٍ عالمي يصلها");
    } catch (err) {
      setError(err?.body?.error === "invalid_markup" ? "زيادةٌ غير صالحة (النسبة حتى 100٪)" : "تعذّر حفظ سياسة السعر");
    } finally { setBusy(false); }
  };

  const addNotice = async () => {
    if (!text.trim()) return;
    setBusy(true); setError("");
    try {
      const r = await storeApi.createNotice(text.trim(), Number(days) || 7);
      setNotices((n) => [r.notice, ...(n || [])]);
      setText("");
      flash("نُشر الإعلان لكل الفروع");
    } catch { setError("تعذّر نشر الإعلان"); } finally { setBusy(false); }
  };

  const removeNotice = async (id) => {
    try { await storeApi.deleteNotice(id); setNotices((n) => (n || []).filter((x) => x.id !== id)); }
    catch { setError("تعذّر حذف الإعلان"); }
  };

  const example = Number(manual) > 0 ? Number(manual) : 500;
  const input = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">التحكّم</h2>
      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
      {msg && <div className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">{msg}</div>}

      <div className="rounded-xl border border-amber-500/30 bg-neutral-900 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold">سعر الذهب في كل الفروع</h3>
        </div>
        <p className="text-xs text-neutral-400">
          {policy
            ? `المعتمد الآن: ${policy.markup ? `زيادة ${policy.markup.mode === "percent" ? `${policy.markup.value}٪` : `${fmt(policy.markup.value)}/جم`}` : "لا زيادة"} · ${policy.world24Manual ? `عالمي يدوي ${fmt(policy.world24Manual)}` : "العالمي آلي"}${policy.at ? ` · ${new Date(policy.at).toLocaleString("en-GB")} — ${policy.by || ""}` : ""}`
            : "جارِ التحميل…"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-xs text-neutral-400 space-y-1">
            <span>الزيادة المعتمدة</span>
            <input className={input} inputMode="decimal" value={value} disabled={!canManage} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
          </label>
          <label className="text-xs text-neutral-400 space-y-1">
            <span>نوعها</span>
            <select className={input} value={mode} disabled={!canManage} onChange={(e) => setMode(e.target.value)}>
              <option value="amount">ريال / جم24</option>
              <option value="percent">نسبة ٪</option>
            </select>
          </label>
          <label className="text-xs text-neutral-400 space-y-1">
            <span>سعر عالمي يدوي (اختياري)</span>
            <input className={input} inputMode="decimal" value={manual} disabled={!canManage} onChange={(e) => setManual(e.target.value.replace(/[^\d.]/g, ""))} placeholder="آلي" />
          </label>
        </div>
        <p className="text-xs text-neutral-300">
          المثال: عالمي {fmt(example)} + زيادة {Number(value) > 0 ? (mode === "percent" ? `${value}٪` : `${fmt(value)}/جم`) : "0"} ={" "}
          <span className="text-amber-400 font-semibold">{fmt(applyMarkup(example, mode, value))}</span> سعر العمل في الفرع
        </p>
        {canManage && (
          <button type="button" onClick={savePolicy} disabled={busy}
            className="w-full rounded-lg py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950">
            اعتمد الزيادة وانشرها لكل الفروع
          </button>
        )}
        <p className="text-[11px] text-neutral-500">
          ⚖ الزيادة تُطبَّق آليًّا في كل فرع على كل سعرٍ عالمي يصله (جلبٌ كل دقيقتين أو إدخالٌ يدوي)، والفرع يعرض التركيب «عالمي + زيادة = سعر العمل».
          اترك «السعر العالمي اليدوي» فارغًا ليبقى الجلب آليًّا.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold">إعلانٌ لكل الفروع</h3>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <input className={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="يظهر في رئيسية كل فرع" />
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 text-sm" value={days} onChange={(e) => setDays(e.target.value)}>
              {["1", "3", "7", "14", "30"].map((d) => <option key={d} value={d}>{d} يوم</option>)}
            </select>
            <button type="button" onClick={addNotice} disabled={busy || !text.trim()}
              className="rounded-lg px-3 text-sm font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950">نشر</button>
          </div>
        )}
        {notices === null ? (
          <div className="text-xs text-neutral-500">جارِ التحميل…</div>
        ) : notices.length === 0 ? (
          <div className="text-xs text-neutral-500">لا إعلانات سارية.</div>
        ) : (
          <div className="space-y-1.5">
            {notices.map((n) => (
              <div key={n.id} className="flex items-start gap-2 rounded-lg border border-neutral-800 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-neutral-200">{n.text}</div>
                  <div className="text-[11px] text-neutral-500">{n.by || "الإدارة"} · حتى {new Date(n.until).toLocaleDateString("en-GB")}</div>
                </div>
                {canManage && (
                  <button type="button" onClick={() => removeNotice(n.id)} className="text-red-400" title="حذف"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
