import { z } from "zod";
import { vatRowSchema } from "./receipt-vat";
import { isDepositItem } from "./receipt-lines";
import type { ReceiptTrace } from "./receipt-trace";
import {
  BEREICHE,
  FALLBACK_BEREICH,
  FALLBACK_KATEGORIE,
  KATEGORIE_TO_BEREICH,
  LEGACY_BEREICH_MAP,
  LEGACY_SUBCATEGORY_MAP,
} from "./categories";

/** Structure returned by the AI and edited by the user on the review screen. */
export const parsedItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().finite().min(0).max(999).nullable(),
  /** tatsächlich bezahlter Preis nach Rabatt */
  price: z.number().finite().min(-9999).max(99999),
  /** Preis vor Rabatt (falls abweichend) */
  originalPrice: z.number().finite().min(0).max(99999).nullable().default(null),
  /** positiver Rabattbetrag, der dieser Position zugeordnet ist */
  discount: z.number().finite().min(0).max(99999).default(0),
  /** Herkunft des Rabatts, null wenn kein Rabatt zugeordnet ist */
  discountKind: z.enum(["position", "beleg", "treue"]).nullable().default(null),
  category: z.string().trim().min(1).max(60),
  subcategory: z.string().trim().min(1).max(60),
  /** Warenposition oder Pfandkomponente */
  kind: z.enum(["product", "deposit"]).default("product"),
});

export const parsedReceiptSchema = z.object({
  merchant: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT erwartet"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  total: z.number().finite().min(0).max(999999),
  vatBreakdown: z.array(vatRowSchema).max(20).optional(),
  /** Rabatt auf Belegebene, der keiner Position zugeordnet werden kann */
  discountTotal: z.number().finite().min(0).max(999999).default(0),
  items: z.array(parsedItemSchema).min(1, "Es wurde keine Position erkannt"),
  /** Verarbeitungsprotokoll (nur Debug/Nachvollziehbarkeit) */
  trace: z
    .custom<ReceiptTrace>((value) => value === null || typeof value === "object")
    .nullable()
    .optional(),
  /** Prüfsumme des analysierten Fotos */
  imageSha256: z.string().max(64).nullable().optional(),
  /** verwendetes KI-Modell */
  model: z.string().max(80).nullable().optional(),
});

export type ParsedItem = z.infer<typeof parsedItemSchema>;
export type ParsedReceipt = z.infer<typeof parsedReceiptSchema>;

export const FALLBACK_CATEGORY = FALLBACK_BEREICH;
export const FALLBACK_SUBCATEGORY = FALLBACK_KATEGORIE;

/** Force every item onto the existing Cashya category tree – the AI may not invent new ones. */
export function normalizeCategories(receipt: ParsedReceipt): ParsedReceipt {
  return {
    ...receipt,
    items: receipt.items.map((item) => {
      if (item.kind === "deposit" || isDepositItem(item.name)) {
        return {
          ...item,
          kind: "deposit" as const,
          category: DEPOSIT_CATEGORY,
          subcategory: DEPOSIT_SUBCATEGORY,
        };
      }
      const categoryName = LEGACY_BEREICH_MAP[item.category] ?? item.category;
      const bereich = BEREICHE.find((b) => b.name === categoryName);
      if (bereich && bereich.kategorien.includes(item.subcategory)) {
        return { ...item, category: categoryName };
      }

      // Subcategory alone is valid → derive its main category.
      const derived = KATEGORIE_TO_BEREICH[item.subcategory];
      if (derived) return { ...item, category: derived };

      // Known subcategory from an older KESHJA version.
      const legacy = LEGACY_SUBCATEGORY_MAP[item.subcategory];
      if (legacy) return { ...item, category: legacy.bereich, subcategory: legacy.kategorie };

      // Unknown subcategory but valid main category → its "Sonstige" bucket.
      if (bereich) {
        const sonstige = bereich.kategorien.find((k) => k.startsWith("Sonstig"));
        if (sonstige) return { ...item, category: bereich.name, subcategory: sonstige };
      }

      return { ...item, category: FALLBACK_CATEGORY, subcategory: FALLBACK_SUBCATEGORY };
    }),
  };
}

export const CATEGORY_TREE_PROMPT = BEREICHE.map(
  (b) => `${b.name}: ${b.kategorien.join(", ")}`,
).join("\n");

const round2 = (n: number) => Math.round(n * 100) / 100;

export const DEPOSIT_CATEGORY = "Pfand";
export const DEPOSIT_SUBCATEGORY = "Pfand";

export type ReceiptTotals = {
  /** Summe der Warenpositionen (effektive Preise nach Positionsrabatt) */
  goodsTotal: number;
  /** Pfand minus Leergutrückgabe */
  depositTotal: number;
  /** Rabatt auf Belegebene */
  discountTotal: number;
  /** rechnerischer Zahlbetrag */
  expectedTotal: number;
};

/** WARENWERT + PFAND − BELEGRABATT = ZAHLBETRAG */
export function receiptTotals(receipt: ParsedReceipt): ReceiptTotals {
  let goodsTotal = 0;
  let depositTotal = 0;
  for (const item of receipt.items) {
    const price = Number(item.price) || 0;
    if (item.kind === "deposit") depositTotal += price;
    else goodsTotal += price;
  }
  goodsTotal = round2(goodsTotal);
  depositTotal = round2(depositTotal);
  const discountTotal = round2(Number(receipt.discountTotal) || 0);
  return {
    goodsTotal,
    depositTotal,
    discountTotal,
    expectedTotal: round2(goodsTotal + depositTotal - discountTotal),
  };
}

