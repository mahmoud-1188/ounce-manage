import AlertsCard from "./AlertsCard.jsx";
import CashTransitCard from "./CashTransitCard.jsx";
import GoodsTransitCard from "./GoodsTransitCard.jsx";

/** التنبيهات (المرجع hqConsole:alerts في باب «الوارد»): ما يحتاج انتباهك في الفروع، وكلٌّ يفتح فرعه. */
function AlertsPage({ onOpenBranch }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">التنبيهات</h2>
      <AlertsCard onOpenBranch={onOpenBranch} />
    </div>
  );
}

/** في الطريق (المرجع hqConsole:transit في باب «الشحن والتكويد»): النقد والبضاعة المرسلة ولم تُستلم بعد. */
function TransitPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">في الطريق</h2>
      <p className="text-xs text-neutral-400">ما أُرسل بين الإدارة والفروع ولم يُستلم بعد، ومطابقته مع دفاتر الفروع. لا شيء هنا يعني أن كل شيءٍ وصل.</p>
      <CashTransitCard />
      <GoodsTransitCard />
    </div>
  );
}

export { AlertsPage, TransitPage };
