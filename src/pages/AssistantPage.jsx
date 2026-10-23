import { useEffect, useRef, useState } from "react";
import { Bot, Mic, Send, Volume2 } from "lucide-react";
import { storeApi } from "../core/api.js";

const ERRORS = {
  ai_not_configured: "المساعد غير مفعّل على الخادم — مفتاح الذكاء غير مضبوط",
  ai_not_allowed: "لا تملك صلاحية المساعد — اطلبها من المالك",
  ai_upstream_error: "تعذّر الوصول إلى خدمة الذكاء — حاول بعد قليل",
};

const SpeechRec = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

function speak(text) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA";
  window.speechSynthesis.speak(u);
}

/**
 * مساعد الإدارة (المرجع 2026-10-12 ز): أسئلة عن الفروع مجتمعةً تُجاب من أرقامها الفعلية —
 * الخادم يرفق التقرير المجمّع بنفسه. الكتابة أو الصوت (ميكروفون المتصفّح)، ولكل ردٍّ «استماع».
 */
export default function AssistantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);
  useEffect(() => () => { recRef.current?.abort?.(); if (canSpeak) window.speechSynthesis.cancel(); }, []);

  const send = async (text = input) => {
    const q = String(text || "").trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const r = await storeApi.askAssistant(next);
      setMessages([...next, { role: "assistant", content: r.text }]);
    } catch (e) {
      setError(ERRORS[e?.body?.error] || "تعذّر الحصول على ردّ");
    } finally {
      setBusy(false);
    }
  };

  const listen = () => {
    if (!SpeechRec || busy) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SpeechRec();
    rec.lang = "ar-SA";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => { const t = ev.results?.[0]?.[0]?.transcript || ""; if (t) send(t); };
    rec.onerror = () => setError("لم يُسمع الصوت — حاول مرة أخرى أو اكتب سؤالك");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const examples = ["أيّ فرعٍ باع أكثر هذا الشهر؟", "قارن مصروفات الفروع بالشهر الماضي", "ما مجموع مبيعات كل الفروع هذا الشهر؟"];

  return (
    <div className="space-y-4" data-hq-assistant>
      <div className="flex items-center gap-2">
        <Bot size={18} className="text-amber-500" />
        <h2 className="text-lg font-semibold">المساعد</h2>
      </div>
      <p className="text-xs text-neutral-400">اسأل عن فروعك كتابةً أو بصوتك — يجيب من أرقام هذا الشهر والشهر الماضي لكل فرع. يقرأ ويشرح فقط، ولا ينفّذ شيئًا.</p>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 space-y-3 min-h-[240px]">
        {!messages.length && (
          <div className="flex flex-wrap gap-2">
            {examples.map((x) => (
              <button key={x} type="button" onClick={() => send(x)} className="text-xs rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-amber-500">{x}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-amber-500/15 text-amber-100" : "bg-neutral-800 text-neutral-100"}`}>
              {m.content}
              {m.role === "assistant" && canSpeak && (
                <button type="button" onClick={() => speak(m.content)} className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400 hover:text-amber-400" aria-label="استماع">
                  <Volume2 size={12} /> استماع
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-neutral-500">يكتب…</div>}
        <div ref={endRef} />
      </div>

      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="اكتب سؤالك…" aria-label="سؤال للمساعد" maxLength={1000}
          className="flex-1 rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        {SpeechRec && (
          <button type="button" onClick={listen} disabled={busy} aria-label={listening ? "إيقاف الاستماع" : "تحدّث"}
            className={`rounded-lg px-3 border ${listening ? "border-red-500 text-red-400" : "border-neutral-700 text-neutral-300"}`}>
            <Mic size={16} />
          </button>
        )}
        <button type="button" onClick={() => send()} disabled={busy || !input.trim()} aria-label="إرسال"
          className="rounded-lg px-3 bg-amber-500 text-neutral-950 disabled:opacity-40">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
