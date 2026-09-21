import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck, Users, X } from "lucide-react";
import { storeApi, ApiError } from "../core/api.js";
import { PAGE_REGISTRY } from "../core/pageRegistry.js";

/**
 * إدارة الموظفين المركزيين — نظير AccessSettingsPage.jsx في
 * ounce-frontend، لكن للمستخدم المركزي (store_users) بصلاحيات مبسّطة:
 * أي شاشات من PAGE_REGISTRY يراها الموظف، وهل يملك صلاحية إنشاء فروع
 * جديدة (canManageBranches) وهل يملك صلاحية إرسال تكويد لفرع
 * (canSendCoding) — علمان مستقلان عن مجرّد رؤية الشاشة. owner فقط
 * (مفروضة من الباك إند صراحةً، لا من هذه الشاشة وحدها).
 */
export default function UsersPage() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [permUser, setPermUser] = useState(null);

  const load = useCallback(() => {
    setError("");
    storeApi
      .fetchUsers()
      .then(setUsers)
      .catch(() => setError("تعذّر تحميل قائمة الموظفين"));
  }, []);

  useEffect(load, [load]);

  if (permUser) {
    return (
      <PermissionsPanel
        user={permUser}
        onBack={() => setPermUser(null)}
        onSaved={(updated) => {
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          setPermUser(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-amber-500" />
          <h2 className="text-lg font-semibold">الموظفون المركزيون</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-medium px-3 py-1.5 transition-colors"
        >
          <Plus size={16} />
          موظف جديد
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        كل موظفٍ مركزي يدخل ببريده وكلمة مروره الخاصة، ويرى فقط الشاشات التي تحدّدها له هنا.
      </p>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {users === null && !error ? (
        <div className="text-neutral-400 text-sm">جارِ التحميل…</div>
      ) : (
        <div className="space-y-2">
          {users?.map((u) => (
            <div key={u.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{u.name}</div>
                  <div className="text-xs text-neutral-500 truncate">{u.email}</div>
                </div>
                <span className="text-xs text-neutral-400 shrink-0">
                  {u.role === "owner" ? "مالك" : "موظف"}
                </span>
              </div>
              <div className="text-xs text-neutral-500 mt-1.5">
                {u.role === "owner"
                  ? "كل الشاشات · بلا قيد"
                  : u.allowedPages == null
                    ? "كل الشاشات · بلا قيد"
                    : `${u.allowedPages.length} من ${PAGE_REGISTRY.length} شاشة`}
                {u.canManageBranches && u.role !== "owner" && " · يدير الفروع"}
                {u.canSendCoding && u.role !== "owner" && " · يرسل تكويدًا"}
                {!u.active && " · معطَّل"}
              </div>
              {u.role !== "owner" && (
                <button
                  type="button"
                  onClick={() => setPermUser(u)}
                  className="mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-amber-400 border border-amber-500/30"
                >
                  <ShieldCheck size={12} /> الصلاحيات
                </button>
              )}
            </div>
          ))}
          {users?.length === 0 && (
            <div className="text-neutral-500 text-sm">لا يوجد موظفون مركزيون بعد.</div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateUserModal
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

function PermissionsPanel({ user, onBack, onSaved }) {
  const [allowed, setAllowed] = useState(user.allowedPages == null ? PAGE_REGISTRY.map((p) => p.id) : user.allowedPages);
  const [unrestricted, setUnrestricted] = useState(user.allowedPages == null);
  const [canManageBranches, setCanManageBranches] = useState(!!user.canManageBranches);
  const [canSendCoding, setCanSendCoding] = useState(!!user.canSendCoding);
  const [active, setActive] = useState(user.active !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const togglePage = (id) => {
    setAllowed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await storeApi.updateUser(user.id, {
        allowedPages: unrestricted ? null : allowed,
        canManageBranches,
        canSendCoding,
        active,
      });
      onSaved(updated);
    } catch {
      setError("تعذّر حفظ الصلاحيات");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-neutral-400 hover:text-neutral-100">
        ← كل الموظفين
      </button>
      <div>
        <h2 className="text-lg font-semibold">صلاحيات {user.name}</h2>
        <p className="text-xs text-neutral-500">{user.email}</p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>
      )}

      <label className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 cursor-pointer">
        <input type="checkbox" checked={unrestricted} onChange={(e) => setUnrestricted(e.target.checked)} className="accent-amber-500" />
        <span className="text-sm">بلا قيد — يرى كل الشاشات دائمًا (حتى ما يُضاف مستقبلًا)</span>
      </label>

      {!unrestricted && (
        <div className="space-y-2">
          {PAGE_REGISTRY.map((p) => {
            const Icon = p.icon;
            const on = allowed.includes(p.id);
            return (
              <label
                key={p.id}
                className="flex items-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900 p-3 cursor-pointer"
              >
                <input type="checkbox" checked={on} onChange={() => togglePage(p.id)} className="accent-amber-500" />
                <Icon size={16} className={on ? "text-amber-500" : "text-neutral-500"} />
                <span className={`text-sm ${on ? "text-neutral-100" : "text-neutral-400"}`}>{p.label}</span>
              </label>
            );
          })}
        </div>
      )}

      <label className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 cursor-pointer">
        <input type="checkbox" checked={canManageBranches} onChange={(e) => setCanManageBranches(e.target.checked)} className="accent-amber-500" />
        <span className="text-sm">يملك صلاحية إنشاء فروع جديدة</span>
      </label>

      {/* ⚠ مستقلة عمدًا عن تفعيل شاشة "hqCoding" في allowedPages أعلى —
          رؤية شاشة التكويد لا تعني صلاحية إرسال بضاعة فعليًّا لفرع.
          راجع 026_store_user_coding_permission.sql. */}
      <label className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 cursor-pointer">
        <input type="checkbox" checked={canSendCoding} onChange={(e) => setCanSendCoding(e.target.checked)} className="accent-amber-500" />
        <span className="text-sm">يملك صلاحية إرسال تكويد لفرع</span>
      </label>

      <label className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 cursor-pointer">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-amber-500" />
        <span className="text-sm">الحساب نشط (يمكنه تسجيل الدخول)</span>
      </label>

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950 font-medium py-2.5 text-sm transition-colors"
      >
        {busy ? "جارِ الحفظ…" : "حفظ الصلاحيات"}
      </button>
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // ⚠ يُنشأ دائمًا بصلاحيات فارغة (allowedPages: []) لا null — owner
      // يحدّد وصوله صراحةً من "الصلاحيات" بعد إنشائه، فلا يُمنح كل
      // الشاشات ضمنيًّا بمجرَّد الإضافة.
      await storeApi.createUser({ name: name.trim(), email: email.trim(), password, allowedPages: [] });
      onCreated();
    } catch (err) {
      setError(createUserErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">موظف مركزي جديد</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-100">
            <X size={18} />
          </button>
        </div>

        <Field label="الاسم" value={name} onChange={setName} />
        <Field label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" dir="ltr" />
        <Field label="كلمة المرور (8 أحرف على الأقل)" value={password} onChange={setPassword} type="password" dir="ltr" />

        {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}

        <p className="text-xs text-neutral-500">
          يُنشأ بلا صلاحية عرض أي شاشة مبدئيًّا — حدّدها له من "الصلاحيات" بعد الإنشاء مباشرة.
        </p>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950 font-medium py-2 text-sm transition-colors"
        >
          {busy ? "جارِ الإنشاء…" : "إنشاء الموظف"}
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

function createUserErrorMessage(err) {
  if (!(err instanceof ApiError)) return "تعذّر إنشاء الموظف";
  switch (err.body?.error) {
    case "name_required":
      return "الاسم مطلوب";
    case "email_required":
      return "البريد الإلكتروني مطلوب";
    case "password_too_short":
      return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    case "email_already_used":
      return "هذا البريد الإلكتروني مستخدم بالفعل";
    case "owner_only":
      return "إضافة موظفين متاحة لمالك المتجر فقط";
    default:
      return "تعذّر إنشاء الموظف";
  }
}
