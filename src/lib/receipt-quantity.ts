import { classifyLineType, type RawLine } from "./receipt-lines";

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (s: string) => Number(s.replace(",", "."));

/**
 * Erkennt reine Mengen-/Einzelpreiszeilen wie „2 x 0,95", „2 × 0,95", „2 St. à 0,95",
 * „0,842 kg x 2,99 EUR/kg". Liefert null für alles andere (z. B. Produktnamen mit „1x1,5L").
 */
export function parseQuantityLine(line: RawLine): { quantity: number; unitPrice: number | null } | null {
  const m = line.text
    .trim()
    .match(/^(\d+(?:[.,]\d{1,3})?)\s*(?:kg\s*)?(?:st[a-zü]{0,4}\.?\s*)?(?:x|×|\*|à|a\b)\s*(?:à\s*)?(\d+[.,]\d{1,2})?\s*(?:eur|€)?(?:\s*\/\s*kg)?\s*$/i);
  if (!m) return null;
  const quantity = num(m[1]!);
  if (!(quantity > 0)) return null;
  const unitPrice = m[2] != null ? num(m[2]) : line.unitPrice ?? line.amount ?? null;
  return { quantity, unitPrice: unitPrice == null ? null : round2(unitPrice) };
}

export type QuantityMergeResult = { lines: RawLine[]; notes: string[]; unresolved: number };

/**
 * Ordnet eigenständige Mengenzeilen der passenden Artikelzeile zu, statt sie als Artikel
 * zu behandeln. Kandidaten sind bis zu zwei benachbarte Warenzeilen davor und danach;
 * entscheidend ist die rechnerische Übereinstimmung Menge × Einzelpreis = gedruckter Preis.
 * Passt kein oder mehr als ein Kandidat eindeutig, entsteht KEIN Artikel, sondern ein Prüfhinweis.
 */
export function mergeQuantityLines(input: RawLine[]): QuantityMergeResult {
  const lines = [...input].sort((a, b) => a.index - b.index).map((l) => ({ ...l }));
  const qty = new Map<number, { quantity: number; unitPrice: number | null }>();
  lines.forEach((l, i) => {
    const q = parseQuantityLine(l);
    if (q) qty.set(i, q);
  });
  const notes: string[] = [];
  let unresolved = 0;
  const isProduct = (i: number) =>
    !qty.has(i) && lines[i] != null && lines[i]!.amount != null && classifyLineType(lines[i]!.text, lines[i]!.amount) === "product";

  for (const [i, q] of qty) {
    const order = [i + 1, i - 1, i + 2, i - 2].filter(isProduct);
    const matches =
      q.unitPrice == null
        ? []
        : order.filter((j) => Math.round(q.quantity * q.unitPrice! * 100) === Math.round(lines[j]!.amount! * 100));
    const unique = [...new Set(matches)];
    if (unique.length === 1) {
      const target = lines[unique[0]!]!;
      target.quantity = q.quantity;
      target.unitPrice = q.unitPrice;
    } else {
      unresolved++;
      notes.push(
        `Mengenzeile „${lines[i]!.text}" konnte keinem Artikel eindeutig zugeordnet werden – bitte prüfen.`,
      );
    }
  }
  return { lines: lines.filter((_, i) => !qty.has(i)), notes, unresolved };
}
