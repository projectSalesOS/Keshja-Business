export type PlanId = "free" | "basic" | "premium";
export type BillingInterval = "monthly" | "annual";
export type TariffPlan = {
  id: PlanId;
  name: string;
  /** @deprecated Ersetzt durch price_cents_monthly und price_cents_annual. */
  price_cents: number;
  price_cents_monthly: number;
  price_cents_annual: number;
  manual_limit: number | null;
  ocr_limit: number;
  documents: boolean;
  voice: boolean;
  logo: boolean;
  advanced_reports: boolean;
};
export type Subscription = {
  organization_id: string;
  plan_id: PlanId;
  status: "free" | "trialing" | "active" | "past_due" | "canceled" | "expired";
  starts_at: string;
  period_end: string | null;
  renews_at: string | null;
  source: string;
  trial_used: boolean;
};
export type TariffOverview = {
  subscription: Subscription;
  plan: TariffPlan;
  ocr_used: number;
  manual_used: number;
  period_start: string;
};
export const STATUS_LABEL = {
  free: "Kostenlos",
  trialing: "Testphase",
  active: "Aktiv",
  past_due: "Zahlung ausstehend",
  canceled: "Gekündigt",
  expired: "Abgelaufen",
};
export function remaining(limit: number | null, used: number) {
  return limit === null ? null : Math.max(0, limit - used);
}
export function effectivePlan(s: Subscription, now: Date): PlanId {
  return ["active", "trialing", "canceled"].includes(s.status) &&
    new Date(s.starts_at) <= now &&
    s.period_end !== null &&
    new Date(s.period_end) > now
    ? s.plan_id
    : "free";
}
export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}
/** @deprecated Nutze formatCents mit price_cents_monthly / price_cents_annual. */
export function price(p: TariffPlan) {
  return formatCents(p.price_cents);
}
/** Effektiver Monatspreis je nach Zahlungsintervall (bei jährlich: Jahrespreis / 12). */
export function monthlyPriceCents(p: TariffPlan, interval: BillingInterval) {
  return interval === "annual" ? Math.round(p.price_cents_annual / 12) : p.price_cents_monthly;
}
