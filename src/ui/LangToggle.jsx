import { useState } from "react";
import { Languages } from "lucide-react";
import { readUiLang, setUiLang } from "../core/i18n.js";

/** زرّ لغة الواجهة — العربية أو English. تفضيلٌ للجهاز يسري من شاشة الدخول. اسم كل لغةٍ بلغتها فلا يُترجَم. */
export default function LangToggle({ className = "" }) {
  const [lang, setLang] = useState(readUiLang);
  const next = lang === "en" ? "ar" : "en";
  return (
    <button type="button" translate="no" data-i18n-skip onClick={() => setLang(setUiLang(next))}
      aria-label={next === "en" ? "English" : "العربية"}
      className={`flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-100 transition-colors shrink-0 ${className}`}>
      <Languages size={16} />
      {next === "en" ? "English" : "العربية"}
    </button>
  );
}
