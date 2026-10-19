import { describe, expect, it } from "vitest";
import {
  actualTotals,
  byCategory,
  change,
  forecast,
  monthlySeries,
  plannedExpenses,
  previousRange,
  rangeFor,
  receivables,
  sumReceivables,
  toCsv,
  type AInvoice,
  type ARecurring,
  type ATx,
} from "./analytics";
import { buildReportPdf } from "./reportPdf";

const tx = (o: Partial<ATx>): ATx => ({ type: "income", amount: 100, booking_date: "2026-03-10", category: "Umsatzerlöse", status: "bezahlt", customer_id: null, ...o });
const inv = (o: Partial<AInvoice>): AInvoice => ({ id: "i1", kind: "invoice", status: "issued", number: "RE-2026-0001", customer_id: "c1", customerName: "Kunde A", doc_date: "2026-03-01", due_date: "2026-03-15", total: 1000, ...o });

describe("Einnahmen/Ausgaben/Saldo", () => {
  it("zählt nur bezahlte Buchungen im Zeitraum", () => {
    const rows = [tx({}), tx({ type: "expense", amount: 40, category: "Büromaterial" }), tx({ status: "offen", amount: 999 }), tx({ booking_date: "2026-04-01", amount: 500 })];
    expect(actualTotals(rows, { from: "2026-03-01", to: "2026-03-31" })).toEqual({ income: 100, expense: 40, balance: 60, count: 2 });
  });
  it("Rechnung allein ist keine Einnahme – nur die Zahlungsbuchung zählt (einmal)", () => {
    // Zahlung erzeugt genau eine Einnahmebuchung; Rechnungen fließen nicht in actualTotals ein
    expect(actualTotals([tx({ amount: 400 })], { from: "2026-01-01", to: "2026-12-31" }).income).toBe(400);
  });
  it("Filter nach Kategorie und Kunde", () => {
    const rows = [tx({ customer_id: "c1" }), tx({ customer_id: "c2", amount: 50 }), tx({ type: "expense", category: "Bankgebühren", amount: 5 })];
    const r = { from: "2026-03-01", to: "2026-03-31" };
    expect(actualTotals(rows, r, { customerId: "c2" }).income).toBe(50);
    expect(byCategory(rows, r, "expense")).toEqual([{ name: "Bankgebühren", value: 5 }]);
  });
});

describe("Zeiträume", () => {
  it("Monat, Vormonat über Jahreswechsel, Jahr", () => {
    expect(rangeFor("monat", "2026-02-14")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(rangeFor("vormonat", "2026-01-05")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(rangeFor("jahr", "2026-07-01")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(rangeFor("frei", "2026-07-01", { from: "2026-05-10", to: "2026-05-01" })).toEqual({ from: "2026-05-01", to: "2026-05-10" });
  });
  it("Vergleichszeiträume", () => {
    expect(previousRange({ from: "2026-03-01", to: "2026-03-31" })).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(previousRange({ from: "2026-01-01", to: "2026-01-31" })).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(previousRange({ from: "2026-01-01", to: "2026-12-31" })).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(previousRange({ from: "2026-03-10", to: "2026-03-19" })).toEqual({ from: "2026-02-28", to: "2026-03-09" });
  });
  it("kein Vergleich ohne Vorzeitraumdaten", () => {
    expect(change(100, 0, 0)).toBeNull();
    expect(change(150, 100, 3)).toBe(50);
  });
  it("Monatsreihe über Jahreswechsel, leere Monate mit count 0", () => {
    const s = monthlySeries([tx({ booking_date: "2025-12-31" }), tx({ booking_date: "2026-02-01", type: "expense", amount: 30 })], { from: "2025-12-01", to: "2026-02-28" });
    expect(s.map((m) => [m.month, m.count, m.cumulative])).toEqual([["2025-12", 1, 100], ["2026-01", 0, 100], ["2026-02", 1, 70]]);
  });
});

describe("Forderungen", () => {
  const today = "2026-03-20";
  it("Teilzahlung reduziert offenen Betrag, überfällig nach Fälligkeit", () => {
    const r = receivables([inv({})], [{ invoice_id: "i1", amount: 300, payment_date: "2026-03-05" }], today);
    expect(r[0]).toMatchObject({ open: 700, paid: 300, overdue: true, daysOverdue: 5 });
  });
  it("voll/über bezahlt, Entwurf, storniert und Stornorechnung zählen nicht", () => {
    const docs = [inv({}), inv({ id: "d", status: "draft" }), inv({ id: "x", status: "cancelled" }), inv({ id: "s", kind: "cancellation", total: -1000 }), inv({ id: "f", due_date: "2026-04-30" })];
    const r = receivables(docs, [{ invoice_id: "i1", amount: 1100, payment_date: "2026-03-05" }], today);
    expect(r.map((x) => x.id)).toEqual(["f"]);
    expect(sumReceivables(r)).toEqual({ openCount: 1, openTotal: 1000, overdueCount: 0, overdueTotal: 0 });
  });
  it("korrigierte (gelöschte) Zahlung erhöht den offenen Betrag wieder", () => {
    expect(receivables([inv({})], [], today)[0]?.open).toBe(1000);
  });
});

describe("Wiederkehrende Ausgaben", () => {
  const rec: ARecurring = { id: "r1", name: "Miete", category: "Miete & Raumkosten", amount: 800, interval: "monatlich", startDate: "2026-01-01", endDate: null, active: true };
  it("bereits gebuchte Perioden sind nicht geplant (keine Doppelzählung)", () => {
    const booked = [tx({ type: "expense", amount: 800, booking_date: "2026-03-01", recurring_expense_id: "r1", recurring_period: "2026-03-01" })];
    const p = plannedExpenses([rec], booked, { from: "2026-03-01", to: "2026-05-31" }, "2026-03-20");
    expect(p.map((x) => x.date)).toEqual(["2026-04-01", "2026-05-01"]);
  });
  it("inaktive und beendete werden ignoriert", () => {
    expect(plannedExpenses([{ ...rec, active: false }], [], { from: "2026-01-01", to: "2026-12-31" }, "2026-01-01")).toHaveLength(0);
    expect(plannedExpenses([{ ...rec, endDate: "2026-02-15" }], [], { from: "2026-01-01", to: "2026-12-31" }, "2026-01-01")).toHaveLength(2);
  });
});

describe("Liquiditätsvorschau", () => {
  it("trennt überfällig/erwartet/geplant und ignoriert Ist-Buchungen", () => {
    const today = "2026-03-20";
    const rcv = receivables([inv({}), inv({ id: "f", due_date: "2026-04-10", total: 500 }), inv({ id: "late", due_date: "2026-08-01" })], [], today);
    const rec: ARecurring = { id: "r1", name: "Miete", category: "x", amount: 800, interval: "monatlich", startDate: "2026-01-01", endDate: null, active: true };
    const booked = ["2026-01-01", "2026-02-01", "2026-03-01"].map((d) => tx({ type: "expense", amount: 800, booking_date: d, recurring_expense_id: "r1", recurring_period: d }));
    const f = forecast(rcv, [rec], [...booked, tx({ amount: 9999 })], today, "2026-04-19");
    expect(f.overdueInflow).toBe(1000);
    expect(f.expectedInflow).toBe(500);
    expect(f.plannedOutflow).toBe(800);
    expect(f.dueUnbookedOutflow).toBe(0);
    expect(f.net).toBe(700);
    expect(f.weeks.reduce((s, w) => s + w.net, 0)).toBe(700);
  });
});

describe("Export", () => {
  it("CSV: Semikolon, Dezimalkomma, BOM, Escaping, Formelschutz", () => {
    const csv = toCsv(["A", "B"], [["x;y", 1234.5], ["=SUM(1)", -3]]);
    expect(csv.startsWith("\uFEFFA;B\r\n")).toBe(true);
    expect(csv).toContain('"x;y";1234,50');
    expect(csv).toContain("'=SUM(1);-3,00");
  });
  it("PDF-Bericht wird erzeugt, auch bei leeren Daten", () => {
    const pdf = buildReportPdf({
      company: { name: "Test GmbH" },
      range: { from: "2026-01-01", to: "2026-12-31" },
      createdOn: "2026-03-20",
      totals: { income: 0, expense: 0, balance: 0, count: 0 },
      months: [],
      expenseCategories: [],
      incomeCategories: [],
      vat: { smallBusiness: false, outputVat: 0, inputVat: 0, incomeWithoutInvoice: 0, expensesWithoutVat: 0 },
      receivables: [],
      recurring: [],
      planned: [],
    });
    expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
    expect(pdf.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  });
});
