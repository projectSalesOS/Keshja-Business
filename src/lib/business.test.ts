import { describe, expect, it } from "vitest";
import {
  EMPTY_CUSTOMER,
  cleanCustomer,
  duePeriods,
  filterTransactions,
  monthlyShare,
  parseAmount,
  totals,
  validateCustomer,
  type TxLike,
} from "./business";

describe("parseAmount", () => {
  it("parses German and plain formats", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount("12.50 €")).toBe(12.5);
  });
  it("rejects invalid, zero and negative values", () => {
    for (const v of ["", "abc", "0", "-5", "1,234", "12,345"]) expect(parseAmount(v)).toBeNull();
  });
});

describe("customers", () => {
  it("requires only a name and validates email", () => {
    expect(validateCustomer(EMPTY_CUSTOMER)).toMatch(/Namen/);
    expect(validateCustomer({ ...EMPTY_CUSTOMER, name: "ACME" })).toBeNull();
    expect(validateCustomer({ ...EMPTY_CUSTOMER, name: "ACME", email: "x@" })).toMatch(/E-Mail/);
  });
  it("stores empty optional fields as null", () => {
    const c = cleanCustomer({ ...EMPTY_CUSTOMER, name: "  ACME ", city: " " });
    expect(c.name).toBe("ACME");
    expect(c.city).toBeNull();
    expect(c.customer_number).toBeNull();
  });
});

describe("recurring expenses", () => {
  it("computes monthly share per interval", () => {
    expect(monthlyShare(120, "jährlich")).toBe(10);
    expect(monthlyShare(30, "vierteljährlich")).toBe(10);
    expect(monthlyShare(10, "monatlich")).toBe(10);
  });
  it("lists due dates up to today, clamps month end and respects end date", () => {
    expect(duePeriods("2026-01-31", "monatlich", "2026-04-15")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
    expect(duePeriods("2026-01-01", "vierteljährlich", "2026-12-31", "2026-07-01")).toEqual([
      "2026-01-01",
      "2026-04-01",
      "2026-07-01",
    ]);
    expect(duePeriods("2027-01-01", "jährlich", "2026-10-13")).toEqual([]);
  });
  it("is deterministic, so repeated runs yield the same periods (no duplicates)", () => {
    const a = duePeriods("2025-05-10", "monatlich", "2026-10-13");
    expect(new Set(a).size).toBe(a.length);
    expect(duePeriods("2025-05-10", "monatlich", "2026-10-13")).toEqual(a);
  });
});

describe("transactions", () => {
  const rows: TxLike[] = [
    { type: "income", amount: 500, booking_date: "2026-09-02", category: "Dienstleistungen", status: "offen", description: "Projekt A" },
    { type: "expense", amount: 40, booking_date: "2026-10-01", category: "Büromaterial", status: "bezahlt", description: null },
    { type: "expense", amount: 100, booking_date: "2026-10-05", category: "Software & Lizenzen", status: "offen", description: "Lizenz" },
  ];
  const base = { type: "all", status: "all", month: "", category: "", search: "", sort: "date_desc" } as const;

  it("filters by type, status, month and search", () => {
    expect(filterTransactions(rows, { ...base, type: "expense" })).toHaveLength(2);
    expect(filterTransactions(rows, { ...base, status: "offen" })).toHaveLength(2);
    expect(filterTransactions(rows, { ...base, month: "2026-10" })).toHaveLength(2);
    expect(filterTransactions(rows, { ...base, search: "projekt" })).toHaveLength(1);
  });
  it("sorts by date and amount", () => {
    expect(filterTransactions(rows, base)[0]!.booking_date).toBe("2026-10-05");
    expect(filterTransactions(rows, { ...base, sort: "amount_asc" })[0]!.amount).toBe(40);
  });
  it("sums income, expense and balance", () => {
    expect(totals(rows)).toEqual({ income: 500, expense: 140, balance: 360 });
  });
});
