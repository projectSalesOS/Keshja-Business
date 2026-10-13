import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { TxStatus, TxType } from "@/lib/business";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
type TxRow = Database["public"]["Tables"]["transactions"]["Row"];
export type Transaction = Omit<TxRow, "amount" | "type" | "status"> & {
  amount: number;
  type: TxType;
  status: TxStatus;
};
export type TransactionInput = {
  type: TxType;
  amount: number;
  booking_date: string;
  category: string;
  description: string | null;
  status: TxStatus;
  customer_id: string | null;
  receipt_id: string | null;
};

export const customersKey = (org: string) => ["customers", org] as const;
export const transactionsKey = (org: string) => ["transactions", org] as const;

export function useCustomers(orgId: string) {
  return useQuery({
    queryKey: customersKey(orgId),
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveCustomer(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: Partial<Customer> }) => {
      const { error } = id
        ? await supabase.from("customers").update(values).eq("id", id)
        : await supabase
            .from("customers")
            .insert({ ...(values as { name: string }), organization_id: orgId });
      if (error) {
        if (error.code === "23505") throw new Error("Diese Kundennummer ist bereits vergeben.");
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKey(orgId) }),
  });
}

export function useTransactions(orgId: string) {
  return useQuery({
    queryKey: transactionsKey(orgId),
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("organization_id", orgId)
        .order("booking_date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        amount: Number(r.amount),
        type: r.type as TxType,
        status: r.status as TxStatus,
      }));
    },
  });
}

export function useSaveTransaction(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: TransactionInput }) => {
      const { error } = id
        ? await supabase.from("transactions").update(values).eq("id", id)
        : await supabase.from("transactions").insert({ ...values, organization_id: orgId });
      if (error) {
        if (error.code === "23505")
          throw new Error("Dieser Beleg ist bereits einer anderen Buchung zugeordnet.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionsKey(orgId) });
    },
  });
}

export function useDeleteTransaction(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase
        .from("transactions")
        .delete({ count: "exact" })
        .eq("id", id);
      if (error) throw error;
      if (!count) throw new Error("Nur Inhaber und Admins dürfen Buchungen löschen.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionsKey(orgId) }),
  });
}

export type ReceiptOption = {
  id: string;
  merchant: string;
  date: string;
  total: number;
  customer_id: string | null;
};

export const receiptOptionsKey = (org: string) => ["receipts", "options", org] as const;

/** Kompakte Belegliste des Unternehmens (für Zuordnungen). */
export function useReceiptOptions(orgId: string) {
  return useQuery({
    queryKey: receiptOptionsKey(orgId),
    queryFn: async (): Promise<ReceiptOption[]> => {
      const { data, error } = await supabase
        .from("receipts")
        .select("id, merchant, date, total, customer_id")
        .eq("organization_id", orgId)
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, total: Number(r.total) }));
    },
  });
}
