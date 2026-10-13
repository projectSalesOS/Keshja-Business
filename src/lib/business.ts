/** Geschäftliche Stammdaten und reine Hilfsfunktionen (ohne Datenbankzugriff, testbar). */

export const INCOME_CATEGORIES = [
  "Umsatzerlöse",
  "Dienstleistungen",
  "Warenverkauf",
  "Provisionen",
  "Zinsen",
  "Sonstige Einnahmen",
] as const;

export const EXPENSE_CATEGORIES = [
  "Wareneinkauf",
  "Büromaterial",
  "Miete & Raumkosten",
  "Strom & Energie",
  "Telefon & Internet",
  "Software & Lizenzen",
  "Versicherungen",
  "Fahrzeugkosten",
  "Reisekosten",
  "Bewirtung",
  "Werbung & Marketing",
  "Fortbildung",
  "Beratung & Gebühren",
  "Bankgebühren",
  "Sonstige Ausgaben",
] as const;

export type TxType = "income" | "expense";
export type TxStatus = "offen" | "bezahlt";
export type RecurringInterval = "monatlich" | "vierteljährlich" | "jährlich";

export const TX_TYPE_LABEL: Record<TxType, string> = { income: "Einnahme", expense: "Ausgabe" };
export const TX_STATUS_LABEL: Record<TxStatus, string> = { offen: "Offen", bezahlt: "Bezahlt" };
export const INTERVALS: RecurringInterval[] = ["monatlich", "vierteljährlich", "jährlich"];

export function categoriesFor(type: TxType): readonly string[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

/** "1.234,56" / "12,5" / "12.50" → Zahl; ungültig → null. */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(/\s|€/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CustomerInput = {
  name: string;
  contact_person: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  customer_number: string;
  vat_id: string;
  notes: string;
};

export const EMPTY_CUSTOMER: CustomerInput = {
  name: "",
  contact_person: "",
  street: "",
  postal_code: "",
  city: "",
  country: "DE",
  email: "",
  phone: "",
  customer_number: "",
  vat_id: "",
  notes: "",
};

/** Liefert Fehlermeldung oder null. Nur der Name ist Pflicht. */
export function validateCustomer(c: CustomerInput): string | null {
  if (!c.name.trim()) return "Bitte einen Namen oder Firmennamen angeben.";
  if (c.name.trim().length > 200) return "Der Name ist zu lang.";
  if (c.email.trim() && !EMAIL_RE.test(c.email.trim())) return "Die E-Mail-Adresse ist ungültig.";
  if (c.notes.length > 5000) return "Die Notizen sind zu lang.";
  return null;
}

/** Leere Strings → null, damit keine leeren Werte gespeichert werden. */
export function cleanCustomer(c: CustomerInput) {
  const v = (s: string) => (s.trim() ? s.trim() : null);
  return {
    name: c.name.trim(),
    contact_person: v(c.contact_person),
    street: v(c.street),
    postal_code: v(c.postal_code),
    city: v(c.city),
    country: c.country.trim() || "DE",
    email: v(c.email),
    phone: v(c.phone),
    customer_number: v(c.customer_number),
    vat_id: v(c.vat_id),
    notes: v(c.notes),
  };
}

/** Monatliche Belastung einer wiederkehrenden Ausgabe. */
export function monthlyShare(amount: number, interval: string): number {
  if (interval === "jährlich") return amount / 12;
  if (interval === "vierteljährlich") return amount / 3;
  return amount;
}

/**
 * Fälligkeitstermine bis einschließlich `today` (identisch zur Logik in
 * book_due_recurring_expenses – Vorschau in der Oberfläche).
 */
export function duePeriods(
  startDate: string,
  interval: string,
  today: string,
  endDate?: string | null,
  max = 240,
): string[] {
  const months = interval === "jährlich" ? 12 : interval === "vierteljährlich" ? 3 : 1;
  const [y, m, d] = startDate.split("-").map(Number) as [number, number, number];
  const out: string[] = [];
  for (let n = 0; n < max; n++) {
    const total = m - 1 + n * months;
    const year = y + Math.floor(total / 12);
    const month = total % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
    if (iso > today || (endDate && iso > endDate)) break;
    out.push(iso);
  }
  return out;
}

export type TxLike = {
  type: TxType;
  amount: number;
  booking_date: string;
  category: string;
  status: TxStatus;
  description: string | null;
};

export type TxFilter = {
  type: "all" | TxType;
  status: "all" | TxStatus;
  month: string; // "" oder "yyyy-mm"
  category: string; // "" = alle
  search: string;
  sort: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
};

export function filterTransactions<T extends TxLike>(rows: T[], f: TxFilter): T[] {
  const q = f.search.trim().toLowerCase();
  const list = rows.filter(
    (r) =>
      (f.type === "all" || r.type === f.type) &&
      (f.status === "all" || r.status === f.status) &&
      (!f.month || r.booking_date.startsWith(f.month)) &&
      (!f.category || r.category === f.category) &&
      (!q ||
        r.category.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)),
  );
  const cmp: Record<TxFilter["sort"], (a: T, b: T) => number> = {
    date_desc: (a, b) => b.booking_date.localeCompare(a.booking_date),
    date_asc: (a, b) => a.booking_date.localeCompare(b.booking_date),
    amount_desc: (a, b) => b.amount - a.amount,
    amount_asc: (a, b) => a.amount - b.amount,
  };
  return [...list].sort(cmp[f.sort]);
}

export function totals(rows: TxLike[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "income") income += r.amount;
    else expense += r.amount;
  }
  return { income, expense, balance: income - expense };
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
