export type ReceiptItem = {
  name: string;
  price: number;
  bereich: string;
  kategorie: string;
  /** Menge bzw. Gewicht der Position */
  quantity?: number | null;
  /** Preis vor Rabatt, falls abweichend */
  originalPrice?: number | null;
  /** positiver, dieser Position zugeordneter Rabatt */
  discount?: number;
  /** Herkunft des Rabatts */
  discountKind?: "position" | "beleg" | "treue" | null;
};

export type Receipt = {
  id: string;
  store: string;
  date: string; // ISO date (yyyy-mm-dd)
  time: string; // HH:mm
  total: number;
  items: ReceiptItem[];
  /** Warenwert ohne Pfand */
  goodsTotal?: number | undefined;
  /** Pfand minus Leergut */
  depositTotal?: number | undefined;
  /** Rabatt auf Belegebene */
  discountTotal?: number | undefined;
  /** Altbeleg mit uneindeutigen Rabattzeilen – manuelle Prüfung nötig */
  needsReview?: boolean;
};

export type FixedCost = {
  id: string;
  name: string;
  category: string;
  amount: number;
  interval: "monatlich" | "jährlich";
  dueDay: number;
};

/**
 * Demo receipts have been removed – KESHJA starts with an empty spend history.
 * Only real, scanned receipts from the database are shown.
 */
export const RECEIPTS: Receipt[] = [];

/** Keine Demo-Fixkosten mehr – Fixkosten werden nutzerbezogen in der Datenbank gespeichert. */

export const FIXED_COST_CATEGORIES = [
  "Miete",
  "Strom",
  "Internet",
  "Versicherungen",
  "Streaming",
  "Telefon",
  "Sonstige",
];