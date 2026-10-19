import { describe, expect, it } from "vitest";
import { chartSeries, dashboardData } from "./dashboard";
import type { ATx } from "./analytics";

const tx = (override: Partial<ATx>): ATx => ({ type: "income", amount: 100, booking_date: "2026-10-10", category: "Umsatz", status: "bezahlt", customer_id: null, ...override });
const rows = [tx({ amount: 300 }), tx({ type: "expense", amount: 80, category: "Software" }), tx({ type: "expense", amount: 20, category: "Material" }), tx({ amount: 900, status: "offen" }), tx({ booking_date: "2026-09-10", amount: 200 })];
const october = { from: "2026-10-01", to: "2026-10-31" };

describe("Synchronized dashboard data", () => {
  it("uses only paid selected transactions for amounts and separate booking counts", () => {
    const d = dashboardData(rows, october);
    expect(d.totals).toEqual({ income: 300, expense: 100, balance: 200, count: 3 });
    expect([d.incomeCount, d.expenseCount]).toEqual([1, 2]);
  });
  it("updates totals, categories and all chart series with the same filter", () => {
    const d = dashboardData(rows, { from: "2026-09-01", to: "2026-09-30" });
    expect(d.totals.income).toBe(200);
    expect(d.categories).toEqual([]);
    expect(d.series.map((r) => r.income)).toEqual([200]);
    expect(d.trend.at(-1)?.income).toBe(200);
    expect(d.trend.at(-1)?.expense).toBe(0);
  });
  it("shows exactly six context months and gaps outside the selection", () => {
    const d = dashboardData(rows, october);
    expect(d.trend.map((r) => r.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(d.trend.slice(0, 5).map((r) => r.income)).toEqual([null, null, null, null, null]);
    expect(d.trend.at(-1)?.income).toBe(300);
  });
  it("provides filtered monthly income and expenses for both six-month charts", () => {
    const d = dashboardData(rows, { from: "2026-05-01", to: "2026-10-31" });
    expect(d.trend.map(({ income, expense }) => [income, expense])).toEqual([
      [0, 0], [0, 0], [0, 0], [0, 0], [200, 0], [300, 100],
    ]);
    expect(d.trend.reduce((sum, row) => sum + (row.income ?? 0), 0)).toBe(d.totals.income);
    expect(d.trend.reduce((sum, row) => sum + (row.expense ?? 0), 0)).toBe(d.totals.expense);
  });
  it("uses real categories whose sum matches selected expenses", () => {
    const d = dashboardData(rows, october);
    expect(d.categories).toEqual([{ name: "Software", value: 80 }, { name: "Material", value: 20 }]);
    expect(d.categories.reduce((sum, c) => sum + c.value, 0)).toBe(d.totals.expense);
  });
  it("does not invent percentage comparisons without prior type-specific values", () => {
    const d = dashboardData(rows, october);
    expect(d.deltas.income).toBe(50);
    expect(d.deltas.expense).toBeNull();
    expect(dashboardData([], october).deltas.balance).toBeNull();
  });
  it("returns honest zero totals and no categories for empty periods", () => {
    const d = dashboardData(rows, { from: "2027-01-01", to: "2027-01-31" });
    expect(d.totals).toEqual({ income: 0, expense: 0, balance: 0, count: 0 });
    expect(d.categories).toEqual([]);
    expect(d.series[0]?.balance).toBe(0);
  });
  it("respects exact custom days even in partial context months", () => {
    const d = dashboardData(rows, { from: "2026-10-11", to: "2026-10-18" });
    expect(d.totals.count).toBe(0);
    expect(d.trend.at(-1)?.income).toBe(0);
  });
});