import { useState } from "react";
import { Check, Copy, Link as LinkIcon } from "lucide-react";

/**
 * رابط دخول الفرع — يُفتح مرة واحدة على جهاز الفرع (كمبيوتر/تابلت
 * المحل) فيتعرّف تطبيق الفرع على هويته تلقائيًّا ويحفظها محليًّا، بدل
 * الاعتماد على معرّف فرعٍ ثابت وقت البناء (VITE_DEFAULT_BRANCH_ID —
 * راجع نقاش "كيف يرتبط تطبيق الفرع بحسابه المركزي؟").
 *
 * ⚠ VITE_BRANCH_APP_URL (نطاق ounce-frontend المنشور فعليًّا) قد لا
 * يكون مضبوطًا بعد وقت كتابة هذا الملف — بدونه نعرض مسارًا نسبيًّا
 * فقط (/b/<ref>)، صحيحًا لكنه يحتاج إلحاق النطاق يدويًّا حتى يُضبط
 * المتغيّر في بيئة النشر.
 */
export default function BranchLinkCard({ branchRef }) {
  const [copied, setCopied] = useState(false);

  if (!branchRef) return null;

  const base = (import.meta.env.VITE_BRANCH_APP_URL || "").replace(/\/+$/, "");
  const path = `/b/${branchRef}`;
  const fullLink = `${base}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // الحافظة قد تكون غير متاحة (سياق غير آمن مثلًا) — الرابط ما زال
      // مقروءًا ونصّه قابلًا للتحديد يدويًّا من الحقل نفسه.
    }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
      <div className="flex items-center gap-2">
        <LinkIcon size={15} className="text-amber-500" />
        <span className="text-sm font-medium">رابط دخول الفرع</span>
      </div>
      <p className="text-xs text-neutral-500">
        افتح هذا الرابط مرة واحدة على جهاز هذا الفرع (كمبيوتر أو تابلت المحل) — يتعرّف تطبيق الفرع على هويته تلقائيًّا من حينها.
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={fullLink}
          onFocus={(e) => e.target.select()}
          dir="ltr"
          className="flex-1 min-w-0 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-xs font-mono text-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-2 text-xs font-medium transition-colors"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
      {!base && (
        <p className="text-[11px] text-amber-500/80">
          ⚠ لم يُضبط رابط تطبيق الفرع (VITE_BRANCH_APP_URL) بعد في بيئة النشر — هذا مسارٌ نسبي فقط، أضِف النطاق يدويًّا قبل إرساله.
        </p>
      )}
    </div>
  );
}
