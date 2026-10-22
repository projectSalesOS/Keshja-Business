import { z } from "zod";
import { classifyLineType, type RawLine } from "./receipt-lines";

export const vatRowSchema = z.object({
  rate: z.number().finite().min(0).max(100),
  net: z.number().finite().min(-999999).max(999999),
  tax: z.number().finite().min(-999999).max(999999),
  gross: z.number().finite().min(-999999).max(999999),
  group: z.string().trim().max(20).nullable().optional(),
});
export type VatRow = z.infer<typeof vatRowSchema>;
const round = (v: number) => Math.round(v * 100) / 100;
/** Gross is the amount paid, including VAT. Never add VAT to it again. */
export function vatFromGross(gross: number, rate: number): VatRow {
  const net = round(gross / (1 + rate / 100));
  return { rate, net, tax: round(gross - net), gross };
}
export function vatTotals(rows: VatRow[]) {
  return { net: round(rows.reduce((s, r) => s + r['net'], 0)), tax: round(rows.reduce((s, r) => s + r['tax'], 0)), gross: round(rows.reduce((s, r) => s + r['gross'], 0)) };
}
export function validateVat(rows: VatRow[], total: number): string | null {
  if (!rows.length) return null;
  if (rows.length > 20 || rows.some((r) => !vatRowSchema.safeParse(r).success)) return "Bitte gültige Umsatzsteuerwerte eingeben.";
  const differs = (a: number, b: number) => Math.abs(a - b) > 0.030001;
  const gross = vatTotals(rows).gross;
  if (differs(gross, total)) return `Die Steuergruppen ergeben ${gross.toFixed(2).replace('.', ',')} € statt ${total.toFixed(2).replace('.', ',')} € Zahlbetrag (Differenz ${round(gross - total).toFixed(2).replace('.', ',')} €). Bitte Bruttobeträge und Zuordnung am Bon prüfen.`;
  if (rows.some((r) => differs(r['net'] + r['tax'], r['gross']) || differs(r['net'] * r['rate'] / 100, r['tax']))) return "Netto + Steuer muss Brutto ergeben; Steuer muss zum Steuersatz passen. Bitte Bruttobetrag am Bon prüfen und Netto/Steuer daraus berechnen.";
  return null;
}
/** Complete only arithmetically derivable values; never infer a missing rate. */
export function extractVat(value: unknown): VatRow[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const r = v as Record<string, unknown>;
    if (typeof r['rate'] !== "number") return [];
    let net = typeof r['net'] === "number" ? r['net'] : null;
    let tax = typeof r['tax'] === "number" ? r['tax'] : null;
    let gross = typeof r['gross'] === "number" ? r['gross'] : null;
    // A printed gross amount wins over an incomplete/mislabelled net or tax.
    // Complete OCR rows remain untouched so contradictions stay visible.
    if (gross !== null && (net === null || tax === null)) {
      const derived = vatFromGross(gross, r['rate']);
      net = derived.net;
      tax = derived.tax;
    }
    if (net !== null && tax !== null && gross === null) gross = round(net + tax);
    if (net !== null && tax === null) tax = gross !== null ? round(gross - net) : round(net * r['rate'] / 100);
    if (gross === null && net !== null && tax !== null) gross = round(net + tax);
    const group = typeof r['group'] === 'string' ? r['group'] : undefined;
    const row = vatRowSchema.safeParse({ rate: r['rate'], net, tax, gross, ...(group === undefined ? {} : { group }) });
    return row.success ? [row.data] : [];
  });
}

/** Keep recognition uncertainty visible instead of silently dropping tax data. */
export function vatExtractionWarnings(value: unknown, rows: VatRow[]): string[] {
  if (!Array.isArray(value)) return [];
  const warnings: string[] = [];
  if (value.length > rows.length) warnings.push("Ein Teil des Steuerblocks war unvollständig oder ungültig. Bitte alle Steuergruppen am Bon prüfen und ergänzen.");
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const r = entry as Record<string, unknown>;
    if (typeof r['gross'] !== 'number') {
      warnings.push("Ein Bruttobetrag im Steuerblock wurde nicht erkannt und nur aus Netto/Steuer abgeleitet. Bitte am Bon prüfen; eine Brutto-/Netto-Verwechslung ist möglich.");
    } else if (typeof r['rate'] === 'number' && (r['net'] == null || r['tax'] == null)) {
      const derived = vatFromGross(r['gross'], r['rate']);
      if ((typeof r['net'] === 'number' && Math.abs(r['net'] - derived.net) > 0.03) || (typeof r['tax'] === 'number' && Math.abs(r['tax'] - derived.tax) > 0.03)) warnings.push("Die erkannten Netto-/Steuerwerte widersprechen dem Bruttobetrag. Netto und Steuer wurden aus dem unveränderten Brutto berechnet; bitte am Bon prüfen.");
    }
  }
  return [...new Set(warnings)];
}

/** Compare printed group markers; include deposits and signed discounts exactly once. */
export function vatGroupWarnings(rows: VatRow[], lines: RawLine[]): string[] {
  const moneyLines = lines.filter((line) => ['product', 'deposit', 'deposit_return', 'product_discount', 'receipt_discount'].includes(classifyLineType(line.text, line.amount)) && line.amount !== null);
  if (!rows.some((r) => r.group) || !moneyLines.length) return [];
  if (moneyLines.some((line) => !line.taxGroup || !rows.some((r) => r.group === line.taxGroup))) return ["Nicht alle Positionen, Pfand- oder Rabattzeilen haben eine eindeutige erkannte Steuergruppe. Bitte Zuordnung am Bon prüfen; fehlende Gruppen werden nicht geraten."];
  return rows.flatMap((row) => {
    const matching = moneyLines.filter((line) => line.taxGroup === row.group);
    if (!matching.length) return [];
    const gross = round(matching.reduce((sum, line) => sum + (line.amount ?? 0), 0));
    return Math.abs(gross - row.gross) > 0.030001 ? [`Steuergruppe ${row.group}: Positionen einschließlich Pfand/Rabatten ergeben ${gross.toFixed(2).replace('.', ',')} €, der Steuerblock ${row.gross.toFixed(2).replace('.', ',')} €. Bitte Gruppen und Bruttobeträge am Bon prüfen.`] : [];
  });
}