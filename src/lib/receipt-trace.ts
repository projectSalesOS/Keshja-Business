import type { LineType, RawLine } from "./receipt-lines";
import type { ReceiptCheck } from "./receipt-check";

export type ClassifiedLine = RawLine & { type: LineType };

export type DiscountTraceEntry = {
  /** Zeilenindex auf dem Bon, aus dem der Rabatt stammt */
  sourceLine: number;
  text: string;
  amount: number;
  kind: "position" | "beleg" | "treue";
  /** Index der Produktposition in mergedItems, sonst null */
  assignedToItem: number | null;
  /** true = der Betrag steckt schon im ausgewiesenen Produktpreis */
  alreadyIncludedInItemPrice: boolean;
  /** true = der Betrag hat die Summenberechnung tatsächlich verändert */
  appliedToTotals: boolean;
};

export type TraceItem = {
  index: number;
  sourceLine: number;
  name: string;
  quantity: number | null;
  price: number;
  originalPrice: number | null;
  discount: number;
  kind: "product" | "deposit";
};

export type ReceiptTrace = {
  rawLines: RawLine[];
  classifiedLines: ClassifiedLine[];
  mergedItems: TraceItem[];
  deposits: TraceItem[];
  goodsTotal: number;
  positionDiscounts: DiscountTraceEntry[];
  aggregateControls: DiscountTraceEntry[];
  receiptDiscount: number;
  paymentTotal: number;
  notes: string[];
  check: ReceiptCheck;
};

export type TraceDiffField = {
  field: string;
  values: (string | number | null)[];
  differs: boolean;
};

const num = (n: number) => Math.round(n * 100) / 100;

function summarize(trace: ReceiptTrace) {
  return {
    Produktzeilen: trace.mergedItems.length,
    Pfandzeilen: trace.deposits.length,
    Positionsrabatte: trace.positionDiscounts.length,
    Warenwert: num(trace.goodsTotal),
    Pfand: num(trace.deposits.reduce((s, d) => s + d.price, 0)),
    Belegrabatt: num(trace.receiptDiscount),
    Zahlbetrag: num(trace.paymentTotal),
    Differenz: num(trace.check.difference),
    Klassifikation: trace.check.kind,
  } as Record<string, string | number>;
}

/**
 * Vergleicht mehrere Läufe desselben Bildes. Rein deterministisch:
 * gleiche Traces ergeben immer denselben Diff.
 */
export function diffTraces(traces: ReceiptTrace[]): {
  fields: TraceDiffField[];
  lines: { name: string; values: (string | null)[]; differs: boolean }[];
} {
  const summaries = traces.map(summarize);
  const keys = Object.keys(summaries[0] ?? {});
  const fields: TraceDiffField[] = keys.map((field) => {
    const values = summaries.map((s) => s[field] ?? null);
    return { field, values, differs: new Set(values.map(String)).size > 1 };
  });

  const names = [
    ...new Set(traces.flatMap((t) => [...t.mergedItems, ...t.deposits].map((i) => i.name))),
  ].sort();
  const lines = names.map((name) => {
    const values = traces.map((t) => {
      const hit = [...t.mergedItems, ...t.deposits].find((i) => i.name === name);
      if (!hit) return null;
      return `${hit.quantity ?? 1} × ${hit.price.toFixed(2)} € (Rabatt ${hit.discount.toFixed(2)} €)`;
    });
    return { name, values, differs: new Set(values.map(String)).size > 1 };
  });

  return { fields, lines };
}