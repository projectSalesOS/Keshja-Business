import { describe, expect, it } from "vitest";
import {
  addDays,
  computeTotals,
  displayStatus,
  filterDocs,
  missingForIssue,
  nextDunningLevel,
  openAmount,
  parseDecimal,
  validateItems,
  type DocLike,
} from "./documents";
import { buildDocumentPdf, buildDunningPdf, money, type PdfDoc } from "./documentPdf";

const inv = (o: Partial<DocLike> = {}): DocLike => ({ kind: "invoice", status: "issued", total: 119, valid_until: null, due_date: "2026-01-15", ...o });

describe("Steuerberechnung", () => {
  it("rechnet gemischte Steuersätze je Gruppe", () => {
    const t = computeTotals(
      [
        { quantity: 2, unit_price: 50, tax_rate: 19 },
        { quantity: 1, unit_price: 10, tax_rate: 7 },
        { quantity: 3, unit_price: 0.333, tax_rate: 0 },
      ],
      false,
    );
    expect(t.subtotal).toBe(111);
    expect(t.taxes).toEqual([
      { rate: 19, net: 100, tax: 19 },
      { rate: 7, net: 10, tax: 0.7 },
    ]);
    expect(t.taxTotal).toBe(19.7);
    expect(t.total).toBe(130.7);
  });
  it("rundet Steuer kaufmännisch pro Gruppe", () => {
    const t = computeTotals([{ quantity: 1, unit_price: 0.05, tax_rate: 19 }, { quantity: 1, unit_price: 0.05, tax_rate: 19 }], false);
    expect(t.taxTotal).toBe(0.02);
  });
  it("Kleinunternehmer: keine Umsatzsteuer, unabhängig vom Positionssatz", () => {
    const t = computeTotals([{ quantity: 1, unit_price: 100, tax_rate: 19 }], true);
    expect(t.taxes).toEqual([]);
    expect(t.total).toBe(100);
  });
  it("Storno mit negativen Mengen ergibt negative Summen", () => {
    const t = computeTotals([{ quantity: -2, unit_price: 50, tax_rate: 19 }], false);
    expect(t.total).toBe(-119);
  });
});

describe("Eingaben", () => {
  it("parst deutsche Zahlen", () => {
    expect(parseDecimal("1.234,5")).toBe(1234.5);
    expect(parseDecimal("0,25")).toBe(0.25);
    expect(parseDecimal("-3")).toBeNull();
    expect(parseDecimal("-3", true)).toBe(-3);
    expect(parseDecimal("abc")).toBeNull();
  });
  it("validiert Positionen", () => {
    expect(validateItems([])).toMatch(/mindestens/);
    expect(validateItems([{ description: "", quantity: 1, unit: "", unit_price: 1, tax_rate: 19 }])).toMatch(/Bezeichnung/);
    expect(validateItems([{ description: "A", quantity: 0, unit: "", unit_price: 1, tax_rate: 19 }])).toMatch(/Menge/);
    expect(validateItems([{ description: "A", quantity: 1, unit: "", unit_price: 1, tax_rate: 16 }])).toMatch(/Steuersatz/);
    expect(validateItems([{ description: "A", quantity: 1, unit: "", unit_price: 1, tax_rate: 7 }])).toBeNull();
  });
  it("meldet fehlende Pflichtangaben für Rechnungen", () => {
    const m = missingForIssue("invoice", { customer: { name: "K", street: "", city: "" }, itemCount: 1, serviceDate: null }, { street: "S", postal_code: "1", city: "C" });
    expect(m).toEqual(["Steuernummer oder USt-IdNr. des Unternehmens", "Kundenanschrift", "Leistungsdatum"]);
    expect(missingForIssue("quote", { customer: null, itemCount: 0, serviceDate: null }, {})).toEqual(["Kunde", "mindestens eine Position", "vollständige Unternehmensanschrift"]);
  });
  it("addiert Tage über Monatsgrenzen", () => {
    expect(addDays("2026-01-25", 14)).toBe("2026-02-08");
  });
});

describe("Status und Zahlungen", () => {
  const today = "2026-02-01";
  it("leitet Rechnungsstatus aus Zahlungen und Fälligkeit ab", () => {
    expect(displayStatus(inv({ status: "draft" }), 0, today)).toBe("draft");
    expect(displayStatus(inv({ due_date: "2026-03-01" }), 0, today)).toBe("issued");
    expect(displayStatus(inv({ due_date: "2026-03-01" }), 50, today)).toBe("partial");
    expect(displayStatus(inv(), 50, today)).toBe("overdue");
    expect(displayStatus(inv(), 119, today)).toBe("paid");
    expect(displayStatus(inv(), 150, today)).toBe("paid");
    expect(displayStatus(inv({ status: "cancelled" }), 0, today)).toBe("cancelled");
  });
  it("berechnet offenen Betrag inkl. Überzahlung", () => {
    expect(openAmount(119, 50.5)).toBe(68.5);
    expect(openAmount(119, 150)).toBe(-31);
  });
  it("erkennt abgelaufene Angebote", () => {
    const q = inv({ kind: "quote", valid_until: "2026-01-31", due_date: null });
    expect(displayStatus(q, 0, today)).toBe("expired");
    expect(displayStatus({ ...q, status: "accepted" }, 0, today)).toBe("accepted");
  });
});

describe("Mahnwesen", () => {
  const today = "2026-02-01";
  it("bietet Stufen nur für überfällige, offene Rechnungen an", () => {
    expect(nextDunningLevel(inv(), 0, [], today)).toBe(1);
    expect(nextDunningLevel(inv(), 0, [1], today)).toBe(2);
    expect(nextDunningLevel(inv(), 0, [1, 2, 3], today)).toBeNull();
    expect(nextDunningLevel(inv(), 119, [], today)).toBeNull();
    expect(nextDunningLevel(inv({ due_date: "2026-02-01" }), 0, [], today)).toBeNull();
    expect(nextDunningLevel(inv({ status: "cancelled" }), 0, [], today)).toBeNull();
    expect(nextDunningLevel(inv({ status: "draft" }), 0, [], today)).toBeNull();
  });
});

describe("Filter", () => {
  it("filtert nach Status, Kunde und Datum", () => {
    const rows = [
      { ...inv(), customer_id: "a", doc_date: "2026-01-01", number: "RE-2026-0001", customerName: "Alpha", paid: 0 },
      { ...inv({ due_date: "2026-05-01" }), customer_id: "b", doc_date: "2026-01-20", number: "RE-2026-0002", customerName: "Beta", paid: 0 },
    ];
    const f = { status: "all" as const, customerId: "", from: "", to: "", search: "" };
    expect(filterDocs(rows, { ...f, status: "overdue" }, "2026-02-01").map((r) => r.number)).toEqual(["RE-2026-0001"]);
    expect(filterDocs(rows, { ...f, customerId: "b" }, "2026-02-01")).toHaveLength(1);
    expect(filterDocs(rows, { ...f, from: "2026-01-10" }, "2026-02-01")).toHaveLength(1);
    expect(filterDocs(rows, { ...f, search: "beta" }, "2026-02-01")).toHaveLength(1);
  });
});

describe("PDF-Ausgabe", () => {
  const base: PdfDoc = {
    kind: "invoice",
    number: "RE-2026-0001",
    doc_date: "2026-01-01",
    valid_until: null,
    service_date: "2025-12-15",
    service_period_end: null,
    due_date: "2026-01-15",
    payment_days: 14,
    intro: "Für unsere Leistungen erlauben wir uns zu berechnen:",
    terms: null,
    small_business: false,
    company_snapshot: { name: "Muster GmbH", street: "Weg 1", postal_code: "10115", city: "Berlin", tax_number: "12/345/67890", iban: "DE00 0000" },
    customer_snapshot: { name: "Kunde Ä", street: "Straße 2", postal_code: "20095", city: "Hamburg" },
  };
  const items = [{ description: "Beratung", quantity: 2, unit: "Std.", unit_price: 80, tax_rate: 19 }];

  it("erzeugt ein gültiges Rechnungs-PDF mit Pflichtangaben", () => {
    const pdf = buildDocumentPdf(base, items);
    const out = pdf.output();
    expect(out.startsWith("%PDF")).toBe(true);
    expect(out).toContain("RE-2026-0001");
    expect(out).toContain("190,40 EUR");
    expect(out).toContain("12/345/67890");
  });
  it("Kleinunternehmer-PDF enthält Hinweis auf § 19 UStG", () => {
    const out = buildDocumentPdf({ ...base, small_business: true }, items).output();
    expect(out).toContain("19 UStG");
    expect(out).not.toContain("USt. auf");
  });
  it("erzeugt Angebots- und Mahnungs-PDF", () => {
    expect(buildDocumentPdf({ ...base, kind: "quote", number: "AN-2026-0001", valid_until: "2026-02-01" }, items).output()).toContain("AN-2026-0001");
    const m = buildDunningPdf({ ...base, total: 190.4 }, { level: 2, notice_date: "2026-02-01", new_due_date: "2026-02-11", open_amount: 90.4 }, 100).output();
    expect(m).toContain("1. Mahnung");
    expect(m).toContain("90,40 EUR");
  });
  it("formatiert Beträge", () => {
    expect(money(1234567.5)).toBe("1.234.567,50 EUR");
    expect(money(-119)).toBe("-119,00 EUR");
  });
});
