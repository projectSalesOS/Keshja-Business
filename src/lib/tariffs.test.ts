import { describe, it, expect } from "vitest";
import {
  effectivePlan,
  formatCents,
  monthlyPriceCents,
  remaining,
  type Subscription,
  type TariffPlan,
} from "./tariffs";
const s: Subscription = {
  organization_id: "org",
  plan_id: "premium",
  status: "active",
  starts_at: "2026-10-01T00:00:00Z",
  period_end: "2026-11-01T00:00:00Z",
  renews_at: null,
  source: "manual",
  trial_used: false,
};
const now = new Date("2026-10-19T11:02:00Z");
describe("Entitlements", () => {
  it("active paid period grants Premium", () => expect(effectivePlan(s, now)).toBe("premium"));
  it("cancellation retains paid period", () =>
    expect(effectivePlan({ ...s, status: "canceled" }, now)).toBe("premium"));
  it("expired period returns Free", () =>
    expect(effectivePlan(s, new Date("2026-11-01T00:00:00Z"))).toBe("free"));
  it("past due returns Free", () =>
    expect(effectivePlan({ ...s, status: "past_due" }, now)).toBe("free"));
  it("expired status returns Free", () =>
    expect(effectivePlan({ ...s, status: "expired" }, now)).toBe("free"));
  it("free status returns Free", () =>
    expect(effectivePlan({ ...s, plan_id: "free", status: "free" }, now)).toBe("free"));
  it("manual trial grants time bounded Premium", () =>
    expect(effectivePlan({ ...s, status: "trialing" }, now)).toBe("premium"));
  it("future period is not granted early", () =>
    expect(effectivePlan({ ...s, starts_at: "2026-10-20T00:00:00Z" }, now)).toBe("free"));
  it("remaining quota never negative", () => expect(remaining(20, 21)).toBe(0));
  it("Basic 20 scans yields 19 after one", () => expect(remaining(20, 1)).toBe(19));
  it("Premium 150 scans yields 149 after one", () => expect(remaining(150, 1)).toBe(149));
  it("unlimited bookings remain unlimited", () => expect(remaining(null, 2001)).toBe(null));
});
const plan = (over: Partial<TariffPlan>): TariffPlan => ({
  id: "basic",
  name: "Basic",
  price_cents: 0,
  price_cents_monthly: 1290,
  price_cents_annual: 11880,
  manual_limit: null,
  ocr_limit: 20,
  documents: true,
  voice: false,
  logo: false,
  advanced_reports: false,
  ...over,
});
describe("Intervallpreise", () => {
  it("Basic monatlich 12,90 €", () =>
    expect(formatCents(monthlyPriceCents(plan({}), "monthly"))).toBe("12,90 €"));
  it("Basic jährlich effektiv 9,90 €/Monat", () =>
    expect(formatCents(monthlyPriceCents(plan({}), "annual"))).toBe("9,90 €"));
  it("Basic Jahresgesamt 118,80 €", () =>
    expect(formatCents(plan({}).price_cents_annual)).toBe("118,80 €"));
  it("Premium monatlich 19,90 €, jährlich effektiv 16,90 €/Monat", () => {
    const p = plan({ id: "premium", price_cents_monthly: 1990, price_cents_annual: 20280 });
    expect(formatCents(monthlyPriceCents(p, "monthly"))).toBe("19,90 €");
    expect(formatCents(monthlyPriceCents(p, "annual"))).toBe("16,90 €");
    expect(formatCents(p.price_cents_annual)).toBe("202,80 €");
  });
  it("Free bleibt 0,00 € in beiden Intervallen", () => {
    const p = plan({ id: "free", price_cents_monthly: 0, price_cents_annual: 0 });
    expect(formatCents(monthlyPriceCents(p, "monthly"))).toBe("0,00 €");
    expect(formatCents(monthlyPriceCents(p, "annual"))).toBe("0,00 €");
  });
});
