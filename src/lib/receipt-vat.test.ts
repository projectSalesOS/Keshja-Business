import { describe, expect, it } from "vitest";
import { extractVat, validateVat, vatTotals, vatFromGross, vatExtractionWarnings, vatGroupWarnings } from "./receipt-vat";
import type { RawLine } from "./receipt-lines";
describe("Umsatzsteueraufteilung", () => {
  const rows = [{ rate: 19, net: 100, tax: 19, gross: 119 }, { rate: 7, net: 100, tax: 7, gross: 107 }];
  it("unterstützt mehrere Steuersätze ohne Doppelzählung", () => { expect(validateVat(rows, 226)).toBeNull(); expect(vatTotals(rows)).toEqual({ net: 200, tax: 26, gross: 226 }); });
  it("prüft Summe und Steuersatz", () => { expect(validateVat(rows, 225)).toBeTruthy(); expect(validateVat([{ rate: 19, net: 100, tax: 7, gross: 107 }], 107)).toBeTruthy(); });
  it("erhält Altbelege ohne Steuerblock", () => { expect(validateVat([], 50)).toBeNull(); expect(extractVat(null)).toEqual([]); });
  it("ergänzt nur ableitbare Werte", () => { expect(extractVat([{ rate: 19, net: null, tax: null, gross: 119 }])).toEqual([rows[0]]); expect(extractVat([{ net: 100, tax: 19 }])).toEqual([]); });
  it("unterstützt steuerfreie Beträge und Gutschriften", () => { expect(validateVat([{ rate: 0, net: 10, tax: 0, gross: 10 }], 10)).toBeNull(); expect(validateVat([{ rate: 19, net: -100, tax: -19, gross: -119 }], -119)).toBeNull(); });
});

describe("OCR-Brutto und Steuergruppen", () => {
  const lines: RawLine[] = [
    ['Coca-Cola', 4.49, 'A'], ['Pfand', 0.90, 'A'],
    ['Lebensmittel 1', 1.77, 'B'], ['Lebensmittel 2', 1.59, 'B'],
    ['Lebensmittel 3', 1.21, 'B'], ['Lebensmittel 4', 1.21, 'B'],
  ].map(([text, amount, taxGroup], index) => ({ index, text: String(text), amount: Number(amount), taxGroup: String(taxGroup), quantity: 1, unitPrice: null, category: null, subcategory: null }));
  const rows = [{ ...vatFromGross(5.39, 19), group: 'A' }, { ...vatFromGross(5.78, 7), group: 'B' }];
  it("rechnet den Bon 11,17 € mit Pfand korrekt", () => {
    expect(rows).toEqual([{ rate: 19, net: 4.53, tax: 0.86, gross: 5.39, group: 'A' }, { rate: 7, net: 5.40, tax: 0.38, gross: 5.78, group: 'B' }]);
    expect(vatTotals(rows)).toEqual({ net: 9.93, tax: 1.24, gross: 11.17 });
    expect(validateVat(rows, 11.17)).toBeNull();
    expect(vatGroupWarnings(rows, lines)).toEqual([]);
  });
  it("weist die gemeldete falsche Summe 11,26 € zurück", () => {
    const wrong = [{ rate: 7, net: 4.53, tax: 0.32, gross: 4.85 }, { rate: 19, net: 5.39, tax: 1.02, gross: 6.41 }];
    expect(vatTotals(wrong).gross).toBe(11.26);
    expect(validateVat(wrong, 11.17)).not.toBeNull();
    expect(extractVat(wrong)).toEqual(wrong);
  });
  it("verwendet erkanntes Brutto statt widersprüchlichem Netto bei fehlender Steuer", () => {
    const raw = [{ rate: 19, net: 5.39, tax: null, gross: 5.39 }];
    expect(extractVat(raw)).toEqual([vatFromGross(5.39, 19)]);
    expect(vatExtractionWarnings(raw, extractVat(raw))).toHaveLength(1);
  });
  it("macht unvollständige oder verworfene OCR-Steuerwerte sichtbar", () => {
    expect(vatExtractionWarnings([{ rate: 19, net: 5.39, tax: null, gross: null }], extractVat([{ rate: 19, net: 5.39, tax: null, gross: null }]))).toHaveLength(1);
    expect(vatExtractionWarnings([{ rate: null, gross: 5.39 }], [])).toHaveLength(1);
  });
  it("berechnet einen einzelnen Steuersatz aus Brutto auf Cent", () => {
    expect(vatFromGross(119, 19)).toEqual({ rate: 19, net: 100, tax: 19, gross: 119 });
  });
  it("prüft rabattierte Steuergruppen ohne doppelten Abzug", () => {
    const discounted = [...lines, { ...lines[0], index: 6, text: 'Rabatt', amount: -1, quantity: null, unitPrice: null, category: null, subcategory: null, taxGroup: 'A' } as RawLine];
    const discountedRows = [{ ...vatFromGross(4.39, 19), group: 'A' }, rows[1]].filter((r): r is NonNullable<typeof r> => r !== undefined);
    expect(vatGroupWarnings(discountedRows, discounted)).toEqual([]);
    expect(validateVat(discountedRows, 10.17)).toBeNull();
  });
  it("zieht Leergutrückgabe innerhalb derselben Steuergruppe ab", () => {
    const returned: RawLine[] = [{ index: 0, text: 'Pfand', amount: 1.5, taxGroup: 'A', quantity: null, unitPrice: null, category: null, subcategory: null }, { index: 1, text: 'Leergut', amount: -0.75, taxGroup: 'A', quantity: null, unitPrice: null, category: null, subcategory: null }];
    expect(vatGroupWarnings([{ ...vatFromGross(0.75, 19), group: 'A' }], returned)).toEqual([]);
  });
  it("erkennt vertauschte Gruppen ohne Preise zu überschreiben", () => {
    expect(vatGroupWarnings(rows.map((r) => ({ ...r, group: r.group === 'A' ? 'B' : 'A' })), lines)).toHaveLength(2);
    expect(rows[0]?.gross).toBe(5.39);
  });
  it("errät keine fehlende Pfand-Steuergruppe", () => {
    expect(vatGroupWarnings(rows, lines.map((l) => l.text === 'Pfand' ? { ...l, taxGroup: null } : l))).toHaveLength(1);
  });
  it("hält Netto plus Steuer nach Cent-Rundung exakt auf Brutto", () => {
    const row = vatFromGross(0.05, 19);
    expect(row).toEqual({ rate: 19, net: 0.04, tax: 0.01, gross: 0.05 });
    expect(validateVat([row], 0.05)).toBeNull();
    expect(validateVat([row], 0.06)).toBeNull();
    expect(validateVat([row], 0.09)).not.toBeNull();
  });
});