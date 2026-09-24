import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { storeApi } from "../core/api.js";
import { hqError } from "../ui/hqErrors.js";

const PROFILE_FIELDS = [
  ["storeName", "اسم المحل على الفاتورة"], ["legalName", "الاسم القانوني"],
  ["crNumber", "السجل التجاري", true], ["vatNumber", "الرقم الضريبي", true],
  ["phone", "الجوال", true], ["email", "البريد", true],
  ["city", "المدينة"], ["managerName", "مدير الفرع"],
  ["address", "العنوان"], ["website", "الموقع الإلكتروني", true],
];
const KARATS = ["24", "22", "21", "18"];
const THRESHOLDS = [["expense", "حدّ المصروف"], ["refund", "حدّ الردّ"], ["supplier_settle", "حدّ السداد"]];

/**
 * تجهيز الفرع من الإدارة (HqBranchProvisionForm في المرجع) — هويته على
 * المستندات، وضريبته ويوم عمله وحدود اعتماده وهوامش عياراته ومن يفحص كسره.
 * و«مُدارة» تقفلها فلا يغيّرها مدير الفرع محليًّا (الخادم يرفض).
 */
export default function BranchProvisionCard({ branchId, canManage }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState({});
  const [settings, setSettings] = useState({});
  const [locked, setLocked] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    storeApi.fetchBranchProvision(branchId).then(({ provision: p }) => {
      setData(p);
      setProfile({ storeName: p.branch?.name || "", ...(p.profile || {}) });
      setSettings(p.settings || {});
      setLocked(p.at ? p.locked : true);
    }).catch(() => setError("تعذّر تحميل تجهيز الفرع"));
  }, [open, data, branchId]);

  const P = (k, v) => setProfile((x) => ({ ...x, [k]: v }));
  const S = (k, v) => setSettings((x) => ({ ...x, [k]: v }));

  const onLogo = (file) => {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 256, sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      P("logoDataUrl", c.toDataURL("image/png"));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => setError("الملف ليس صورة");
    img.src = url;
  };

  const save = async () => {
    setBusy(true); setError(""); setMsg("");
    try {
      const m = Object.fromEntries(Object.entries(settings.marginByKarat || {}).filter(([, e]) => e && e.perGram !== "" && e.perGram != null));
      const r = await storeApi.saveBranchProvision(branchId, { profile, settings: { ...settings, marginByKarat: Object.keys(m).length ? m : undefined }, locked });
      setData(r.provision);
      setMsg(locked ? "حُفظ التجهيز وقُفل — يصل الفرع عند دخوله التالي، ولا يغيّره مديره" : "حُفظ التجهيز — يصل الفرع عند دخوله التالي");
    } catch (e) {
      setError(hqError(e, e?.body?.error === "invalid_logo" ? "الشعار كبير أو ليس صورة" : "تعذّر حفظ التجهيز"));
    } finally { setBusy(false); }
  };

  const inp = "w-full rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs disabled:opacity-60";
  const num = (v) => String(v ?? "").replace(/[^\d.]/g, "");
  const ro = !canManage;
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2">
        <Settings2 size={15} className="text-amber-500" />
        <span className="text-sm font-medium flex-1 text-start">تجهيز الفرع</span>
        <span className="text-[11px] text-neutral-500">{data ? (data.locked ? "مُدار ومقفول" : data.at ? "مُجهَّز" : "غير مُجهَّز") : "الهوية والإعدادات"}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        !data ? <div className="text-xs text-neutral-500">{error || "جارِ التحميل…"}</div> : (
          <div className="space-y-3">
            {data.at && <div className="text-[11px] text-neutral-500">آخر تجهيز {new Date(data.at).toLocaleString("en-GB")}{data.by ? ` — ${data.by}` : ""}</div>}

            <div className="text-xs font-semibold text-neutral-300">الهوية والفاتورة</div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-neutral-800 overflow-hidden grid place-items-center shrink-0">
                {profile.logoDataUrl ? <img src={profile.logoDataUrl} alt="" className="w-full h-full object-contain" /> : <span className="text-[10px] text-neutral-500">شعار</span>}
              </div>
              {!ro && (
                <label className="text-[11px] px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 cursor-pointer">
                  اختر صورة الشعار<input type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
                </label>
              )}
              {!ro && profile.logoDataUrl && <button type="button" onClick={() => P("logoDataUrl", null)} className="text-[11px] text-red-400">إزالة</button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PROFILE_FIELDS.map(([k, l, ltr]) => (
                <label key={k} className="text-[11px] text-neutral-400 space-y-1">
                  <span>{l}</span>
                  <input className={inp} dir={ltr ? "ltr" : undefined} value={profile[k] || ""} disabled={ro} onChange={(e) => P(k, e.target.value)} />
                </label>
              ))}
            </div>

            <div className="text-xs font-semibold text-neutral-300">الضريبة ويوم العمل</div>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[11px] text-neutral-400 space-y-1"><span>الضريبة</span>
                <select className={inp} disabled={ro} value={settings.taxEnabled === false ? "0" : "1"} onChange={(e) => S("taxEnabled", e.target.value === "1")}>
                  <option value="1">مفعّلة</option><option value="0">معطّلة</option>
                </select></label>
              <label className="text-[11px] text-neutral-400 space-y-1"><span>النسبة ٪</span>
                <input className={inp} inputMode="decimal" disabled={ro} value={settings.taxRate != null ? String(Math.round(Number(settings.taxRate) * 10000) / 100) : ""}
                  onChange={(e) => S("taxRate", (Number(num(e.target.value)) || 0) / 100)} /></label>
              <label className="text-[11px] text-neutral-400 space-y-1"><span>يوم العمل</span>
                <select className={inp} disabled={ro} value={settings.workdayMode || "required"} onChange={(e) => S("workdayMode", e.target.value)}>
                  <option value="required">مفعّل</option><option value="off">مطفأ</option>
                </select></label>
            </div>

            <div className="text-xs font-semibold text-neutral-300">هوامش العيارات (ريال/جم)</div>
            <div className="grid grid-cols-4 gap-2">
              {KARATS.map((k) => (
                <label key={k} className="text-[11px] text-neutral-400 space-y-1"><span>ع{k}</span>
                  <input className={inp} inputMode="decimal" disabled={ro} placeholder="كما هو" value={settings.marginByKarat?.[k]?.perGram ?? ""}
                    onChange={(e) => S("marginByKarat", { ...(settings.marginByKarat || {}), [k]: { perGram: num(e.target.value), fixed: settings.marginByKarat?.[k]?.fixed || 0 } })} /></label>
              ))}
            </div>

            <div className="text-xs font-semibold text-neutral-300">الاعتمادات والكسر</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-neutral-400 space-y-1"><span>الاعتماد فوق الحدّ</span>
                <select className={inp} disabled={ro} value={settings.approvalsEnabled === false ? "0" : "1"} onChange={(e) => S("approvalsEnabled", e.target.value === "1")}>
                  <option value="1">مفعّل</option><option value="0">معطّل</option>
                </select></label>
              <label className="text-[11px] text-neutral-400 space-y-1"><span>فحص الكسر</span>
                <select className={inp} disabled={ro} value={settings.scrapAssayMode || "hq"} onChange={(e) => S("scrapAssayMode", e.target.value)}>
                  <option value="hq">الإدارة</option><option value="branch">الفرع</option>
                </select></label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {THRESHOLDS.map(([k, l]) => (
                <label key={k} className="text-[11px] text-neutral-400 space-y-1"><span>{l}</span>
                  <input className={inp} inputMode="decimal" disabled={ro} placeholder="الافتراضي" value={settings.approvalThresholds?.[k] ?? ""}
                    onChange={(e) => S("approvalThresholds", { ...(settings.approvalThresholds || {}), [k]: num(e.target.value) })} /></label>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input type="checkbox" checked={locked} disabled={ro} onChange={(e) => setLocked(e.target.checked)} />
              مُدارة: الفرع لا يعدّل هذه الإعدادات محلّيًّا
            </label>
            {error && <div className="text-xs text-red-400">{error}</div>}
            {msg && <div className="text-xs text-emerald-400">{msg}</div>}
            {!ro && (
              <button type="button" onClick={save} disabled={busy}
                className="w-full rounded-lg py-2 text-xs font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950">
                {busy ? "جارِ الحفظ…" : "احفظ التجهيز وانشره للفرع"}
              </button>
            )}
            <p className="text-[11px] text-neutral-500">الضريبة ويوم العمل وحدود الاعتماد يفرضها الخادم فورًا؛ والهوامش وفحص الكسر واسم المحل تُطبَّق في الفرع عند دخوله التالي. قفل الفترات ورسوم الشبكة تبقى بيد الفرع.</p>
          </div>
        )
      )}
    </div>
  );
}
