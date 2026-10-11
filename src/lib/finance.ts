import { RECEIPTS, type Receipt } from "./mock-data";

export type Period = "heute" | "woche" | "monat" | "quartal" | "jahr";
export type Dimension = "bereich" | "kategorie";

export const PERIOD_LABELS: Record<Period, string> = {
  heute: "Heute",
  woche: "Woche",
  monat: "Monat",
  quartal: "Quartal",
  jahr: "Jahr",
};

export const currency = (value: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );

/** UTC based so server rendering and client rendering always agree */
function startOfPeriod(period: Period, ref: Date): Date {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  switch (period) {
    case "heute":
      return d;
    case "woche": {
      const day = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - day);
      return d;
    }
    case "monat":
      d.setUTCDate(1);
      return d;
    case "quartal":
      d.setUTCMonth(Math.floor(d.getUTCMonth() / 3) * 3, 1);
      return d;
    case "jahr":
      d.setUTCMonth(0, 1);
      return d;
  }
}

export function receiptsInPeriod(
  period: Period,
  all: Receipt[] = RECEIPTS,
  ref = new Date(),
): Receipt[] {
  const from = startOfPeriod(period, ref).toISOString().slice(0, 10);
  return all.filter((r) => r.date >= from);
}

export function sumTotals(receipts: Receipt[]): number {
  return receipts.reduce((sum, r) => sum + r.total, 0);
}

export type Slice = { name: string; value: number };

export function breakdown(receipts: Receipt[], dimension: Dimension, limit = 12): Slice[] {
  const map = new Map<string, number>();
  for (const r of receipts) {
    for (const item of r.items) {
      const key = item[dimension];
      map.set(key, (map.get(key) ?? 0) + item.price);
    }
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function sumForBereich(receipts: Receipt[], bereich: string): number {
  let sum = 0;
  for (const r of receipts) {
    for (const item of r.items) if (item.bereich === bereich) sum += item.price;
  }
  return sum;
}

export type TrendPoint = { label: string; value: number };

/** Spend over time, bucketed by day for short periods and by month for long ones. */
export function trend(receipts: Receipt[], period: Period): TrendPoint[] {
  const byMonth = period === "jahr" || period === "quartal";
  const map = new Map<string, number>();
  for (const r of receipts) {
    const key = byMonth ? r.date.slice(0, 7) : r.date;
    map.set(key, (map.get(key) ?? 0) + r.total);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, value]) => ({
      label: byMonth
        ? new Intl.DateTimeFormat("de-DE", { month: "short" }).format(new Date(`${key}-01T00:00:00`))
        : new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(
            new Date(`${key}T00:00:00`),
          ),
      value: Math.round(value * 100) / 100,
    }));
}


export type ReportStats = {
  total: number;
  receiptCount: number;
  average: number;
  topBereich: Slice | undefined;
  topKategorie: Slice | undefined;
  mostExpensive: Receipt | undefined;
  cheapest: Receipt | undefined;
};

export function reportStats(receipts: Receipt[]): ReportStats {
  const sorted = [...receipts].sort((a, b) => a.total - b.total);
  const total = sumTotals(receipts);
  return {
    total,
    receiptCount: receipts.length,
    average: receipts.length ? total / receipts.length : 0,
    topBereich: breakdown(receipts, "bereich", 1)[0],
    topKategorie: breakdown(receipts, "kategorie", 1)[0],
    mostExpensive: sorted[sorted.length - 1],
    cheapest: sorted[0],
  };
}

export function aiSummary(period: Period, receipts: Receipt[], fixedMonthly = 0): string {
  const stats = reportStats(receipts);
  if (!stats.receiptCount)
    return "Noch keine Ausgaben erfasst. Scanne deinen ersten Kassenbon, um deine Finanzen auszuwerten.";
  const label = PERIOD_LABELS[period];
  return (
    `Im Zeitraum ${label} wurden ${stats.receiptCount} Kassenbons mit einem Gesamtwert von ` +
    `${currency(stats.total)} erfasst. Der durchschnittliche Einkauf lag bei ${currency(stats.average)}. ` +
    `Der größte Ausgabenbereich war ${stats.topBereich?.name} mit ${currency(stats.topBereich?.value ?? 0)}, ` +
    `innerhalb der Unterkategorien dominierte ${stats.topKategorie?.name}. ` +
    `Zusammen mit ${currency(fixedMonthly)} monatlichen Fixkosten ergibt sich ein stabiles Ausgabenbild ` +
    `ohne auffällige Ausreißer.`
  );
}