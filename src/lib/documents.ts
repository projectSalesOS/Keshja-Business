/** Angebote, Rechnungen, Zahlungen, Mahnwesen – reine, testbare Logik (ohne Datenbank). */

export type DocKind = "quote" | "invoice" | "cancellation";
export type DocDbStatus = "draft" | "issued" | "accepted" | "rejected" | "cancelled";
export type TaxRate = 0 | 7 | 19;
export const TAX_RATES: TaxRate[] = [19, 7, 0];

export type ItemInput = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
};

export const KIND_LABEL: Record<DocKind, string> = {
  quote: "Angebot",
  invoice: "Rechnung",
  cancellation: "Stornorechnung",
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(i: Pick<ItemInput, "quantity" | "unit_price">): number {
  return r2(i.quantity * i.unit_price);
}

export type TaxGroup = { rate: number; net: number; tax: number };
export type DocTotals = { subtotal: number; taxes: TaxGroup[]; taxTotal: number; total: number };

/**
 * Identisch zu private.recalc_document: Positionen kaufmännisch gerundet,
 * Steuer je Steuersatz auf die Nettosumme der Gruppe. Kleinunternehmer: keine Steuer.
 */
export function computeTotals(items: Pick<ItemInput, "quantity" | "unit_price" | "tax_rate">[], smallBusiness: boolean): DocTotals {
  const groups = new Map<number, number>();
  let subtotal = 0;
  for (const i of items) {
    const lt = lineTotal(i);
    subtotal = r2(subtotal + lt);
    const rate = smallBusiness ? 0 : Number(i.tax_rate);
    groups.set(rate, r2((groups.get(rate) ?? 0) + lt));
  }
  const taxes = smallBusiness
    ? []
    : [...groups.entries()]
        .filter(([rate]) => rate > 0)
        .sort((a, b) => b[0] - a[0])
        .map(([rate, net]) => ({ rate, net, tax: r2((net * rate) / 100) }));
  const taxTotal = r2(taxes.reduce((s, t) => s + t.tax, 0));
  return { subtotal, taxes, taxTotal, total: r2(subtotal + taxTotal) };
}

/** Deutsche Zahleingabe ("1.234,5", "-3", "0,25") → Zahl oder null. */
export function parseDecimal(raw: string, allowNegative = false): number | null {
  const s = String(raw).trim().replace(/\s|€/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  if (!Number.isFinite(n)) return null;
  if (!allowNegative && n < 0) return null;
  return n;
}

export function validateItems(items: ItemInput[]): string | null {
  if (items.length === 0) return "Bitte mindestens eine Position erfassen.";
  for (const [idx, i] of items.entries()) {
    const p = `Position ${idx + 1}: `;
    if (!i.description.trim()) return p + "Bitte eine Bezeichnung angeben.";
    if (!(i.quantity > 0)) return p + "Die Menge muss größer als 0 sein.";
    if (!Number.isFinite(i.unit_price)) return p + "Bitte einen gültigen Einzelpreis angeben.";
    if (![0, 7, 19].includes(Number(i.tax_rate))) return p + "Ungültiger Steuersatz.";
  }
  return null;
}

export type CompanyLike = {
  name?: string | null;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  tax_number?: string | null;
  vat_id?: string | null;
};
export type CustomerLike = { name?: string | null; street?: string | null; city?: string | null };

/** Fehlende Pflichtangaben (spiegelt die Prüfung in issue_document). */
export function missingForIssue(
  kind: "quote" | "invoice",
  d: { customer: CustomerLike | null; itemCount: number; serviceDate: string | null },
  company: CompanyLike,
): string[] {
  const m: string[] = [];
  const empty = (v?: string | null) => !v || !v.trim();
  if (!d.customer) m.push("Kunde");
  if (d.itemCount === 0) m.push("mindestens eine Position");
  if (empty(company.street) || empty(company.postal_code) || empty(company.city))
    m.push("vollständige Unternehmensanschrift");
  if (kind === "invoice") {
    if (empty(company.tax_number) && empty(company.vat_id))
      m.push("Steuernummer oder USt-IdNr. des Unternehmens");
    if (d.customer && (empty(d.customer.street) || empty(d.customer.city))) m.push("Kundenanschrift");
    if (!d.serviceDate) m.push("Leistungsdatum");
  }
  return m;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

// ---------- Status ----------

export type DisplayStatus =
  | "draft"
  | "issued"
  | "accepted"
  | "rejected"
  | "expired"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled";

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  draft: "Entwurf",
  issued: "Ausgegeben",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
  expired: "Abgelaufen",
  partial: "Teilweise bezahlt",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

export type DocLike = {
  kind: DocKind;
  status: DocDbStatus;
  total: number;
  valid_until: string | null;
  due_date: string | null;
};

/** Offener Betrag (negativ = Überzahlung). */
export function openAmount(total: number, paid: number): number {
  return r2(total - paid);
}

export function displayStatus(d: DocLike, paid: number, today: string): DisplayStatus {
  if (d.status === "draft") return "draft";
  if (d.kind === "quote") {
    if (d.status === "issued" && d.valid_until && d.valid_until < today) return "expired";
    return d.status === "cancelled" ? "cancelled" : (d.status as DisplayStatus);
  }
  if (d.kind === "cancellation") return "issued";
  if (d.status === "cancelled") return "cancelled";
  if (paid > 0 && openAmount(d.total, paid) <= 0) return "paid";
  if (d.due_date && d.due_date < today) return "overdue";
  if (paid > 0) return "partial";
  return "issued";
}

// ---------- Mahnwesen ----------

export const DUNNING_LABEL: Record<number, string> = {
  1: "Zahlungserinnerung",
  2: "1. Mahnung",
  3: "2. Mahnung",
};

/** Nächste mögliche Mahnstufe oder null (nicht überfällig, bezahlt, storniert, max. Stufe). */
export function nextDunningLevel(
  d: DocLike,
  paid: number,
  existingLevels: number[],
  today: string,
): number | null {
  if (d.kind !== "invoice" || d.status !== "issued") return null;
  if (!d.due_date || d.due_date >= today) return null;
  if (openAmount(d.total, paid) <= 0) return null;
  const max = existingLevels.length ? Math.max(...existingLevels) : 0;
  return max >= 3 ? null : max + 1;
}

export type InvoiceFilter = { status: "all" | DisplayStatus; customerId: string; from: string; to: string; search: string };

export function filterDocs<T extends DocLike & { customer_id: string | null; doc_date: string; number: string | null; customerName: string; paid: number }>(
  rows: T[],
  f: InvoiceFilter,
  today: string,
): T[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (f.status === "all" || displayStatus(r, r.paid, today) === f.status) &&
      (!f.customerId || r.customer_id === f.customerId) &&
      (!f.from || r.doc_date >= f.from) &&
      (!f.to || r.doc_date <= f.to) &&
      (!q || (r.number ?? "").toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q)),
  );
}
