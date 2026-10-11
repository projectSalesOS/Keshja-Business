import type { ParsedItem, ParsedReceipt } from "./receipt-schema";
import { receiptTotals } from "./receipt-schema";
import { isDepositItem, isDiscountLine } from "./receipt-lines";

export { isDepositItem, isDiscountLine };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Typische OCR-Verwechslungen auf Ziffernebene. */
const CONFUSIONS: Record<string, string[]> = {
  "0": ["6", "8", "9"],
  "1": ["7", "4"],
  "2": ["7", "3"],
  "3": ["8", "9", "5", "2"],
  "4": ["1", "9", "5"],
  "5": ["6", "3", "8", "9"],
  "6": ["5", "8", "0"],
  "7": ["1", "9", "8"],
  "8": ["3", "6", "0", "9"],
  "9": ["4", "7", "8", "5", "0"],
};

/** Alternative Preise, die durch 1–2 verwechselte Ziffern entstehen können. */
function priceAlternatives(price: number): number[] {
  if (!Number.isFinite(price) || price <= 0) return [];
  const cents = Math.round(price * 100);
  const digits = String(cents).split("");
  const out = new Set<number>();

  const substitute = (arr: string[], index: number): string[][] => {
    const variants: string[][] = [];
    for (const alt of CONFUSIONS[arr[index]!] ?? []) {
      const copy = [...arr];
      copy[index] = alt;
      variants.push(copy);
    }
    return variants;
  };

  for (let i = 0; i < digits.length; i += 1) {
    for (const one of substitute(digits, i)) {
      out.add(Number(one.join("")));
      for (let j = i + 1; j < digits.length; j += 1) {
        for (const two of substitute(one, j)) out.add(Number(two.join("")));
      }
    }
  }

  const limit = Math.max(150, cents * 0.5);
  return [...out]
    .filter((c) => c > 0 && c !== cents && Math.abs(c - cents) <= limit)
    .map((c) => round2(c / 100));
}

export type Suspect = {
  index: number;
  /** Vorgeschlagener korrigierter Preis, falls eindeutig ableitbar. */
  suggestedPrice: number | null;
  reason: string;
};

export type ReceiptCheck = {
  /** Summe aller Positionspreise inkl. Pfand (bereits nach Rabatt) */
  itemSum: number;
  /** Warenwert ohne Pfand */
  goodsTotal: number;
  /** Pfand minus Leergutrückgabe */
  depositTotal: number;
  /** Pfandanteil innerhalb der Positionen (alias von depositTotal) */
  depositSum: number;
  /** Rabatt auf Belegebene */
  discountTotal: number;
  /** rechnerisch erwarteter Zahlbetrag */
  expectedTotal: number;
  /** erwarteter Betrag minus tatsächlicher Zahlbetrag */
  difference: number;
  status: "ok" | "mismatch";
  /** Klassifikation der Abweichung */
  kind:
    | "ok"
    | "rundungsdifferenz"
    | "doppelrabatt"
    | "fehlendes-pfand"
    | "fehlende-position"
    | "doppelte-position"
    | "ziffernverwechslung"
    | "aggregate_unresolved"
    | "unklar";
  suspects: Suspect[];
  message: string | null;
};

const TOLERANCE = 0.02;
/** übliche Pfandbeträge in Cent */
const DEPOSIT_UNITS = [8, 15, 25];

/** Rundungstoleranz: Gewichtsware darf je Position einen Cent abweichen. */
function toleranceFor(items: ParsedItem[]): number {
  const weighted = items.filter(
    (i) => typeof i.quantity === "number" && i.quantity !== null && !Number.isInteger(i.quantity),
  ).length;
  return round2(TOLERANCE + weighted * 0.01);
}

/**
 * Prüft: WARENWERT + PFAND − BELEGRABATT = ZAHLBETRAG.
 * Rabatte und Pfand sind Teil der Rechnung und gelten nicht als Fehler.
 */
export function checkReceipt(
  receipt: ParsedReceipt,
  options: { unresolvedDiscounts?: number } = {},
): ReceiptCheck {
  const items = receipt.items ?? [];
  const prices = items.map((i) => Number(i.price) || 0);
  const { goodsTotal, depositTotal, discountTotal, expectedTotal } = receiptTotals(receipt);
  const itemSum = round2(goodsTotal + depositTotal);
  const total = round2(Number(receipt.total) || 0);
  const difference = round2(expectedTotal - total);
  const tolerance = toleranceFor(items);

  const base: ReceiptCheck = {
    itemSum,
    goodsTotal,
    depositTotal,
    depositSum: depositTotal,
    discountTotal,
    expectedTotal,
    difference,
    status: "ok",
    kind: "ok",
    suspects: [],
    message: null,
  };

  if (total <= 0) return base;
  if (Math.abs(difference) <= tolerance) {
    return Math.abs(difference) > 0 ? { ...base, kind: "rundungsdifferenz" } : base;
  }

  const head = `Warenwert ${goodsTotal.toFixed(2)} € + Pfand ${depositTotal.toFixed(2)} € − Rabatt ${discountTotal.toFixed(2)} € = ${expectedTotal.toFixed(2)} €, der Bon weist ${total.toFixed(2)} € aus (Abweichung ${Math.abs(difference).toFixed(2)} €).`;
  const mismatch = (
    kind: ReceiptCheck["kind"],
    message: string,
    suspects: Suspect[] = [],
  ): ReceiptCheck => ({ ...base, status: "mismatch", kind, suspects, message });

  // Doppelrabatt: ohne den Belegrabatt geht der Bon exakt auf.
  if (discountTotal > 0 && Math.abs(round2(goodsTotal + depositTotal - total)) <= tolerance) {
    return mismatch(
      "doppelrabatt",
      `${head} Der Rabatt scheint bereits in den Positionspreisen enthalten zu sein – Belegrabatt bitte auf 0 setzen.`,
    );
  }

  // Nicht zuordenbare Vorteilsbeträge: bewusst nicht verrechnet.
  if ((options.unresolvedDiscounts ?? 0) > 0) {
    return mismatch(
      "aggregate_unresolved",
      `${head} Die ausgewiesenen Preisvorteile lassen sich nicht eindeutig zuordnen und wurden nicht abgezogen – bitte Positionen prüfen.`,
      findSuspects(items, prices, difference),
    );
  }

  // Ziffernverwechslung: ein oder zwei Preise erklären die Abweichung exakt.
  const suspects = findSuspects(items, prices, difference);
  const explained = suspects.some((s) => s.suggestedPrice != null);
  if (explained) {
    return mismatch(
      "ziffernverwechslung",
      `${head} Wahrscheinlich falsch erkannte Preise sind markiert.`,
      suspects,
    );
  }

  // Doppelt erkannte Position: die Abweichung entspricht genau einem Positionspreis.
  const duplicateIndex = prices.findIndex((p) => Math.abs(round2(p - difference)) <= tolerance);
  if (difference > 0 && duplicateIndex >= 0) {
    return mismatch(
      "doppelte-position",
      `${head} „${items[duplicateIndex]!.name}" wurde vermutlich doppelt erkannt.`,
      [
        {
          index: duplicateIndex,
          suggestedPrice: null,
          reason: "Position eventuell doppelt erkannt – bitte mit dem Bon abgleichen",
        },
      ],
    );
  }

  // Fehlendes Pfand: die Abweichung ist ein Vielfaches typischer Pfandbeträge.
  const missingCents = Math.round(-difference * 100);
  if (
    missingCents > 0 &&
    missingCents <= 500 &&
    isDepositCombination(missingCents)
  ) {
    return mismatch(
      "fehlendes-pfand",
      `${head} Es fehlt vermutlich eine Pfandposition über ${(missingCents / 100).toFixed(2)} €.`,
    );
  }

  // Fehlende Position: der Bon ist höher als die erkannten Positionen.
  if (difference < 0) {
    return mismatch(
      "fehlende-position",
      `${head} Vermutlich wurde eine Position nicht erkannt – bitte ergänzen.`,
    );
  }

  return mismatch("unklar", `${head} Bitte Preise, Rabatte und Pfand prüfen.`, suspects);
}

/** Prüft, ob ein Betrag aus üblichen Pfandbeträgen zusammensetzbar ist. */
function isDepositCombination(cents: number): boolean {
  if (cents <= 0) return false;
  const reachable = new Set<number>([0]);
  for (let value = 1; value <= cents; value += 1) {
    if (DEPOSIT_UNITS.some((u) => reachable.has(value - u))) reachable.add(value);
  }
  return reachable.has(cents);
}

/**
 * Sucht Positionen, deren Preis durch typische OCR-Ziffernfehler
 * genau die festgestellte Abweichung erklärt – einzeln oder als Paar.
 */
function findSuspects(items: ParsedItem[], prices: number[], difference: number): Suspect[] {
  const targetCents = Math.round(difference * 100); // > 0: Positionen zu hoch
  type Alt = { index: number; price: number; deltaCents: number };
  const alts: Alt[] = [];

  items.forEach((item, index) => {
    if (isDiscountLine(item.name) || item.kind === "deposit") return;
    for (const price of priceAlternatives(prices[index]!)) {
      alts.push({
        index,
        price,
        deltaCents: Math.round((prices[index]! - price) * 100),
      });
    }
  });

  // 1) eine einzelne Position erklärt die Abweichung vollständig
  const single = alts
    .filter((a) => a.deltaCents === targetCents)
    .sort((a, b) => Math.abs(a.deltaCents) - Math.abs(b.deltaCents));
  if (single.length > 0) {
    const unique = new Map<number, Alt>();
    for (const a of single) if (!unique.has(a.index)) unique.set(a.index, a);
    return [...unique.values()].slice(0, 3).map((a) => ({
      index: a.index,
      suggestedPrice: unique.size === 1 ? a.price : null,
      reason: `Preis passt nicht zur Bonsumme – korrekt vermutlich ${a.price.toFixed(2)} €`,
    }));
  }

  // 2) zwei Positionen zusammen erklären die Abweichung
  const byDelta = new Map<number, Alt[]>();
  for (const a of alts) {
    const list = byDelta.get(a.deltaCents);
    if (list) list.push(a);
    else byDelta.set(a.deltaCents, [a]);
  }
  const pairs: [Alt, Alt][] = [];
  for (const a of alts) {
    const partners = byDelta.get(targetCents - a.deltaCents) ?? [];
    for (const b of partners) {
      if (b.index <= a.index) continue;
      pairs.push([a, b]);
      if (pairs.length > 400) break;
    }
    if (pairs.length > 400) break;
  }
  if (pairs.length > 0) {
    // kleinste Gesamtkorrektur bevorzugen
    pairs.sort(
      (p, q) =>
        Math.abs(p[0].deltaCents) +
        Math.abs(p[1].deltaCents) -
        (Math.abs(q[0].deltaCents) + Math.abs(q[1].deltaCents)),
    );
    const indices = new Set(pairs.slice(0, 6).flatMap(([a, b]) => [a.index, b.index]));
    const best = pairs[0]!;
    return [...indices].slice(0, 4).map((index) => {
      const match = best.find((a) => a.index === index);
      return {
        index,
        suggestedPrice: match && indices.size === 2 ? match.price : null,
        reason: match
          ? `Preis passt nicht zur Bonsumme – korrekt vermutlich ${match.price.toFixed(2)} €`
          : "Preis passt möglicherweise nicht zur Bonsumme",
      };
    });
  }

  // 3) kein Ziffernfehler erklärt die Abweichung: größte Positionen markieren
  return prices
    .map((price, index) => ({ price, index }))
    .filter(({ index }) => !isDiscountLine(items[index]!.name) && items[index]!.kind !== "deposit")
    .sort((a, b) => b.price - a.price)
    .slice(0, 2)
    .map(({ index }) => ({
      index,
      suggestedPrice: null,
      reason: "Preis bitte mit dem Bon abgleichen",
    }));
}
