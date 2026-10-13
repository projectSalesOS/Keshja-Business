import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { DocDbStatus, DocKind, ItemInput } from "@/lib/documents";
import { transactionsKey } from "@/hooks/useBusiness";

type DocRow = Database["public"]["Tables"]["documents"]["Row"];
type ItemRow = Database["public"]["Tables"]["document_items"]["Row"];
export type DocItem = Omit<ItemRow, "quantity" | "unit_price" | "tax_rate"> & {
  quantity: number;
  unit_price: number;
  tax_rate: number;
};
export type Doc = Omit<DocRow, "kind" | "status" | "subtotal" | "tax_total" | "total" | "company_snapshot" | "customer_snapshot"> & {
  kind: DocKind;
  status: DocDbStatus;
  subtotal: number;
  tax_total: number;
  total: number;
  company_snapshot: Record<string, unknown> | null;
  customer_snapshot: Record<string, unknown> | null;
  items: DocItem[];
};
export type Payment = Omit<Database["public"]["Tables"]["payments"]["Row"], "amount"> & { amount: number };
export type Dunning = Omit<Database["public"]["Tables"]["dunning_notices"]["Row"], "open_amount"> & { open_amount: number };

export const docsKey = (org: string) => ["documents", org] as const;
export const paymentsKey = (org: string) => ["payments", org] as const;
export const dunningKey = (org: string) => ["dunning", org] as const;

function msg(e: { message: string; code?: string }): Error {
  if (e.code === "23505") return new Error("Dieser Vorgang wurde bereits erfasst.");
  return new Error(e.message);
}

export function useDocuments(orgId: string) {
  return useQuery({
    queryKey: docsKey(orgId),
    queryFn: async (): Promise<Doc[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, document_items(*)")
        .eq("organization_id", orgId)
        .order("doc_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(({ document_items, ...d }) => ({
        ...d,
        kind: d.kind as DocKind,
        status: d.status as DocDbStatus,
        subtotal: Number(d.subtotal),
        tax_total: Number(d.tax_total),
        total: Number(d.total),
        company_snapshot: d.company_snapshot as Record<string, unknown> | null,
        customer_snapshot: d.customer_snapshot as Record<string, unknown> | null,
        items: (document_items ?? [])
          .map((i) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price), tax_rate: Number(i.tax_rate) }))
          .sort((a, b) => a.position - b.position),
      }));
    },
  });
}

export function usePayments(orgId: string) {
  return useQuery({
    queryKey: paymentsKey(orgId),
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase.from("payments").select("*").eq("organization_id", orgId).order("payment_date");
      if (error) throw error;
      return (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) }));
    },
  });
}

export function useDunning(orgId: string) {
  return useQuery({
    queryKey: dunningKey(orgId),
    queryFn: async (): Promise<Dunning[]> => {
      const { data, error } = await supabase.from("dunning_notices").select("*").eq("organization_id", orgId).order("level");
      if (error) throw error;
      return (data ?? []).map((n) => ({ ...n, open_amount: Number(n.open_amount) }));
    },
  });
}

export type DraftInput = {
  kind: "quote" | "invoice";
  customer_id: string | null;
  doc_date: string;
  valid_until: string | null;
  service_date: string | null;
  service_period_end: string | null;
  payment_days: number | null;
  intro: string | null;
  terms: string | null;
  items: ItemInput[];
};

export function useDocActions(orgId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: docsKey(orgId) });
    qc.invalidateQueries({ queryKey: paymentsKey(orgId) });
    qc.invalidateQueries({ queryKey: dunningKey(orgId) });
    qc.invalidateQueries({ queryKey: transactionsKey(orgId) });
  };
  const m = <A, R>(fn: (a: A) => Promise<R>) => useMutation({ mutationFn: fn, onSettled: refresh });

  const saveDraft = m(async ({ id, v }: { id?: string | undefined; v: DraftInput }) => {
    const { items, kind, ...fields } = v;
    let docId = id;
    if (docId) {
      const { error } = await supabase.from("documents").update(fields).eq("id", docId);
      if (error) throw msg(error);
      const { error: e2 } = await supabase.from("document_items").delete().eq("document_id", docId);
      if (e2) throw msg(e2);
    } else {
      const { data, error } = await supabase
        .from("documents")
        .insert({ ...fields, kind, organization_id: orgId })
        .select("id")
        .single();
      if (error) throw msg(error);
      docId = data.id;
    }
    if (items.length) {
      const { error } = await supabase.from("document_items").insert(
        items.map((i, idx) => ({
          document_id: docId!,
          organization_id: orgId,
          position: idx,
          description: i.description.trim(),
          quantity: i.quantity,
          unit: i.unit.trim() || null,
          unit_price: i.unit_price,
          tax_rate: i.tax_rate,
        })),
      );
      if (error) throw msg(error);
    }
    return docId!;
  });

  const deleteDraft = m(async (id: string) => {
    const { error, count } = await supabase.from("documents").delete({ count: "exact" }).eq("id", id);
    if (error) throw msg(error);
    if (!count) throw new Error("Nur Entwürfe können gelöscht werden.");
  });

  const issue = m(async (id: string) => {
    const { data, error } = await supabase.rpc("issue_document", { _doc: id });
    if (error) throw msg(error);
    return data as string;
  });

  const setQuoteStatus = m(async ({ id, status }: { id: string; status: "issued" | "accepted" | "rejected" }) => {
    const { error } = await supabase.from("documents").update({ status }).eq("id", id);
    if (error) throw msg(error);
  });

  const convert = m(async (quoteId: string) => {
    const { data, error } = await supabase.rpc("create_invoice_from_quote", { _quote: quoteId });
    if (error) throw msg(error);
    return data as string;
  });

  const cancel = m(async ({ id, reason }: { id: string; reason: string }) => {
    const { data, error } = await supabase.rpc("cancel_invoice", { _invoice: id, _reason: reason });
    if (error) throw msg(error);
    return data as string;
  });

  /** `id` wird im Formular einmalig erzeugt → Wiederholungen erzeugen keine zweite Zahlung. */
  const savePayment = m(
    async (p: { id: string; isNew: boolean; invoice_id: string; amount: number; payment_date: string; method: string | null; note: string | null }) => {
      const { id, isNew, ...v } = p;
      const { error } = isNew
        ? await supabase.from("payments").insert({ id, ...v, organization_id: orgId })
        : await supabase.from("payments").update({ amount: v.amount, payment_date: v.payment_date, method: v.method, note: v.note }).eq("id", id);
      if (error) throw msg(error);
    },
  );

  const deletePayment = m(async (id: string) => {
    const { error, count } = await supabase.from("payments").delete({ count: "exact" }).eq("id", id);
    if (error) throw msg(error);
    if (!count) throw new Error("Nur Inhaber und Admins dürfen Zahlungen löschen.");
  });

  const createDunning = m(async (v: { invoice_id: string; level: number; new_due_date: string }) => {
    const { error } = await supabase
      .from("dunning_notices")
      .insert({ ...v, organization_id: orgId, open_amount: 0 });
    if (error) {
      if (error.code === "23505") throw new Error("Diese Mahnstufe wurde für die Rechnung bereits erstellt.");
      throw msg(error);
    }
  });

  const markSent = m(async ({ id, sent }: { id: string; sent: boolean }) => {
    const { error } = await supabase.from("dunning_notices").update({ sent_at: sent ? new Date().toISOString() : null }).eq("id", id);
    if (error) throw msg(error);
  });

  const deleteDunning = m(async (id: string) => {
    const { error, count } = await supabase.from("dunning_notices").delete({ count: "exact" }).eq("id", id);
    if (error) throw msg(error);
    if (!count) throw new Error("Nur nicht versendete Mahnungen können von Inhabern/Admins gelöscht werden.");
  });

  return { saveDraft, deleteDraft, issue, setQuoteStatus, convert, cancel, savePayment, deletePayment, createDunning, markSent, deleteDunning };
}
