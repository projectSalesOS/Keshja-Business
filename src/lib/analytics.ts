/**
 * Etappe 4 – Kennzahlen, Auswertungen, Liquiditätsvorschau, CSV.
 * Reine Funktionen über den bestehenden Quelldaten (Buchungen, Rechnungen, Zahlungen,
 * wiederkehrende Ausgaben). Keine eigene Speicherung von Summen.
 *
 * Definitionen:
 * - Tatsächliche Einnahmen/Ausgaben = Buchungen (transactions) mit Status „bezahlt“.
 *   Zahlungseingänge erzeugen genau eine Einnahmebuchung (Trigger) → keine Doppelzählung
 *   mit Rechnungen. Gebuchte wiederkehrende Ausgaben sind normale Ausgabebuchungen.
 * - Offene Forderung = Rechnung (kind=invoice, status=issued) mit Restbetrag > 0.
 *   Entwürfe und stornierte Rechnungen zählen nie; Stornorechnungen sind keine Forderung.
 * - Geplante Ausgaben = Fälligkeiten aktiver wiederkehrender Ausgaben, die noch NICHT
 *   gebucht sind (recurring_expense_id + recurring_period).
 */
import { duePeriods } from "./business";
import { openAmount } from "./documents";

export type Range = { from: string; to: string };
export type Preset = "monat" | "vormonat" | "quartal" | "jahr" | "frei";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m0: number, d: number) => {
  const dt = new Date(Date.UTC(y, m0, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};
const parts = (s: string) => s.split("-").map(Number) as [number, number, number];

export function addDaysIso(s: string, days: number): string {
  const [y, m, d] = parts(s);
  return iso(y, m - 1, d + days);
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function rangeFor(preset: Preset, today: string, custom?: Range): Range {
  const [y, m] = parts(today);
  if (preset === "monat") return { from: iso(y, m - 1, 1), to: iso(y, m, 0) };
  if (preset === "vormonat") return { from: iso(y, m - 2, 1), to: iso(y, m - 1, 0) };
  if (preset === "quartal") {
    const q0 = Math.floor((m - 1) / 3) * 3;
    return { from: iso(y, q0, 1), to: iso(y, q0 + 3, 0) };
  }
  if (preset === "jahr") return { from: `${y}-01-01`, to: `${y}-12-31` };
  const c = custom ?? { from: today, to: today };
  return c.from <= c.to ? c : { from: c.to, to: c.from };
}

/** Vergleichszeitraum: ganzer Monat → Vormonat, ganzes Jahr → Vorjahr, sonst gleich langer Zeitraum davor. */
export function previousRange(r: Range): Range {
  const [fy, fm, fd] = parts(r.from);
  const [ty, tm, td] = parts(r.to);
  const lastOfMonth = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  if (fd === 1 && fy === ty && fm === tm && td === lastOfMonth)
    return { from: iso(fy, fm - 2, 1), to: iso(fy, fm - 1, 0) };
  if (fm === 1 && fd === 1 && tm === 12 && td === 31 && fy === ty)
    return { from: `${fy - 1}-01-01`, to: `${fy - 1}-12-31` };
  const len = daysBetween(r.from, r.to) + 1;
  return { from: addDaysIso(r.from, -len), to: addDaysIso(r.from, -1) };
}

export const inRange = (d: string, r: Range) => d >= r.from && d <= r.to;

export type ATx = {
  type: "income" | "expense";
  amount: number;
  booking_date: string;
  category: string;
  status: "offen" | "bezahlt";
  customer_id: string | null;
  recurring_expense_id?: string | null;
  recurring_period?: string | null;
};

export type ActualTotals = { income: number; expense: number; balance: number; count: number };

export function actualTotals(tx: ATx[], r: Range, f: TxScope = {}): ActualTotals {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const t of scope(tx, r, f)) {
    count++;
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income: round(income), expense: round(expense), balance: round(income - expense), count };
}

export type TxScope = { category?: string | undefined; customerId?: string | undefined };

function scope(tx: ATx[], r: Range, f: TxScope): ATx[] {
  return tx.filter(
    (t) =>
      t.status === "bezahlt" &&
      inRange(t.booking_date, r) &&
      (!f.category || t.category === f.category) &&
      (!f.customerId || t.customer_id === f.customerId),
  );
}

/** Prozentuale Veränderung; null, wenn keine Vergleichsdaten vorliegen (keine Null-/Verlustvortäuschung). */
export function change(current: number, previous: number, previousCount: number): number | null {
  if (previousCount === 0 || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export const round = (n: number) => Math.round(n * 100) / 100;

export function monthsIn(r: Range): string[] {
  const [fy, fm] = parts(r.from);
  const [ty, tm] = parts(r.to);
  const out: string[] = [];
  for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, (m = 1)) : m++)
    out.push(`${y}-${pad(m)}`);
  return out;
}

export type MonthRow = { month: string; income: number; expense: number; balance: number; cumulative: number; count: number };

export function monthlySeries(tx: ATx[], r: Range, f: TxScope = {}): MonthRow[] {
  const map = new Map(monthsIn(r).map((m) => [m, { income: 0, expense: 0, count: 0 }]));
  for (const t of scope(tx, r, f)) {
    const row = map.get(t.booking_date.slice(0, 7));
    if (!row) continue;
    row.count++;
    if (t.type === "income") row.income += t.amount;
    else row.expense += t.amount;
  }
  let cum = 0;
  return [...map.entries()].map(([month, v]) => {
    cum += v.income - v.expense;
    return { month, income: round(v.income), expense: round(v.expense), balance: round(v.income - v.expense), cumulative: round(cum), count: v.count };
  });
}

export function byCategory(tx: ATx[], r: Range, type: "income" | "expense", f: TxScope = {}) {
  const map = new Map<string, number>();
  for (const t of scope(tx, r, f)) if (t.type === type) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return [...map.entries()].map(([name, value]) => ({ name, value: round(value) })).sort((a, b) => b.value - a.value);
}

export type AInvoice = {
  id: string;
  kind: "quote" | "invoice" | "cancellation";
  status: string;
  number: string | null;
  customer_id: string | null;
  customerName: string;
  doc_date: string;
  due_date: string | null;
  total: number;
};
export type APayment = { invoice_id: string; amount: number; payment_date: string };

export function paidByInvoice(payments: APayment[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of payments) m.set(p.invoice_id, (m.get(p.invoice_id) ?? 0) + p.amount);
  return m;
}

export type Receivable = AInvoice & { paid: number; open: number; overdue: boolean; daysOverdue: number };

export function receivables(docs: AInvoice[], payments: APayment[], today: string, customerId?: string): Receivable[] {
  const paid = paidByInvoice(payments);
  return docs
    .filter((d) => d.kind === "invoice" && d.status === "issued" && (!customerId || d.customer_id === customerId))
    .map((d) => {
      const p = paid.get(d.id) ?? 0;
      const open = openAmount(d.total, p);
      const overdue = open > 0 && !!d.due_date && d.due_date < today;
      return { ...d, paid: round(p), open: round(open), overdue, daysOverdue: overdue ? daysBetween(d.due_date!, today) : 0 };
    })
    .filter((d) => d.open > 0)
    .sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9"));
}

export function sumReceivables(list: Receivable[]) {
  const overdue = list.filter((r) => r.overdue);
  return {
    openCount: list.length,
    openTotal: round(list.reduce((s, r) => s + r.open, 0)),
    overdueCount: overdue.length,
    overdueTotal: round(overdue.reduce((s, r) => s + r.open, 0)),
  };
}

/** Umsatz (ausgestellte, nicht stornierte Rechnungen nach Rechnungsdatum) und Zahlungseingang je Kunde. */
export function byCustomer(docs: AInvoice[], payments: APayment[], r: Range, today: string) {
  const invoices = new Map(docs.filter((d) => d.kind === "invoice").map((d) => [d.id, d]));
  const map = new Map<string, { name: string; invoiced: number; received: number; open: number }>();
  const get = (id: string, name: string) => {
    if (!map.has(id)) map.set(id, { name, invoiced: 0, received: 0, open: 0 });
    return map.get(id)!;
  };
  for (const d of invoices.values())
    if (d.status === "issued" && inRange(d.doc_date, r)) get(d.customer_id ?? "-", d.customerName).invoiced += d.total;
  for (const p of payments) {
    const d = invoices.get(p.invoice_id);
    if (d && inRange(p.payment_date, r)) get(d.customer_id ?? "-", d.customerName).received += p.amount;
  }
  for (const rcv of receivables(docs, payments, today)) get(rcv.customer_id ?? "-", rcv.customerName).open += rcv.open;
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v, invoiced: round(v.invoiced), received: round(v.received), open: round(v.open) }))
    .sort((a, b) => b.received - a.received || b.invoiced - a.invoiced);
}

export type ARecurring = {
  id: string;
  name: string;
  category: string;
  amount: number;
  interval: string;
  startDate: string;
  endDate: string | null;
  active: boolean;
};
export type PlannedExpense = { id: string; name: string; category: string; amount: number; date: string; pastDue: boolean };

/** Noch nicht gebuchte Fälligkeiten im Zeitraum (bereits gebuchte Perioden werden ausgeschlossen). */
export function plannedExpenses(items: ARecurring[], tx: ATx[], r: Range, today: string): PlannedExpense[] {
  const booked = new Set(
    tx.filter((t) => t.recurring_expense_id && t.recurring_period).map((t) => `${t.recurring_expense_id}|${t.recurring_period}`),
  );
  const out: PlannedExpense[] = [];
  for (const f of items) {
    if (!f.active) continue;
    for (const date of duePeriods(f.startDate, f.interval, r.to, f.endDate, 600)) {
      if (date < r.from || booked.has(`${f.id}|${date}`)) continue;
      out.push({ id: f.id, name: f.name, category: f.category, amount: f.amount, date, pastDue: date <= today });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export type ForecastWeek = { label: string; from: string; inflow: number; outflow: number; net: number; cumulative: number };
export type Forecast = {
  range: Range;
  overdueInflow: number;
  expectedInflow: number;
  plannedOutflow: number;
  dueUnbookedOutflow: number;
  net: number;
  weeks: ForecastWeek[];
  inflows: Receivable[];
  outflows: PlannedExpense[];
};

/**
 * Liquiditätsvorschau (Prognose, kein Kontostand): erwartete Eingänge = offene Restbeträge
 * mit Fälligkeit im Horizont (Überfällige separat, zum Stichtag heute), geplante Ausgänge =
 * ungebuchte Fälligkeiten wiederkehrender Ausgaben (bereits fällige, ungebuchte separat).
 */
export function forecast(rcv: Receivable[], items: ARecurring[], tx: ATx[], today: string, to: string): Forecast {
  const range = { from: today, to };
  const inflows = rcv.filter((r) => r.overdue || !r.due_date || r.due_date <= to);
  const dueUnbooked = plannedExpenses(items, tx, { from: "1900-01-01", to: addDaysIso(today, -1) }, today);
  const outflows = plannedExpenses(items, tx, range, today);
  const overdueInflow = round(inflows.filter((r) => r.overdue).reduce((s, r) => s + r.open, 0));
  const expectedInflow = round(inflows.filter((r) => !r.overdue).reduce((s, r) => s + r.open, 0));
  const plannedOutflow = round(outflows.reduce((s, o) => s + o.amount, 0));
  const dueUnbookedOutflow = round(dueUnbooked.reduce((s, o) => s + o.amount, 0));
  const weeks: ForecastWeek[] = [];
  let cum = 0;
  for (let start = today; start <= to; start = addDaysIso(start, 7)) {
    const end = addDaysIso(start, 6);
    const first = weeks.length === 0;
    const inflow = inflows
      .filter((r) => (first && (r.overdue || !r.due_date)) || (r.due_date && !r.overdue && r.due_date >= start && r.due_date <= end))
      .reduce((s, r) => s + r.open, 0);
    const outflow =
      outflows.filter((o) => o.date >= start && o.date <= end).reduce((s, o) => s + o.amount, 0) +
      (first ? dueUnbookedOutflow : 0);
    cum += inflow - outflow;
    weeks.push({ label: `ab ${start.slice(8, 10)}.${start.slice(5, 7)}.`, from: start, inflow: round(inflow), outflow: round(outflow), net: round(inflow - outflow), cumulative: round(cum) });
  }
  return {
    range,
    overdueInflow,
    expectedInflow,
    plannedOutflow,
    dueUnbookedOutflow,
    net: round(overdueInflow + expectedInflow - plannedOutflow - dueUnbookedOutflow),
    weeks,
    inflows,
    outflows: [...dueUnbooked, ...outflows],
  };
}

/* ---------------- CSV (deutsche Tabellenkalkulation: Semikolon, Dezimalkomma, BOM) ---------------- */

export const csvNumber = (n: number) => n.toFixed(2).replace(".", ",");
export const csvDate = (s: string | null | undefined) => (s ? s.split("-").reverse().join(".") : "");

function cell(v: string | number | null | undefined): string {
  const s = typeof v === "number" ? csvNumber(v) : (v ?? "");
  // Formel-Injection verhindern
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v !== "number" ? `'${s}` : s;
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const monthLabel = (m: string) => {
  const names = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  return `${names[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
};
