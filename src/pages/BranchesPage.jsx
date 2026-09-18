import { useCallback, useEffect, useState } from "react";
import { Plus, Store, X } from "lucide-react";
import { storeApi, ApiError } from "../core/api.js";

export default function BranchesPage({ storeUser }) {
  const [branches, setBranches] = useState(null);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setError("");
    storeApi
      .fetchBranches()
      .then(setBranches)
      .catch(() => setError("تعذّر تحميل قائمة الفروع"));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">فروع المتجر</h2>
        {storeUser?.role === "owner" && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-medium px-3 py-1.5 transition-colors"
          >
            <Plus size={16} />
            فرع جديد
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {branches === null && !error ? (
        <div className="text-neutral-400 text-sm">جارِ التحميل…</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches?.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-1.5"
            >
              <div className="flex items-center gap-2 text-neutral-200">
                <Store size={18} className="text-amber-500" />
                <span className="font-medium">{b.name}</span>
              </div>
              <div className="text-xs text-neutral-500 font-mono">{b.ref}</div>
              {b.is_hq && (
                <span className="inline-block text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">
                  فرع رئيسي
                </span>
              )}
            </div>
          ))}
          {branches?.length === 0 && (
            <div className="text-neutral-500 text-sm col-span-full">
              لا توجد فروع بعد.
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateBranchModal
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

function CreateBranchModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPin, setManagerPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await storeApi.createBranch({
        name: name.trim(),
        managerName: managerName.trim(),
        managerPin,
      });
      onCreated();
    } catch (err) {
      setError(createBranchErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">فرع جديد</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-100">
            <X size={18} />
          </button>
        </div>

        <Field label="اسم الفرع" value={name} onChange={setName} />
        <Field label="اسم المدير" value={managerName} onChange={setManagerName} />
        <Field
          label="كود دخول المدير (4-6 أرقام)"
          value={managerPin}
          onChange={setManagerPin}
          type="password"
          inputMode="numeric"
          dir="ltr"
        />

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-neutral-950 font-medium py-2 text-sm transition-colors"
        >
          {busy ? "جارِ الإنشاء…" : "إنشاء الفرع"}
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

function createBranchErrorMessage(err) {
  if (!(err instanceof ApiError)) return "تعذّر إنشاء الفرع";
  switch (err.body?.error) {
    case "name_required":
      return "اسم الفرع مطلوب";
    case "manager_name_required":
      return "اسم المدير مطلوب";
    case "manager_pin_must_be_4_to_6_digits":
      return "كود الدخول يجب أن يكون من 4 إلى 6 أرقام";
    case "branch_limit_reached": {
      const max = err.body?.maxBranches;
      return `تم الوصول للحد الأقصى لعدد الفروع المسموح به في باقتك${max ? ` (${max})` : ""} — يلزم ترقية الاشتراك لإضافة المزيد`;
    }
    case "subscription_expired":
      return "انتهى اشتراك متجرك — يلزم تجديده لإضافة فروع جديدة";
    case "store_suspended":
      return "تم إيقاف اشتراك متجرك — تواصل مع الدعم";
    case "owner_only":
      return "إنشاء فرع جديد متاح لمالك المتجر فقط";
    default:
      return "تعذّر إنشاء الفرع";
  }
}
