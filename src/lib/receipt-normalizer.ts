import { checkReceipt, type ReceiptCheck } from "./receipt-check";
import {
  classifyLineType,
  isDepositItem,
  isDiscountLine,
  type RawReceipt,
} from "./receipt-lines";
import {
  DEPOSIT_CATEGORY,
  DEPOSIT_SUBCATEGORY,
  FALLBACK_CATEGORY,
  FALLBACK_SUBCATEGORY,
  normalizeCategories,
  receiptTotals,
  type ParsedItem,
  type ParsedReceipt,
} from "./receipt-schema";
import type {
  ClassifiedLine,
  DiscountTraceEntry,
  ReceiptTrace,
  TraceItem,
} from "./receipt-trace";

const round2 = (n: number) => Math.round(n * 100) / 100;
const TOLERANCE = 0.02;

export type NormalizeResult = {
  receipt: ParsedReceipt;
  trace: ReceiptTrace;
  check: ReceiptCheck;
};

/** Stufe 1: jede Rohzeile bekommt genau einen Typ. */
export function classifyLines(raw: RawReceipt): ClassifiedLine[] {
  return [...raw.lines]
    .sort((a, b) => a.index - b.index)
    .map((line) => ({ ...line, type: classifyLineType(line.text, line.amount) }));
}

/**
 * Zentrale, deterministische Normalisierung.
 * Für identische Rohdaten liefert normalize() immer exakt dasselbe Ergebnis:
 * keine Zufallsauswahl, keine Uhrzeit, kein Netzwerk, keine Preisheuristik.
 */
export function normalize(raw: RawReceipt): NormalizeResult {
  const classified = classifyLines(raw);
  const notes: string[] = [];

  const items: ParsedItem[] = [];
  const traceItems: TraceItem[] = [];
  const depositTrace: TraceItem[] = [];
  const positionDiscounts: DiscountTraceEntry[] = [];
  const aggregateControls: DiscountTraceEntry[] = [];
  /** Zeilenindex → Position in items */
  const productItemIndex: { line: number; item: number }[] = [];

  for (const line of classified) {
    const amount = line.amount == null ? null : round2(line.amount);

    if (line.type === "deposit" || line.type === "deposit_return") {
      if (amount == null) continue;
      const item: ParsedItem = {
        name: line.text,
        quantity: line.quantity,
        price: amount,
        originalPrice: null,
        discount: 0,
        discountKind: null,
        category: DEPOSIT_CATEGORY,
        subcategory: DEPOSIT_SUBCATEGORY,
        kind: "deposit",
      };
      items.push(item);
      depositTrace.push({
        index: items.length - 1,
        sourceLine: line.index,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        originalPrice: null,
        discount: 0,
        kind: "deposit",
      });
      continue;
    }

    if (line.type === "product") {
      if (amount == null) continue;
      const item: ParsedItem = {
        name: line.text,
        quantity: line.quantity,
        price: amount,
        originalPrice: null,
        discount: 0,
        discountKind: null,
        category: line.category?.trim() || FALLBACK_CATEGORY,
        subcategory: line.subcategory?.trim() || FALLBACK_SUBCATEGORY,
        kind: "product",
      };
      items.push(item);
      productItemIndex.push({ line: line.index, item: items.length - 1 });
      traceItems.push({
        index: items.length - 1,
        sourceLine: line.index,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        originalPrice: null,
        discount: 0,
        kind: "product",
      });
      continue;
    }

    if (line.type === "product_discount") {
      if (amount == null || amount === 0) continue;
      const value = round2(Math.abs(amount));
      // Zuordnung ausschließlich über die Zeilenreihenfolge: die nächstliegende
      // VORANGEHENDE Produktzeile, niemals die teuerste Position.
      const target = [...productItemIndex].reverse().find((p) => p.line < line.index);
      if (target) {
        const item = items[target.item]!;
        const original = item.originalPrice ?? item.price;
        item.discount = round2(item.discount + value);
        item.originalPrice = round2(original);
        item.price = round2(Math.max(0, original - item.discount));
        item.discountKind = "position";
        const t = traceItems.find((i) => i.index === target.item)!;
        t.price = item.price;
        t.originalPrice = item.originalPrice;
        t.discount = item.discount;
        positionDiscounts.push({
          sourceLine: line.index,
          text: line.text,
          amount: value,
          kind: "position",
          assignedToItem: target.item,
          alreadyIncludedInItemPrice: false,
          appliedToTotals: true,
        });
      } else {
        aggregateControls.push({
          sourceLine: line.index,
          text: line.text,
          amount: value,
          kind: "beleg",
          assignedToItem: null,
          alreadyIncludedInItemPrice: false,
          appliedToTotals: false,
        });
        notes.push(
          `Rabattzeile „${line.text}" (${value.toFixed(2)} €) konnte keiner Produktposition zugeordnet werden.`,
        );
      }
      continue;
    }

    if (line.type === "receipt_discount" || line.type === "aggregate_info") {
      if (amount == null || amount === 0) continue;
      aggregateControls.push({
        sourceLine: line.index,
        text: line.text,
        amount: round2(Math.abs(amount)),
        kind: line.type === "aggregate_info" && /lidl plus|treue/i.test(line.text) ? "treue" : "beleg",
        assignedToItem: null,
        alreadyIncludedInItemPrice: false,
        appliedToTotals: false,
      });
    }
    // subtotal, total, payment, tax_block, loyalty_info, ignore → keine Position
  }

  const base: ParsedReceipt = normalizeCategories({
    merchant: raw.merchant,
    date: raw.date,
    time: raw.time,
    total: round2(raw.total),
    discountTotal: 0,
    items,
  });

  const { goodsTotal, depositTotal } = receiptTotals(base);
  const withoutDiscount = round2(goodsTotal + depositTotal);
  const total = round2(raw.total);

  let receiptDiscount = 0;
  let unresolved = 0;

  if (total > 0 && aggregateControls.length > 0) {
    if (Math.abs(withoutDiscount - total) <= TOLERANCE) {
      // Regel 1: Vorteile stecken bereits in den Positionspreisen.
      for (const entry of aggregateControls) entry.alreadyIncludedInItemPrice = true;
      notes.push(
        "Die ausgewiesenen Vorteilsbeträge sind bereits in den Positionspreisen enthalten und wurden nicht erneut abgezogen.",
      );
    } else {
      // Regel 2: genau ein Kandidat (oder deren Summe) erklärt die Differenz.
      const single = aggregateControls.find(
        (entry) => Math.abs(round2(withoutDiscount - entry.amount) - total) <= TOLERANCE,
      );
      const sum = round2(aggregateControls.reduce((s, e) => s + e.amount, 0));
      if (single) {
        receiptDiscount = single.amount;
        single.appliedToTotals = true;
      } else if (
        aggregateControls.length > 1 &&
        Math.abs(round2(withoutDiscount - sum) - total) <= TOLERANCE
      ) {
        receiptDiscount = sum;
        for (const entry of aggregateControls) entry.appliedToTotals = true;
      } else {
        // Regel 3: keine eindeutige Zuordnung – nichts abziehen, nichts erfinden.
        unresolved = aggregateControls.length;
        notes.push(
          "aggregate_unresolved: Die ausgewiesenen Vorteilsbeträge lassen sich dem Zahlbetrag nicht eindeutig zuordnen und wurden nicht verrechnet.",
        );
      }
    }
  }

  const receipt: ParsedReceipt = { ...base, discountTotal: receiptDiscount };
  const check = checkReceipt(receipt, { unresolvedDiscounts: unresolved });

  const trace: ReceiptTrace = {
    rawLines: [...raw.lines].sort((a, b) => a.index - b.index),
    classifiedLines: classified,
    mergedItems: traceItems,
    deposits: depositTrace,
    goodsTotal: receiptTotals(receipt).goodsTotal,
    positionDiscounts,
    aggregateControls,
    receiptDiscount,
    paymentTotal: total,
    notes,
    check,
  };

  return { receipt, trace, check };
}

/**
 * Legacy-Pfad für bereits gebuchte Positionen (Nutzerkorrekturen im Prüfdialog
 * und gespeicherte Bons). Dieselben Regeln wie normalize(), nur ohne Rohzeilen.
 */
export function foldDiscounts(receipt: ParsedReceipt): ParsedReceipt {
  const items: ParsedItem[] = [];
  let receiptDiscount = receipt.discountTotal ?? 0;

  for (const item of receipt.items) {
    const deposit = item.kind === "deposit" || isDepositItem(item.name);
    if (deposit) {
      items.push({
        ...item,
        kind: "deposit",
        price: round2(item.price),
        discount: 0,
        discountKind: null,
        originalPrice: null,
        category: DEPOSIT_CATEGORY,
        subcategory: DEPOSIT_SUBCATEGORY,
      });
      continue;
    }

    const isDiscount = item.price < 0 || isDiscountLine(item.name);
    const amount = Math.abs(item.price);

    if (isDiscount && amount > 0) {
      const target = [...items].reverse().find((i) => i.price > 0 && i.kind === "product");
      if (target) {
        const original = target.originalPrice ?? target.price;
        target.discount = round2((target.discount ?? 0) + amount);
        target.originalPrice = round2(original);
        target.price = round2(Math.max(0, original - target.discount));
        target.discountKind = "position";
      } else {
        receiptDiscount = round2(receiptDiscount + amount);
      }
      continue;
    }

    if (isDiscount) continue;

    items.push({
      ...item,
      kind: "product",
      price: round2(item.price),
      discount: round2(item.discount ?? 0),
      originalPrice: item.originalPrice != null ? round2(item.originalPrice) : null,
    });
  }

  for (const item of items) {
    if (item.kind === "deposit") continue;
    if (item.originalPrice != null && item.originalPrice > item.price) {
      item.discount = round2(Math.max(item.discount, item.originalPrice - item.price));
      item.discountKind = item.discountKind ?? "position";
    } else if (item.discount > 0) {
      item.originalPrice = round2(item.price + item.discount);
      item.discountKind = item.discountKind ?? "position";
    } else {
      // Ohne echten Rabatt gibt es keinen Originalpreis.
      item.originalPrice = null;
      item.discountKind = null;
    }
  }

  const folded: ParsedReceipt = { ...receipt, discountTotal: round2(receiptDiscount), items };
  return dropDoubleCountedDiscount(folded);
}

/**
 * Sind die Positionspreise bereits rabattiert und geht der Beleg ohne den
 * gemeldeten Belegrabatt exakt auf, wäre der Rabatt doppelt berücksichtigt.
 */
export function dropDoubleCountedDiscount(receipt: ParsedReceipt): ParsedReceipt {
  const total = round2(Number(receipt.total) || 0);
  if (total <= 0) return receipt;
  const { goodsTotal, depositTotal, discountTotal, expectedTotal } = receiptTotals(receipt);
  if (discountTotal <= 0) return receipt;
  const withoutDiscount = round2(goodsTotal + depositTotal);
  if (Math.abs(expectedTotal - total) > TOLERANCE && Math.abs(withoutDiscount - total) <= TOLERANCE) {
    return { ...receipt, discountTotal: 0 };
  }
  return receipt;
}