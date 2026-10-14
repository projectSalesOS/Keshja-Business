import { z } from "zod";

export const vatRowSchema = z.object({
  rate: z.number().finite().min(0).max(100),
  net: z.number().finite().min(-999999).max(999999),
  tax: z.number().finite().min(-999999).max(999999),
  gross: z.number().finite().min(-999999).max(999999),
});
export type VatRow = z.infer<typeof vatRowSchema>;
const round = (v: number) => Math.round(v * 100) / 100;
export function vatTotals(rows: VatRow[]) {
  return { net: round(rows.reduce((s, r) => s + r.net, 0)), tax: round(rows.reduce((s, r) => s + r.tax, 0)), gross: round(rows.reduce((s, r) => s + r.gross, 0)) };
}
export function validateVat(rows: VatRow[], total: number): string | null {
  if (!rows.length) return null;
  if (rows.length > 20 || rows.some((r) => !vatRowSchema.safeParse(r).success)) return "Bitte gültige Umsatzsteuerwerte eingeben.";
  const differs = (a: number, b: number) => Math.abs(a - b) > 0.030001;
  if (rows.some((r) => differs(r.net + r.tax, r.gross) || differs(r.net * r.rate / 100, r.tax))) return "Netto + Steuer muss Brutto ergeben; Steuer muss zum Steuersatz passen.";
  if (differs(vatTotals(rows).gross, total)) return "Die Bruttosumme der Steuersätze stimmt nicht mit dem Gesamtbetrag überein.";
  return null;
}
/** Complete only arithmetically derivable values; never infer a missing rate. */
export function extractVat(value: unknown): VatRow[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const r = v as Record<string, unknown>;
    if (typeof r.rate !== "number") return [];
    let net = typeof r.net === "number" ? r.net : null;
    let tax = typeof r.tax === "number" ? r.tax : null;
    let gross = typeof r.gross === "number" ? r.gross : null;
    if (net !== null && tax !== null && gross === null) gross = round(net + tax);
    if (gross !== null && net === null) net = tax !== null ? round(gross - tax) : round(gross / (1 + r.rate / 100));
    if (net !== null && tax === null) tax = gross !== null ? round(gross - net) : round(net * r.rate / 100);
    if (gross === null && net !== null && tax !== null) gross = round(net + tax);
    const row = vatRowSchema.safeParse({ rate: r.rate, net, tax, gross });
    return row.success ? [row.data] : [];
  });
}