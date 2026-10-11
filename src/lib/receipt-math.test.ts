import { describe, expect, it } from "vitest";
import { checkReceipt } from "./receipt-check";
import { foldDiscounts } from "./receipt-normalizer";
import {
  normalizeCategories,
  receiptTotals,
  type ParsedItem,
  type ParsedReceipt,
} from "./receipt-schema";

const item = (over: Partial<ParsedItem>): ParsedItem => ({
  name: "Position",
  quantity: 1,
  price: 1,
  originalPrice: null,
  discount: 0,
  discountKind: null,
  category: "Lebensmittel & Getränke",
  subcategory: "Sonstiges",
  kind: "product",
  ...over,
});

const receipt = (over: Partial<ParsedReceipt>): ParsedReceipt => ({
  merchant: "Testmarkt",
  date: "2026-01-05",
  time: "10:00",
  total: 0,
  discountTotal: 0,
  items: [],
  ...over,
});

const prepare = (r: ParsedReceipt) => foldDiscounts(normalizeCategories(r));

describe("Warenwert + Pfand − Rabatt = Zahlbetrag", () => {
  it("rechnet Pfand als eigene Belegkomponente", () => {
    const r = prepare(
      receipt({
        total: 5.24,
        items: [
          item({ name: "Cola 1,5l", price: 1.99 }),
          item({ name: "Pfand 0,25", price: 0.25, kind: "deposit" }),
          item({ name: "Brot", price: 3.0 }),
        ],
      }),
    );
    const totals = receiptTotals(r);
    expect(totals.goodsTotal).toBe(4.99);
    expect(totals.depositTotal).toBe(0.25);
    expect(checkReceipt(r).status).toBe("ok");
  });

  it("behandelt Leergutrückgabe als negatives Pfand, nicht als Rabatt", () => {
    const r = prepare(
      receipt({
        total: 8.0,
        items: [
          item({ name: "Wasserkasten", price: 5.5 }),
          item({ name: "Pfand", price: 3.3, kind: "deposit" }),
          item({ name: "Leergut Rückgabe", price: -0.8, kind: "deposit" }),
        ],
      }),
    );
    const totals = receiptTotals(r);
    expect(totals.goodsTotal).toBe(5.5);
    expect(totals.depositTotal).toBe(2.5);
    expect(totals.discountTotal).toBe(0);
    expect(checkReceipt(r).status).toBe("ok");
  });

  it("rechnet negative Rabattzeilen in das Produkt ein statt als negative Ausgabe", () => {
    const r = prepare(
      receipt({
        total: 2.49,
        items: [
          item({ name: "Kaffee", price: 4.99 }),
          item({ name: "Rabatt", price: -2.5 }),
        ],
      }),
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.price).toBe(2.49);
    expect(r.items[0]!.originalPrice).toBe(4.99);
    expect(r.items[0]!.discount).toBe(2.5);
    expect(r.items.every((i) => i.price >= 0)).toBe(true);
    expect(checkReceipt(r).status).toBe("ok");
  });

  it("verhindert doppelt gezählte Rabatte (Lidl-Fall)", () => {
    const r = prepare(
      receipt({
        total: 10.0,
        discountTotal: 1.5,
        items: [item({ name: "Ware", price: 10.0 })],
      }),
    );
    expect(r.discountTotal).toBe(0);
    expect(checkReceipt(r).status).toBe("ok");
  });

  it("akzeptiert Belegrabatt, wenn er wirklich fehlt", () => {
    const r = prepare(
      receipt({
        total: 8.5,
        discountTotal: 1.5,
        items: [item({ name: "Ware", price: 10.0 })],
      }),
    );
    expect(r.discountTotal).toBe(1.5);
    expect(checkReceipt(r).status).toBe("ok");
  });

  it("toleriert Rundungsdifferenzen bei Gewichtsware", () => {
    const check = checkReceipt(
      prepare(
        receipt({
          total: 5.0,
          items: [item({ name: "Äpfel", quantity: 0.842, price: 5.01 })],
        }),
      ),
    );
    expect(check.status).toBe("ok");
    expect(check.kind).toBe("rundungsdifferenz");
  });

  it("meldet eine fehlende Position, wenn der Bon höher ist", () => {
    const check = checkReceipt(
      prepare(receipt({ total: 20.0, items: [item({ name: "Ware", price: 12.0 })] })),
    );
    expect(check.status).toBe("mismatch");
    expect(check.kind).toBe("fehlende-position");
  });

  it("erkennt eine wahrscheinliche Ziffernverwechslung", () => {
    const check = checkReceipt(
      prepare(
        receipt({
          total: 10.29,
          items: [item({ name: "Ware A", price: 8.99 }), item({ name: "Ware B", price: 4.3 })],
        }),
      ),
    );
    expect(check.status).toBe("mismatch");
    expect(check.suspects.length).toBeGreaterThan(0);
  });

  it("führt Pfandpositionen nie in einer Ausgabenkategorie", () => {
    const r = prepare(
      receipt({
        total: 0.25,
        items: [item({ name: "Einwegpfand", price: 0.25, category: "Mobilität & Auto" })],
      }),
    );
    expect(r.items[0]!.kind).toBe("deposit");
    expect(r.items[0]!.category).toBe("Pfand");
  });
});
