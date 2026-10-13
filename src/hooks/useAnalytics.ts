import { useMemo } from "react";
import { useCustomers, useTransactions } from "@/hooks/useBusiness";
import { useDocuments, usePayments } from "@/hooks/useDocuments";
import { useFixedCosts } from "@/hooks/useFixedCosts";
import type { AInvoice, APayment, ARecurring, ATx } from "@/lib/analytics";

/**
 * Bündelt die bestehenden, unternehmensbezogenen Abfragen (RLS + organization_id)
 * für Dashboard, Auswertungen und Liquiditätsvorschau. Gleiche Query-Keys wie die
 * Fachmodule → kein doppeltes Laden, Mutationen aktualisieren automatisch.
 */
export function useAnalyticsData(orgId: string) {
  const tx = useTransactions(orgId);
  const docs = useDocuments(orgId);
  const pays = usePayments(orgId);
  const customers = useCustomers(orgId);
  const recurring = useFixedCosts(orgId);

  const data = useMemo(() => {
    const names = new Map((customers.data ?? []).map((c) => [c.id, c.name]));
    const invoices: AInvoice[] = (docs.data ?? [])
      .filter((d) => d.kind !== "quote")
      .map((d) => ({
        id: d.id,
        kind: d.kind,
        status: d.status,
        number: d.number,
        customer_id: d.customer_id,
        customerName:
          (typeof d.customer_snapshot?.name === "string" ? (d.customer_snapshot.name as string) : null) ??
          (d.customer_id ? names.get(d.customer_id) : null) ??
          "Ohne Kunde",
        doc_date: d.doc_date,
        due_date: d.due_date,
        total: d.total,
      }));
    const transactions: ATx[] = tx.data ?? [];
    const payments: APayment[] = pays.data ?? [];
    const items: ARecurring[] = recurring.items;
    return { invoices, transactions, payments, items, customers: customers.data ?? [] };
  }, [tx.data, docs.data, pays.data, customers.data, recurring.items]);

  const isLoading = tx.isLoading || docs.isLoading || pays.isLoading || customers.isLoading || recurring.isLoading;
  const error = tx.error || docs.error || pays.error || customers.error || recurring.error;
  return { ...data, isLoading, error };
}
