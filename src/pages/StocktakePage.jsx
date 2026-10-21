import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Lock, Unlock, ScanLine } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";
import RemoteStocktakeCard from "./RemoteStocktakeCard.jsx";

const wf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
const up = (c) => String(c || "").trim().toUpperCase();

/**
 * جرد الفروع من الإدارة (المرجع HqBranchStocktakePage): مسؤول الجرد يختار الفرع، يقفل مخزونه (يتوقّف بيعه
 * وتحويله)، ويعدّ رفّه بالمسح (قارئ الباركود أو RFID يكتب الرموز في الخانة) — فيعرف القطع الحاضرة والناقصة
 * بأعيانها والمجهولة والمباعة التي وُجدت. النتيجة تصل الفرع «تُعتمد الفروق» أو «تقريرٌ فقط»، ويُفتح القفل عند تطبيقها.
 * والعدّ اليدوي بالأعداد بلا قارئ في البطاقة أسفلها.
 */
export default function StocktakePage({ canManage }) {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanText, setScanText] = useState("");
  const [cat, setCat] = useState("");
  const [applyMode, setApplyMode] = useState("apply");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState("scan");
  useEffect(() => { storeApi.fetchBranches().then((d) => setBranches((Array.isArray(d) ? d : d.branches || []).filter((b) => !b.locked))).catch(() => setError("تعذّر تحميل الفروع")); }, []);
  const load = (id = branchId) => {
    setSheet(null); setError("");
    if (id) storeApi.fetchStocktakeSheet(id).then(setSheet).catch((e) => setError(hqError(e, "تعذّر تحميل رفّ الفرع")));
  };
  useEffect(() => { setScanText(""); setCat(""); setMsg(""); load(branchId); }, [branchId]);
  const cats = useMemo(() => [...new Set((sheet?.items || []).map((i) => i.category))].sort(), [sheet]);
  // نتيجة المسح: لكل صنفٍ في النطاق عدد قطعه المقروءة ورموز الناقص منها، والمقروء المجهول والمباع
  const scan = useMemo(() => {
    if (!sheet) return null;
    const read = new Set(scanText.split(/[\s,،;]+/).map((c) => up(sheet.epcs?.[up(c)] || c)).filter(Boolean));
    const items = sheet.items.filter((i) => !cat || i.category === cat);
    const all = new Set(sheet.items.flatMap((i) => i.codes.map(up)));
    const sold = new Set((sheet.sold || []).map(up));
    const entries = items.map((i) => {
      const codes = i.codes.map(up);
      const missing = codes.filter((c) => !read.has(c));
      return { itemId: i.id, ref: i.ref, category: i.category, karat: i.karat, weight: i.weight, expected: codes.length, countedQty: codes.length - missing.length, missingCodes: missing };
    });
    return {
      entries, read: read.size,
      matched: entries.reduce((a, e) => a + e.countedQty, 0), expected: entries.reduce((a, e) => a + e.expected, 0),
      missing: entries.flatMap((e) => e.missingCodes),
      soldFound: [...read].filter((c) => sold.has(c)), unknown: [...read].filter((c) => !all.has(c) && !sold.has(c)),
    };
  }, [sheet, scanText, cat]);
  const run = async (fn, ok) => {
    setBusy(true); setError(""); setMsg("");
    try { await fn(); setMsg(ok); load(); } catch (e) { setError(hqError(e, "تعذّر التنفيذ")); } finally { setBusy(false); }
  };
  const lock = (on) => run(() => storeApi.setStocktakeLock(branchId, on), on ? "قُفل مخزون الفرع للجرد — يتوقّف بيعه وتحويله" : "فُتح مخزون الفرع");
  const send = () => run(() => storeApi.sendRemoteStocktake(branchId,
    scan.entries.map((e) => ({ itemId: e.itemId, countedQty: e.countedQty, missingCodes: e.missingCodes })), note,
    { applyMode, unlock: true, scan: { matched: scan.matched, missing: scan.missing, unknown: scan.unknown, soldFound: scan.soldFound, expected: scan.expected } }),
  `أُرسل الجرد للفرع — ${applyMode === "apply" ? "تُعتمد الفروق" : "تقريرٌ فقط"} حين يطبّقه مديره، ويُفتح القفل`).then(() => setScanText(""));
  const input = "w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100";
  const chip = (on) => `px-3 py-1.5 rounded-lg text-xs border ${on ? "border-amber-600 text-amber-300 bg-amber-950/30" : "border-neutral-700 text-neutral-300"}`;
  return (
    <div className="space-y-4" data-hq-stocktake>
      <div className="flex items-center gap-2"><ClipboardCheck size={20} className="text-amber-500" /><h2 className="text-lg font-semibold">جرد الفروع — من الإدارة</h2></div>
      <p className="text-xs text-neutral-400 leading-6">اختر الفرع، ثم اقفل مخزونه (يتوقّف بيعه وتحويله) وعُدّ رفّه بالقارئ من هنا. حين تُنهي تصل النتيجة الفرع، فيطبّقها مديره بفروقها ويُفتح القفل.</p>
      <select data-hq-stocktake-branch value={branchId} onChange={(e) => setBranchId(e.target.value)} className={input}>
        <option value="">اختر الفرع…</option>
        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}
      {msg && <div className="text-sm text-emerald-400">{msg}</div>}
      {branchId && !sheet && !error && <div className="text-neutral-400 text-sm">جارِ التحميل…</div>}
      {sheet && (
        <>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
            <p className="text-xs text-neutral-300" data-hq-stocktake-status>
              {sheet.items.length} صنف على الرفّ · {sheet.items.reduce((a, i) => a + i.expected, 0)} قطعة
              {sheet.audits[0] ? ` · آخر جرد ${new Date(sheet.audits[0].at).toLocaleDateString("en-GB")}${sheet.audits[0].remote ? " (من الإدارة)" : ""}` : " · لا جرد سابق"}
              {sheet.lock ? ` · المخزون مقفل للجرد — ${sheet.lock.by}` : " · المخزون مفتوح"}
            </p>
            {canManage && (
              <button disabled={busy} data-hq-stocktake-lock={sheet.lock ? "off" : "on"} onClick={() => lock(!sheet.lock)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1 ${sheet.lock ? "border border-neutral-700 text-neutral-200" : "bg-amber-600 text-neutral-950"}`}>
                {sheet.lock ? <><Unlock size={13} /> افتح القفل</> : <><Lock size={13} /> اقفل المخزون وابدأ الجرد</>}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className={chip(mode === "scan")} onClick={() => setMode("scan")}>العدّ بالمسح</button>
            <button className={chip(mode === "manual")} onClick={() => setMode("manual")}>العدّ اليدوي بالأعداد</button>
          </div>
          {mode === "manual" ? <RemoteStocktakeCard branchId={branchId} /> : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
              <div className="flex items-center gap-2"><ScanLine size={16} className="text-amber-500" /><h3 className="text-sm font-semibold">العدّ بالمسح</h3></div>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className={input}>
                <option value="">الجرد الشامل — كل الأقسام</option>
                {cats.map((c) => <option key={c} value={c}>قسم: {c || "بلا تصنيف"}</option>)}
              </select>
              <textarea rows={5} value={scanText} onChange={(e) => setScanText(e.target.value)} data-hq-stocktake-scan
                placeholder="امسح القطع بالقارئ هنا — كل رمزٍ في سطر (الباركود أو رقاقة RFID)" className={`${input} font-mono`} />
              {scan && (
                <div className="text-xs space-y-1" data-hq-stocktake-result>
                  <p className="text-neutral-300">قُرئ {scan.read} · حاضر {scan.matched} من {scan.expected} · <span className={scan.missing.length ? "text-red-400" : "text-emerald-400"}>ناقص {scan.missing.length}</span>
                    {scan.unknown.length ? <span className="text-amber-300"> · مجهول {scan.unknown.length}</span> : null}
                    {scan.soldFound.length ? <span className="text-amber-300"> · مباعٌ وُجد {scan.soldFound.length}</span> : null}</p>
                  {scan.missing.length > 0 && scan.read > 0 && <p className="text-neutral-500 font-mono break-all">الناقص: {scan.missing.slice(0, 40).join(" · ")}{scan.missing.length > 40 ? " …" : ""}</p>}
                  {scan.unknown.length > 0 && <p className="text-neutral-500 font-mono break-all">مجهول: {scan.unknown.slice(0, 20).join(" · ")}</p>}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {[["apply", "تُعتمد الفروق"], ["report", "تقريرٌ فقط"]].map(([id, l]) => <button key={id} className={chip(applyMode === id)} onClick={() => setApplyMode(id)}>{l}</button>)}
              </div>
              <p className="text-xs text-neutral-500">{applyMode === "apply" ? "العجز والزيادة يُقيَّدان حين يطبّقه مدير الفرع — والناقص يخرج برموزه بعينها." : "يُحفظ الجرد بفروقه في سجلّ الفرع ولا يتغيّر مخزونه ولا دفتره."}</p>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" className={input} />
              {canManage && (
                <button disabled={busy || !scan || !scan.read} onClick={send} data-hq-stocktake-send
                  className="w-full text-sm px-4 py-2 rounded-lg font-semibold bg-amber-600 text-neutral-950 hover:bg-amber-500 disabled:opacity-50">
                  {busy ? "يُرسل…" : `أنهِ الجرد وأرسله للفرع (${scan?.entries.length || 0} صنف)`}
                </button>
              )}
            </div>
          )}
          {sheet.audits.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-1" data-hq-stocktake-history>
              <h3 className="text-sm font-semibold mb-1">جرود الفرع السابقة</h3>
              {sheet.audits.map((a, i) => (
                <p key={i} className="text-xs text-neutral-400">
                  {new Date(a.at).toLocaleDateString("en-GB")}{a.remote ? ` · من الإدارة (${a.countedBy || "—"})` : " · من الفرع"} · {a.entries || 0} صنف
                  {a.reportOnly ? " · تقريرٌ فقط" : a.missingValue || a.surplusValue ? ` · عجز ${wf.format(a.missingValue || 0)} · زيادة ${wf.format(a.surplusValue || 0)}` : " · مطابق"}
                  {a.scan ? ` · ناقص ${(a.scan.missing || []).length}` : ""}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
