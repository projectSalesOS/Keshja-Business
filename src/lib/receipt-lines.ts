import { z } from "zod";

/**
 * Rohzeilen-Ebene: was die OCR liest, bevor irgendetwas verrechnet wird.
 * Auf dieser Ebene werden Preise NIE verändert, Rabatte NIE gefaltet und
 * Summen NIE interpretiert.
 */
export const rawLineSchema = z.object({
  /** Reihenfolge auf dem Bon, beginnend bei 0 */
  index: z.number().int().min(0).max(999),
  /** Zeilentext wie gedruckt */
  text: z.string().trim().min(1).max(160),
  /** erkannter Betrag inklusive Vorzeichen */
  amount: z.number().finite().min(-99999).max(99999).nullable(),
  quantity: z.number().finite().min(0).max(9999).nullable(),
  unitPrice: z.number().finite().min(-9999).max(99999).nullable(),
  /** reine Warenklassifikation, keine Preislogik */
  category: z.string().trim().max(60).nullable(),
  subcategory: z.string().trim().max(60).nullable(),
});

export const rawReceiptSchema = z.object({
  merchant: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  total: z.number().finite().min(0).max(999999),
  lines: z.array(rawLineSchema).min(1),
});

export type RawLine = z.infer<typeof rawLineSchema>;
export type RawReceipt = z.infer<typeof rawReceiptSchema>;

export type LineType =
  | "product"
  | "product_discount"
  | "receipt_discount"
  | "aggregate_info"
  | "deposit"
  | "deposit_return"
  | "subtotal"
  | "total"
  | "payment"
  | "tax_block"
  | "loyalty_info"
  | "ignore";

/** Erkennt Pfand-/Leergutpositionen anhand des Namens. */
export function isDepositItem(name: string): boolean {
  return /pfand|leergut|einweg|mehrweg|flaschenr/i.test(name);
}

/** Erkennt reine Rabatt-/Preisvorteilszeilen anhand des Namens. */
export function isDiscountLine(name: string): boolean {
  return /rabatt|nachlass|coupon|gutschein|aktion|preisvorteil|sofortrabatt|treue|sparvorteil/i.test(
    name,
  );
}

/** Erkennt aggregierte Vorteils-/Kontrollzeilen (niemals ein direkter Abzug). */
export function isAggregateLine(name: string): boolean {
  return /gesamter preisvorteil|preisvorteil gesamt|vorteil gesamt|sie sparen|ihre ersparnis|gesamtersparnis|ersparnis gesamt|lidl plus|summe rabatte|gesamtrabatt/i.test(
    name,
  );
}

/**
 * Deterministische Zeilenklassifikation. Die Regeln werden in fester
 * Reihenfolge geprüft; identischer Text ergibt immer denselben Typ.
 */
export function classifyLineType(text: string, amount: number | null): LineType {
  const t = text.trim();

  if (/\bmwst|mehrwertsteuer|\bust\b|steuersatz|^\s*[ab]\s*\d{1,2}[.,]\d{1,2}\s*%/i.test(t)) {
    return "tax_block";
  }
  if (
    /gegeben|rückgeld|ruckgeld|wechselgeld|^bar\b|ec[- ]?cash|girocard|kartenzahlung|kreditkarte|kartenzahl|\bbezahlung\b|^zahlung\b|zahlart|zahlungsart|\bvisa\b|\bdebit\b|\bmaestro\b|\bv[- ]?pay\b|mastercard|american express|\bamex\b|apple\s*pay|google\s*pay|paypal|kontaktlos|\bterminal\b|\bbeleg-?nr\b|\btrace\b|genehmigungs|autorisierung/i.test(
      t,
    )
  ) {
    return "payment";
  }
  if (/zwischensumme|teilsumme/i.test(t)) return "subtotal";
  if (
    /^(summe|gesamtsumme|gesamtbetrag|endbetrag|rechnungsbetrag|zu zahlen|zahlbetrag|betrag)\b/i.test(t) ||
    /\btotal\b/i.test(t) ||
    /(aussen|außen|netto|brutto|zwischen|end|gesamt|bon)total/i.test(t)
  ) {
    return "total";
  }

  if (/payback|punkte|bonuspunkte|treuepunkte|kundenkarte|coupon-?code/i.test(t) && !isAggregateLine(t)) {
    return "loyalty_info";
  }
  if (isDepositItem(t)) {
    return amount != null && amount < 0 ? "deposit_return" : "deposit";
  }
  if (isAggregateLine(t)) return "aggregate_info";
  if (/einkaufsrabatt|bonrabatt|rabatt auf (den )?einkauf/i.test(t)) return "receipt_discount";
  if (isDiscountLine(t) || (amount != null && amount < 0)) return "product_discount";
  if (amount != null) return "product";
  return "ignore";
}