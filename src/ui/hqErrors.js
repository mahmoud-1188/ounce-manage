/** رسائل أخطاء لوحة الإدارة — مفاتيح الخادم → نصٌّ عربي */
const HQ_ERRORS = {
  period_locked: "الفترة مقفلة في الفرع — افتحها أو غيّر تاريخ القفل أولًا",
  period_already_settled: "سُوّيت عمولة هذا الشهر من قبل",
  insufficient_network_balance: "رصيد الشبكة لا يكفي لخصم الفرق",
  no_recorded_fees: "لا عمولة شبكة مسجّلة في أي فرع لهذا الشهر",
  invalid_period: "الشهر غير صالح",
  invalid_amount: "المبلغ غير صالح",
  invalid_target: "الهدف غير صالح",
  approval_already_decided: "قُرّر هذا الطلب من قبل",
  rejection_reason_required: "سبب الرفض مطلوب",
  review_note_required: "اكتب ملاحظةً لغير «معتمد»",
  reversal_reason_required: "سبب العكس مطلوب",
  cannot_reverse_reversal: "لا يُعكس قيدُ عكس",
  entry_already_reversed: "عُكس هذا القيد من قبل",
  entry_not_found: "القيد غير موجود",
  adjustment_note_required: "بيان القيد مطلوب",
  adjustment_unbalanced: "القيد غير متوازن — المدين يجب أن يساوي الدائن",
  invalid_account: "حسابٌ غير صالح (أو حساب تجميعي)",
  invalid_line: "سطرٌ غير صالح — مدين أو دائن لا كلاهما",
  cannot_manage_branches: "لا تملك صلاحية إدارة الفروع",
  branch_not_found: "الفرع غير موجود",
  invalid_tax_rate: "نسبة الضريبة غير صالحة",
  invalid_thresholds: "حدود الاعتماد غير صالحة",
  invalid_margin: "هامشٌ غير صالح",
  invalid_logo: "الشعار كبير أو ليس صورة",
};

export function hqError(err, fallback = "تعذّر تنفيذ العملية") {
  const code = err?.body?.error;
  return (code && HQ_ERRORS[code]) || fallback;
}
