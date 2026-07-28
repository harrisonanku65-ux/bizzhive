/**
 * Percentage of a sale a vendor keeps, by plan. The platform keeps the rest
 * as commission — e.g. Free vendors keep 80%, so the platform's cut is 20%.
 *
 * Change the rates here only — every payout calculation and every place
 * that displays "your payout rate" reads from this single function, so
 * there's no stored-column value that can drift out of sync with plan.
 */
export function payoutPercentageForPlan(plan: string | null | undefined): number {
  if (plan === "premium") return 90;
  if (plan === "pro") return 85;
  return 80;
}
