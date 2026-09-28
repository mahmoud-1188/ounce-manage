import { useEffect, useState } from "react";
import { Copy, Loader2, MessageCircle, QrCode, X } from "lucide-react";
import { storeApi } from "../core/api.js";
import { qrSvg } from "../core/qrBig.js";

/**
 * رمز ربط جهاز موظفٍ في فرع — تُصدره الإدارة (ومنه للمدير: جهاز المدير تربطه الإدارة وحدها).
 * الموظّف يفتح رابط الفرع على جواله ← «عندي رمز ربط» ← يمسح الرمز أو يلصقه ← يضع رقمه السري بنفسه.
 * ⚠ صالح 30 دقيقة ولمرّةٍ واحدة، ولا يحمل رقمًا سريًّا — وإصدار رمزٍ جديد يُبطل السابق.
 */
export default function EnrollCodeModal({ branchId, user = null, shared = false, onClose }) {
  const who = shared ? "جهاز الفرع" : user.name;
  const [state, setState] = useState({ loading: true });
  const [left, setLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const issue = async () => {
    setState({ loading: true });
    try {
      const r = shared ? await storeApi.issueSharedDeviceCode(branchId) : await storeApi.issueEnrollCode(branchId, user.id);
      setState({ code: r.code, expiresAt: r.expiresAt, branchRef: r.branchRef, branchName: r.branchName });
      setLeft(Math.max(0, Math.round((new Date(r.expiresAt).getTime() - Date.now()) / 1000)));
    } catch {
      setState({ error: "تعذّر إصدار رمز الربط" });
    }
  };
  useEffect(() => { issue(); }, [user?.id, shared]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!state.code) return undefined;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [state.code]);
  const base = (import.meta.env.VITE_BRANCH_APP_URL || "").replace(/\/+$/, "");
  const link = state.branchRef ? `${base}/b/${state.branchRef}` : "";
  const message = state.code
    ? shared
      ? `ربط «جهاز الفرع» — أونصة (${state.branchName || ""})\n\n١) افتح رابط الفرع على التابلت:\n${link}\n٢) اضغط «عندي رمز ربط» والصق الرمز:\n${state.code}\n\nبعدها يدخل منه أي موظفٍ برمزه ورقمه. الرمز صالح 30 دقيقة ولمرّةٍ واحدة.`
      : `ربط جهاز ${user.name} — أونصة (${state.branchName || ""})\n\n١) افتح رابط الفرع على جوالك:\n${link}\n٢) اضغط «عندي رمز ربط» والصق الرمز:\n${state.code}\n٣) ضع رقمك السري بنفسك — وبعدها تدخل برقمك وحده.\n\nالرمز صالح 30 دقيقة ولمرّةٍ واحدة.`
    : "";
  const copy = async () => { try { await navigator.clipboard.writeText(state.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* المتصفح يمنع النسخ */ } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <QrCode size={18} className="text-amber-500" />
          <h3 className="font-semibold flex-1">رمز ربط {shared ? "«جهاز الفرع»" : `جهاز — ${who}`}</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-100" aria-label="إغلاق"><X size={18} /></button>
        </div>
        {state.loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" /></div>}
        {state.error && <div className="text-sm text-red-400">{state.error}</div>}
        {state.code && (
          <>
            <div className="flex justify-center"><div className="rounded-xl bg-white p-3" dangerouslySetInnerHTML={{ __html: qrSvg(state.code, 180) }} /></div>
            <div className="text-center font-mono text-lg tracking-widest text-amber-300" dir="ltr">{state.code}</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={copy} className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 py-2 text-xs">
                <Copy size={13} /> {copied ? "نُسخ" : "انسخ الرمز"}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-700/60 bg-emerald-950/30 py-2 text-xs text-emerald-300">
                <MessageCircle size={13} /> أرسل بواتساب
              </a>
            </div>
            <p className={`text-center text-xs ${left > 60 ? "text-neutral-400" : "text-red-400"}`}>
              {left > 0 ? `صالح ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} · لمرّةٍ واحدة` : "انتهت صلاحيته — "}
              {left <= 0 && <button type="button" onClick={issue} className="font-bold text-amber-400">أصدر رمزًا جديدًا</button>}
            </p>
            <ol className="text-[11px] text-neutral-400 list-decimal pr-4 space-y-0.5 leading-5">
              <li>{shared ? "افتح رابط الفرع على التابلت المشترك" : "يفتح الموظف رابط الفرع على جواله"}{link ? <span className="block font-mono text-neutral-300" dir="ltr">{link}</span> : null}</li>
              <li>اضغط «عندي رمز ربط» وامسح الرمز أو الصقه.</li>
              <li>{shared ? "يُربط مباشرةً — ويدخل منه أي موظفٍ برمزه ورقمه." : "يضع رقمه السري بنفسه ويدخل مباشرةً — وبعدها بالرقم وحده."}</li>
            </ol>
            <p className="text-[11px] text-neutral-500">⚠ الرمز لا يحمل رقمًا سريًّا، وإصدار رمزٍ جديد يُبطل السابق.</p>
          </>
        )}
      </div>
    </div>
  );
}
