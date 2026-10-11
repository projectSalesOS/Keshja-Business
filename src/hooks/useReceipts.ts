import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Receipt, type ReceiptItem } from "@/lib/mock-data";

export const RECEIPTS_QUERY_KEY = ["receipts"] as const;

type Row = {
  id: string;
  merchant: string;
  date: string;
  time: string | null;
  total: number | string;
  goods_total: number | string | null;
  deposit_total: number | string | null;
  discount_total: number | string | null;
  needs_review: boolean | null;
  receipt_items: {
    name: string;
    quantity: number | string;
    price: number | string;
    original_price: number | string | null;
    discount: number | string | null;
    discount_kind: string | null;
    category: string;
    subcategory: string;
    kind: string | null;
  }[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Sicherheitsnetz für bereits gespeicherte Bons: negative Rabattpositionen
 * werden der vorherigen Produktposition zugerechnet und nie als eigene
 * (negative) Ausgabe ausgewertet.
 */
function foldDiscountItems(items: ReceiptItem[]): ReceiptItem[] {
  const result: typeof items = [];
  for (const item of items) {
    if (item.price < 0) {
      const target = [...result].reverse().find((i) => i.price > 0);
      if (target) {
        const original = target.originalPrice ?? target.price;
        target.discount = round2((target.discount ?? 0) + Math.abs(item.price));
        target.originalPrice = round2(original);
        target.price = round2(Math.max(0, original - target.discount));
        target.discountKind = target.discountKind ?? "position";
      }
      continue;
    }
    result.push({ ...item });
  }
  return result;
}

async function fetchSavedReceipts(): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select(
      "id, merchant, date, time, total, goods_total, deposit_total, discount_total, needs_review, receipt_items(name, quantity, price, original_price, discount, discount_kind, category, subcategory, kind)",
    )
    .order("date", { ascending: false })
    .limit(500);

  if (error) throw error;

  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    store: row.merchant,
    date: row.date,
    time: row.time ?? "--:--",
    total: Number(row.total),
    goodsTotal: row.goods_total == null ? undefined : Number(row.goods_total),
    depositTotal: row.deposit_total == null ? undefined : Number(row.deposit_total),
    discountTotal: row.discount_total == null ? undefined : Number(row.discount_total),
    needsReview: row.needs_review ?? false,
    items: foldDiscountItems(
      (row.receipt_items ?? [])
        // Pfand ist eine Belegkomponente und keine Ausgabenkategorie.
        .filter((item) => item.kind !== "deposit")
        .map((item) => ({
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity == null ? null : Number(item.quantity),
        originalPrice:
          item.original_price == null || Number(item.original_price) <= Number(item.price)
            ? null
            : Number(item.original_price),
        discount: item.discount == null ? 0 : Number(item.discount),
        discountKind:
          item.discount_kind === "position" ||
          item.discount_kind === "beleg" ||
          item.discount_kind === "treue"
            ? item.discount_kind
            : null,
        bereich: item.category,
        kategorie: item.subcategory,
      })),
    ),
  }));
}

/** Only real, saved receipts – newest first. */
export function useReceipts(): Receipt[] {
  const { data } = useQuery({
    queryKey: RECEIPTS_QUERY_KEY,
    queryFn: fetchSavedReceipts,
    staleTime: 30_000,
  });

  if (!data) return [];
  return [...data].sort((a, b) => (a.date < b.date ? 1 : -1));
}