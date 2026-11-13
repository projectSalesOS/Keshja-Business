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

describe("REWE-Bon 28.10.2026", () => {
  const rows: [string, number | null][] = [
    ["BANANE BANDEROLE", 1.15], ["0,890 kg x 1,29 EUR/kg", null], ["RD-HACKFLEISCH", 5.79], ["GEFL.WIENER", 3.29],
    ["JA! SCHMELZKAESE", 2.98], ["2 Stk x 1,49", null], ["SCHLEMMERBROET.", 0.99], ["STREUSELSCHNECKE", 1.19],
    ["BERLINER 6ER", 2.99], ["TORTILLA WEIZ.LE", 1.29], ["KARTOFFELCREME", 2.69], ["PORREE", 0.98], ["2 Stk x 0,49", null],
    ["BIO SCHLAGSAHNE", 1.19], ["PIZZA SPINACI", 1.79], ["CHAMPIGN.3.WAHL", 1.58], ["2 Stk x 0,79", null],
    ["ANZUENDWUERFEL", 1.95], ["JA! TOIPA 3LG", 3.75], ["SUMME", 33.6], ["Geg. Mastercard", 33.6],
  ];
  it("ergibt 33,60 € mit richtiger Zuordnung von Gewicht und Mengen", () => {
    const { receipt } = normalize({ merchant: "REWE", date: "2026-10-28", time: "16:21", total: 33.6,
      lines: rows.map(([t, a], i) => L(i, t, a)) });
    const by = (p: string) => receipt.items.find((i) => i.name.startsWith(p))!;
    expect(receipt.items).toHaveLength(15);
    expect(Math.round(receipt.items.reduce((s, i) => s + i.price, 0) * 100) / 100).toBe(33.6);
    expect([by("BANANE").quantity, by("BANANE").price]).toEqual([0.89, 1.15]);
    expect(by("RD-HACK").price).toBe(5.79);
    expect(by("GEFL").price).toBe(3.29);
    expect([by("JA! SCHMELZ").quantity, by("JA! SCHMELZ").price]).toEqual([2, 2.98]);
    expect([by("PORREE").quantity, by("PORREE").price]).toEqual([2, 0.98]);
    expect([by("CHAMPIGN").quantity, by("CHAMPIGN").price]).toEqual([2, 1.58]);
  });
  it("OCR-Tippfehler „2 StR x 1,49“ wird trotzdem als Mengenzeile erkannt", () => {
    const { receipt } = normalize({ merchant: "REWE", date: "2026-10-28", time: null, total: 2.98,
      lines: [L(0, "JA! SCHMELZKAESE", 2.98), L(1, "2 StR x 1,49", null)] });
    expect(receipt.items).toHaveLength(1);
  });
});
