import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, RotateCcw, ShieldCheck, Sparkles, Trash2, Users, X } from "lucide-react";
import { storeApi, ApiError } from "../core/api.js";

// ⚠ نفس مسمّيات roles الفعلية في الباك إند (db/migrations/002_auth_rbac.sql)
// — لا مصدر آخر لهذه التسميات هنا عمدًا (لا نكرر منطق الصلاحيات الكامل
// لكل دور، ذلك يبقى في الباك إند وحده؛ هذه تسميات عرض فقط).
const BRANCH_ROLE_LABELS = {
  employee: "موظف",
  assistant: "نائب المدير",
  manager: "المدير",
  scrap_buyer: "مشتري كسر",
  scrap_officer: "مسؤول الكسر",
  accountant: "المحاسب",
};
const BRANCH_ROLE_ORDER = ["employee", "assistant", "manager", "accountant", "scrap_buyer", "scrap_officer"];

/**
 * إدارة موظفي فرعٍ بعينه عن بعد — نظير AccessSettingsPage.jsx في
 * ounce-frontend لكن من المركزية مباشرة، بلا حاجة لتسجيل الدخول لتطبيق
 * الفرع نفسه. يُعرض كقسمٍ داخل BranchDetailPage.jsx (لا شاشة منفصلة)
 * لأنه مرتبط بفرعٍ بعينه مفتوح فعلًا.
 *
 * ⚠ لا لوحة "صلاحيات صفحات" تفصيلية هنا كما في AccessSettingsPage.jsx
 * الكاملة (تبويبات الفرع نفسها navRegistry) — أُضيف زرّ "تفعيل الكل" و
 * "إرجاع افتراضي الدور" فقط، فتفصيل كل صفحة على حدة نادر الاستخدام من
 * بعيد ويحتاج شحن navRegistry كاملةً لتطبيق منفصل؛ لم يُطلب صراحةً، ويظل
 * ممكنًا من داخل تطبيق الفرع نفسه عند الحاجة الدقيقة.
 */
export default function BranchStaffSection({ branchId, canManage }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [pinFor, setPinFor] = useState(null);   // إعادة الرقم السري من الإدارة
  const [pinIn, setPinIn] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    setError("");
    storeApi
      .fetchBranchUsers(branchId, { includeInactive: true })
      .then(setUsers)
      .catch(() => setError("تعذّر تحميل موظفي الفرع"));
  }, [branchId]);

  useEffect(load, [load]);

  if (!canManage) return null;

  const toggleAi = async (u) => {
    setBusyId(u.id);
    try {
      const updated = await storeApi.setBranchUserAi(branchId, u.id, !u.can_use_ai);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
    } catch {
      setError("تعذّر تغيير أدوات الذكاء");
    } finally {
      setBusyId(null);
    }
  };

  const resetToRole = async (u) => {
    setBusyId(u.id);
    try {
      const updated = await storeApi.setBranchUserPermissions(branchId, u.id, null);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
    } catch {
      setError("تعذّر إرجاع افتراضي الدور");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (u) => {
    setBusyId(u.id);
    setError("");
    try {
      await storeApi.removeBranchUser(branchId, u.id);
      // التعطيل لا حذف: يبقى في القائمة معطَّلًا فيُعاد تفعيله متى شئت
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: false } : x)));
    } catch (err) {
      setError(
        err instanceof ApiError && err.body?.error === "would_remove_last_manager"
          ? "لا يمكن إزالة آخر مدير في الفرع"
          : "تعذّر إزالة الموظف"
      );
    } finally {
      setBusyId(null);
    }
  };

  const reactivate = async (u) => {
    setBusyId(u.id);
    setError("");
    try {
      await storeApi.setBranchUserActive(branchId, u.id, true);
      load();
    } catch {
      setError("تعذّر إعادة التفعيل");
    } finally {
      setBusyId(null);
    }
  };

  // ⚠ الرقم يُرسل للخادم ويُجزَّأ هناك فقط — لا يُعرض بعد الحفظ ولا يُسجَّل
  const savePin = async (u) => {
    if (!/^\d{4,6}$/.test(pinIn)) { setError("الرقم السري من 4 إلى 6 أرقام"); return; }
    setBusyId(u.id);
    setError("");
    try {
      await storeApi.resetBranchUserPin(branchId, u.id, pinIn);
      setPinFor(null);
      setPinIn("");
      setNotice(`أُعيد الرقم السري لـ${u.name} — أبلغه به`);
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      setError(err instanceof ApiError && err.body?.error === "pin_taken" ? "هذا الرقم مستخدم لموظفٍ آخر في الفرع" : "تعذّر إعادة الرقم السري");
    } finally {
      setBusyId(null);
    }
  };

  const rename = async (u) => {
    if (!newName.trim()) return;
    setBusyId(u.id);
    setError("");
    try {
      const updated = await storeApi.renameBranchUser(branchId, u.id, newName);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
      setRenaming(null);
      setNewName("");
    } catch (err) {
      setError(err instanceof ApiError && err.body?.error === "name_taken" ? "يوجد موظف بهذا الاسم" : "تعذّر تغيير الاسم");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={17} className="text-amber-500" />
          <h3 className="text-sm font-semibold">موظفو الفرع</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-medium px-2.5 py-1.5 transition-colors"
        >
          <Plus size={14} />
          موظف جديد
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>
      )}
      {notice && (
        <div className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">{notice}</div>
      )}

      {users === null && !error ? (
        <div className="text-neutral-400 text-sm">جارِ التحميل…</div>
      ) : (
        <div className="space-y-2">
          {users?.map((u) => (
            <div key={u.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5">
              {renaming === u.id ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setRenaming(null); setNewName(""); }}
                      className="rounded-lg text-xs font-medium py-1.5 bg-neutral-800 text-neutral-300 border border-neutral-700"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => rename(u)}
                      className="rounded-lg text-xs font-medium py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.name}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {BRANCH_ROLE_LABELS[u.role] || u.role}
                        {" · "}
                        {Array.isArray(u.allowed_pages) ? `${u.allowed_pages.length} صفحة (مخصّصة)` : "افتراضي الدور"}
                        {u.salary > 0 && ` · راتب ${new Intl.NumberFormat("ar-EG").format(u.salary)}`}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {/* ⚠ تغيير مقصود (طلب المستخدم صراحةً): الرمز كان ملاصقًا
                          للاسم فلا يظهر بوضوح — الآن في أقصى الجهة الأخرى من
                          الصف، فوق أيقونة الحذف تحديدًا، ليكون واضحًا للعين
                          مباشرة. */}
                      {u.ref && (
                        <span
                          dir="ltr"
                          className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded px-1.5 py-0.5"
                        >
                          {u.ref}
                        </span>
                      )}
                      {!u.active && <span className="text-xs text-neutral-500">معطَّل</span>}
                    </div>
                  </div>

                  {u.role !== "manager" && (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => toggleAi(u)}
                      className="mt-2 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-60"
                      style={{
                        background: u.can_use_ai ? "rgba(245,158,11,0.12)" : "transparent",
                        border: `1px solid ${u.can_use_ai ? "rgba(245,158,11,0.35)" : "rgb(38,38,38)"}`,
                      }}
                    >
                      <Sparkles size={12} className={u.can_use_ai ? "text-amber-400" : "text-neutral-500"} />
                      <span className={u.can_use_ai ? "text-amber-400" : "text-neutral-400"}>
                        أدوات الذكاء {u.can_use_ai ? "مفتوحة" : "مغلقة"}
                      </span>
                    </button>
                  )}

                  {pinFor === u.id && (
                    <div className="flex gap-2 mt-2">
                      <input
                        autoFocus
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pinIn}
                        onChange={(e) => setPinIn(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="رقم سري جديد (4–6)"
                        className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button type="button" disabled={busyId === u.id} onClick={() => savePin(u)}
                        className="rounded-lg text-xs font-medium px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950">حفظ</button>
                      <button type="button" onClick={() => { setPinFor(null); setPinIn(""); }}
                        className="rounded-lg text-xs px-2 bg-neutral-800 text-neutral-300 border border-neutral-700"><X size={13} /></button>
                    </div>
                  )}

                  {!u.active ? (
                    <div className="flex items-center gap-2 mt-2.5">
                      <button type="button" disabled={busyId === u.id} onClick={() => reactivate(u)}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-neutral-800 text-emerald-400 border border-emerald-500/30 disabled:opacity-60">
                        <RotateCcw size={11} /> إعادة التفعيل
                      </button>
                    </div>
                  ) : (
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setPinFor(pinFor === u.id ? null : u.id); setPinIn(""); setError(""); }}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700"
                    >
                      <KeyRound size={11} /> رقم سري جديد
                    </button>
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => resetToRole(u)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-neutral-800 text-amber-400 border border-amber-500/30 disabled:opacity-60"
                    >
                      <ShieldCheck size={11} /> إرجاع افتراضي الدور
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRenaming(u.id); setNewName(u.name); }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700"
                    >
                      تغيير الاسم
                    </button>
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => remove(u)}
                      className="mr-auto text-red-400 disabled:opacity-60"
                      title="تعطيل"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  )}
                </>
              )}
            </div>
          ))}
          {users?.length === 0 && <div className="text-neutral-500 text-sm">لا يوجد موظفون في هذا الفرع.</div>}
        </div>
      )}

      {showCreate && (
        <CreateBranchUserModal
          branchId={branchId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateBranchUserModal({ branchId, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("employee");
  const [salary, setSalary] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const validPin = /^\d{4,6}$/.test(pin);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !validPin) return;
    setError("");
    setBusy(true);
    try {
      await storeApi.createBranchUser(branchId, {
        name: name.trim(),
        pin,
        role,
        salary: Number(salary) || 0,
      });
      onCreated();
    } catch (err) {
      setError(createBranchUserErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">موظف جديد للفرع</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-100">
            <X size={18} />
          </button>
        </div>

        <Field label="الاسم" value={name} onChange={setName} />
        <Field
          label="الرقم السري (4-6 أرقام)"
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))}
          dir="ltr"
          inputMode="numeric"
        />
        <Field label="الراتب الشهري (اختياري)" value={salary} onChange={(v) => setSalary(v.replace(/\D/g, ""))} dir="ltr" inputMode="numeric" />

        <div className="space-y-1.5">
          <label className="text-sm text-neutral-300">الصلاحية</label>
          <div className="grid grid-cols-3 gap-2">
            {BRANCH_ROLE_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setRole(id)}
                className="py-2 rounded-lg text-[11px] font-medium border"
                style={{
                  background: role === id ? "rgba(245,158,11,0.12)" : "transparent",
                  color: role === id ? "rgb(251,191,36)" : "rgb(163,163,163)",
                  borderColor: role === id ? "rgba(245,158,11,0.35)" : "rgb(38,38,38)",
                }}
              >
                {BRANCH_ROLE_LABELS[id]}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}

        <button
          type="submit"
          disabled={busy || !name.trim() || !validPin}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950 font-medium py-2 text-sm transition-colors"
        >
          {busy ? "جارِ الإضافة…" : "إضافة"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", ...rest }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-neutral-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        {...rest}
      />
    </div>
  );
}

function createBranchUserErrorMessage(err) {
  if (!(err instanceof ApiError)) return "تعذّر إضافة الموظف";
  switch (err.body?.error) {
    case "name_required":
      return "الاسم مطلوب";
    case "pin_must_be_4_to_6_digits":
      return "الرقم السري يجب أن يكون 4 إلى 6 أرقام";
    case "invalid_role":
      return "صلاحية غير صحيحة";
    case "name_taken":
      return "يوجد موظف بهذا الاسم";
    case "pin_taken":
      return "هذا الرقم السري مستخدَم بالفعل في الفرع";
    case "branch_not_found":
      return "الفرع غير موجود";
    default:
      return "تعذّر إضافة الموظف";
  }
}
