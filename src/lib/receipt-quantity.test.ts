import { describe, expect, it } from "vitest";
import { normalize } from "./receipt-normalizer";
import type { RawLine } from "./receipt-lines";

const L = (index: number, text: string, amount: number | null, extra: Partial<RawLine> = {}): RawLine => ({
  index, text, amount, quantity: null, unitPrice: null, category: null, subcategory: null, taxGroup: null, ...extra,
});

// Netto-Bon vom 11.11.2026: Mengenzeile steht ÜBER dem Artikel.
const netto = (qtyAmount: number | null) => ({
  merchant: "Netto", date: "2026-11-11", time: "17:40", total: 12.88,
  lines: [
    L(0, "Kinder Tronky 5er 90g", 2.19), L(1, "Sesamrb-/Cash.,Rosine200G", 2.79),
    L(2, "2 x 0,95", qtyAmount), L(3, "Genusswelt Blaetterteig 275g", 1.9),
    L(4, "2 x 0,59", qtyAmount == null ? null : 0.59), L(5, "Laugenstange mit Kaese 1ST", 1.18),
    L(6, "Fruchtst.ACE EW1x1,5LFL", 1.19), L(7, "Leergut 0,25 EUR EW", 0.25),
    L(8, "GL Hirtenkaese oGt 250g", 1.59), L(9, "GL Gouda ger. 250g VLOG", 1.79), L(10, "SUMME [9]", 12.88),
  ],
});

describe("Mengenzeilen", () => {
  for (const amt of [null, 0.95]) {
    it(`Blätterteig wird genau eine Position (Mengenzeilen-Betrag ${amt})`, () => {
      const { receipt } = normalize(netto(amt));
      const names = receipt.items.map((i) => i.name);
      expect(names.some((n) => /^2\s*x/i.test(n))).toBe(false);
      const b = receipt.items.find((i) => i.name.startsWith("Genusswelt"))!;
      expect(b.quantity).toBe(2);
      expect(b.price).toBe(1.9);
      const l = receipt.items.find((i) => i.name.startsWith("Laugenstange"))!;
      expect(l.quantity).toBe(2);
      expect(receipt.items).toHaveLength(8);
      expect(Math.round(receipt.items.reduce((s, i) => s + i.price, 0) * 100) / 100).toBe(12.88);
    });
  }
  it("Mengenzeile unter dem Artikel und Schreibweise 'St. à'", () => {
    const { receipt } = normalize({ merchant: "X", date: "2026-11-11", time: null, total: 3.87,
      lines: [L(0, "Milch", 3.87), L(1, "3 St. à 1,29", null)] });
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0]!.quantity).toBe(3);
  });
  it("nicht zuordenbare Mengenzeile erzeugt keinen Artikel, sondern einen Prüfhinweis", () => {
    const { receipt, trace } = normalize({ merchant: "X", date: "2026-11-11", time: null, total: 2,
      lines: [L(0, "Brot", 2), L(1, "2 x 0,95", 0.95)] });
    expect(receipt.items).toHaveLength(1);
    expect(trace.notes.join(" ")).toMatch(/bitte prüfen/);
  });
});
