import { parseAmount, type TxType } from "./business";

/** Conservative parsing: ambiguity leaves the field empty for explicit correction. */
export function parseVoiceBooking(text: string): { type: TxType | null; amount: number | null; description: string } {
  const income = /\b(einnahme[n]?|eingenommen|erhalten|umsatz|honorar)\b/i.test(text);
  const expense = /\b(ausgabe[n]?|ausgegeben|bezahlt|gekauft|kosten)\b/i.test(text);
  const matches = [...text.matchAll(/\b(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro)\b/gi)];
  const numeric = matches.length === 1 ? matches[0]?.[1] : undefined;
  const fallback = [...text.matchAll(/\b\d+(?:[.,]\d{1,2})?\b/g)];
  const value = numeric ?? (fallback.length === 1 ? fallback[0]?.[0] : undefined);
  const amount = value ? parseAmount(value) : null;
  const description = text.replace(/\b(?:einnahme[n]?|ausgabe[n]?)\b/gi, "")
    .replace(numeric ? matches[0]?.[0] ?? "" : value ?? "\u0000", "")
    .replace(/^\s*(?:für|von)\s+/i, "").replace(/\s+/g, " ").trim();
  return { type: income === expense ? null : income ? "income" : "expense", amount, description };
}