import { describe, expect, it } from "vitest";
import { extractVat, validateVat, vatTotals } from "./receipt-vat";
describe("Umsatzsteueraufteilung", () => {
  const rows = [{ rate: 19, net: 100, tax: 19, gross: 119 }, { rate: 7, net: 100, tax: 7, gross: 107 }];
  it("unterstützt mehrere Steuersätze ohne Doppelzählung", () => { expect(validateVat(rows, 226)).toBeNull(); expect(vatTotals(rows)).toEqual({ net: 200, tax: 26, gross: 226 }); });
  it("prüft Summe und Steuersatz", () => { expect(validateVat(rows, 225)).toBeTruthy(); expect(validateVat([{ rate: 19, net: 100, tax: 7, gross: 107 }], 107)).toBeTruthy(); });
  it("erhält Altbelege ohne Steuerblock", () => { expect(validateVat([], 50)).toBeNull(); expect(extractVat(null)).toEqual([]); });
  it("ergänzt nur ableitbare Werte", () => { expect(extractVat([{ rate: 19, net: null, tax: null, gross: 119 }])).toEqual([rows[0]]); expect(extractVat([{ net: 100, tax: 19 }])).toEqual([]); });
  it("unterstützt steuerfreie Beträge und Gutschriften", () => { expect(validateVat([{ rate: 0, net: 10, tax: 0, gross: 10 }], 10)).toBeNull(); expect(validateVat([{ rate: 19, net: -100, tax: -19, gross: -119 }], -119)).toBeNull(); });
});