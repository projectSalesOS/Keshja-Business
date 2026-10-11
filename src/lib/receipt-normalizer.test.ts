import { describe, expect, it } from "vitest";
import { classifyLineType, type RawLine, type RawReceipt } from "./receipt-lines";
import { normalize } from "./receipt-normalizer";
import { receiptTotals } from "./receipt-schema";

let counter = 0;
const line = (text: string, amount: number | null, over: Partial<RawLine> = {}): RawLine => ({
  index: counter++,
  text,
  amount,
  quantity: null,
  unitPrice: null,
  category: "Lebensmittel & Getränke",
  subcategory: "Sonstiges",
  ...over,
});

const build = (lines: RawLine[], total: number): RawReceipt => ({
  merchant: "Lidl",
  date: "2026-08-01",
  time: "17:42",
  total,
  lines,
});

/** Referenzfall Lidl 01.08.2026: Zahlbetrag 44,55 €, Pfand 0,25 €. */
function lidlLines(): RawLine[] {
  counter = 0;
  const products: [string, number][] = [
    ["Bananen", 1.79],
    ["Vollmilch 3,5%", 1.15],
    ["Hähnchenbrust", 6.49],
    ["Bio-Eier 10er", 3.29],
    ["Kaffee 500g", 5.99],
    ["Toastbrot", 1.09],
    ["Butter", 2.29],
    ["Käseaufschnitt", 2.49],
    ["Waschmittel", 6.99],
    ["Duschgel", 1.45],
    ["Tomaten", 2.19],
    ["Gurke", 0.89],
    ["Nudeln 1kg", 1.49],
    ["Olivenöl", 4.99],
    ["Ice Tea Pfirsich", 1.72],
  ];
  return [
    ...products.map(([name, price]) => line(name, price)),
    line("Pfand Einweg", 0.25, { category: null, subcategory: null }),
    line("Gesamter Preisvorteil", -3.38, { category: null, subcategory: null }),
    line("Lidl Plus Vorteil", -0.8, { category: null, subcategory: null }),
    line("SUMME EUR", 44.55, { category: null, subcategory: null }),
    line("Kartenzahlung", 44.55, { category: null, subcategory: null }),
    line("MwSt A 19,00%", 3.11, { category: null, subcategory: null }),
  ];
}

describe("Zeilenklassifikation", () => {
  it("erkennt Zeilentypen deterministisch", () => {
    expect(classifyLineType("Bananen", 1.79)).toBe("product");
    expect(classifyLineType("Pfand Einweg", 0.25)).toBe("deposit");
    expect(classifyLineType("Leergut", -0.75)).toBe("deposit_return");
    expect(classifyLineType("Gesamter Preisvorteil", -3.38)).toBe("aggregate_info");
    expect(classifyLineType("Lidl Plus Vorteil", -0.8)).toBe("aggregate_info");
    expect(classifyLineType("Rabatt", -0.5)).toBe("product_discount");
    expect(classifyLineType("Einkaufsrabatt", -2)).toBe("receipt_discount");
    expect(classifyLineType("Zwischensumme", 44.55)).toBe("subtotal");
    expect(classifyLineType("SUMME EUR", 44.55)).toBe("total");
    expect(classifyLineType("Kartenzahlung", 44.55)).toBe("payment");
    expect(classifyLineType("MwSt A 19,00%", 3.11)).toBe("tax_block");
    expect(classifyLineType("Payback Punkte", 44)).toBe("loyalty_info");
  });
});

describe("Lidl-Referenzfall 44,55 €", () => {
  const raw = build(lidlLines(), 44.55);

  it("ergibt aus den Rohzeilen exakt den Zahlbetrag", () => {
    const { receipt, check } = normalize(raw);
    const totals = receiptTotals(receipt);
    expect(totals.goodsTotal).toBe(44.3);
    expect(totals.depositTotal).toBe(0.25);
    expect(receipt.discountTotal).toBe(0);
    expect(totals.expectedTotal).toBe(44.55);
    expect(check.status).toBe("ok");
  });

  it("zieht die 3,38 € nicht zusätzlich ab und behandelt sie als Kontrollwert", () => {
    const { trace } = normalize(raw);
    const aggregate = trace.aggregateControls.find((a) => a.amount === 3.38);
    expect(aggregate).toBeDefined();
    expect(aggregate!.appliedToTotals).toBe(false);
    expect(aggregate!.alreadyIncludedInItemPrice).toBe(true);
    expect(trace.positionDiscounts).toHaveLength(0);
    expect(trace.receiptDiscount).toBe(0);
  });

  it("interpretiert 3,38 € nicht als Summe von Positionsrabatten", () => {
    const { receipt } = normalize(raw);
    const sumOfItemDiscounts = receipt.items.reduce((s, i) => s + i.discount, 0);
    expect(sumOfItemDiscounts).toBe(0);
  });

  it("führt Pfand als eigene Belegkomponente, nicht als Ware", () => {
    const { receipt, trace } = normalize(raw);
    expect(trace.deposits).toHaveLength(1);
    expect(receipt.items.filter((i) => i.kind === "deposit")).toHaveLength(1);
    expect(receipt.items.filter((i) => i.kind === "product").some((i) => /Pfand/i.test(i.name))).toBe(
      false,
    );
  });

  it("ignoriert Summen-, Zahlungs- und Steuerzeilen", () => {
    const { receipt } = normalize(raw);
    expect(receipt.items).toHaveLength(16);
    expect(receipt.items.some((i) => /SUMME|Kartenzahlung|MwSt/i.test(i.name))).toBe(false);
  });

  it("liefert bei identischen Rohdaten identische Ergebnisse", () => {
    const a = normalize(raw);
    const b = normalize(build(lidlLines(), 44.55));
    expect(JSON.stringify(a.receipt)).toBe(JSON.stringify(b.receipt));
    expect(JSON.stringify(a.trace.mergedItems)).toBe(JSON.stringify(b.trace.mergedItems));
    expect(a.check.difference).toBe(b.check.difference);
  });
});

describe("Rabattregeln", () => {
  it("ordnet einen Positionsrabatt der vorangehenden Position zu", () => {
    counter = 0;
    const { receipt, trace } = normalize(
      build([line("Käse", 4.99), line("Rabatt", -2.5), line("Brot", 1.99)], 4.48),
    );
    expect(receipt.items[0]!.price).toBe(2.49);
    expect(receipt.items[0]!.originalPrice).toBe(4.99);
    expect(receipt.items[0]!.discount).toBe(2.5);
    expect(receipt.items[0]!.discountKind).toBe("position");
    expect(trace.positionDiscounts[0]!.assignedToItem).toBe(0);
    expect(trace.positionDiscounts[0]!.appliedToTotals).toBe(true);
    expect(receiptTotals(receipt).expectedTotal).toBe(4.48);
  });

  it("zieht einen Belegrabatt nur ab, wenn er die Differenz eindeutig erklärt", () => {
    counter = 0;
    const { receipt, check } = normalize(
      build([line("Ware", 10.0), line("Einkaufsrabatt", -1.5)], 8.5),
    );
    expect(receipt.discountTotal).toBe(1.5);
    expect(check.status).toBe("ok");
  });

  it("verrechnet nichts, wenn ein Vorteil nicht eindeutig zuzuordnen ist", () => {
    counter = 0;
    const { receipt, check, trace } = normalize(
      build([line("Ware", 10.0), line("Sie sparen", -1.5)], 9.0),
    );
    expect(receipt.discountTotal).toBe(0);
    expect(check.kind).toBe("aggregate_unresolved");
    expect(trace.aggregateControls[0]!.appliedToTotals).toBe(false);
  });

  it("erzeugt niemals negative Ausgabenpositionen", () => {
    counter = 0;
    const { receipt } = normalize(
      build([line("Ware", 3.0), line("Rabatt", -5.0)], 0),
    );
    expect(receipt.items.every((i) => i.kind === "deposit" || i.price >= 0)).toBe(true);
  });
});

describe("Pfandregeln", () => {
  it("berücksichtigt Leergutrückgabe negativ, aber getrennt von der Ware", () => {
    counter = 0;
    const { receipt } = normalize(
      build([line("Wasser", 3.0), line("Pfand", 1.5), line("Leergut", -0.75)], 3.75),
    );
    const totals = receiptTotals(receipt);
    expect(totals.goodsTotal).toBe(3);
    expect(totals.depositTotal).toBe(0.75);
    expect(totals.expectedTotal).toBe(3.75);
  });

  it("behandelt Pfand nicht als Rabatt", () => {
    counter = 0;
    const { trace } = normalize(build([line("Wasser", 3.0), line("Pfand", 1.5)], 4.5));
    expect(trace.positionDiscounts).toHaveLength(0);
    expect(trace.aggregateControls).toHaveLength(0);
  });
});

describe("McDonald's-Referenzfall 8,79 €", () => {
  it("zählt Kontroll-, Zahlungs- und Summenzeilen nicht zum Warenwert", () => {
    counter = 0;
    const raw = build(
      [
        line("2 Cheeseburger", 5.0),
        line("1 Cappuccino Small", 3.79),
        line("AUSSENTOTAL", 8.79, { category: null, subcategory: null }),
        line("Bezahlung Visa Debit", 8.79, { category: null, subcategory: null }),
        line("Betrag", 8.79, { category: null, subcategory: null }),
      ],
      8.79,
    );
    const { receipt, check } = normalize(raw);
    const totals = receiptTotals(receipt);
    expect(receipt.items).toHaveLength(2);
    expect(totals.goodsTotal).toBe(8.79);
    expect(totals.expectedTotal).toBe(8.79);
    expect(check.status).toBe("ok");
  });

  it("klassifiziert die Kontrollzeilen korrekt", () => {
    expect(classifyLineType("AUSSENTOTAL", 8.79)).toBe("total");
    expect(classifyLineType("Bezahlung Visa Debit", 8.79)).toBe("payment");
    expect(classifyLineType("Betrag", 8.79)).toBe("total");
  });
});
