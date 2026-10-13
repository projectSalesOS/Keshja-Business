import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { monthlyShare, type RecurringInterval } from "@/lib/business";

export const FIXED_COSTS_QUERY_KEY = ["fixed-costs"] as const;

export type RecurringExpense = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  amount: number;
  interval: RecurringInterval;
  startDate: string;
  endDate: string | null;
  active: boolean;
};

export type RecurringInput = Omit<RecurringExpense, "id">;

async function fetchRecurring(orgId: string): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from("fixed_costs")
    .select("id, name, description, category, amount, interval, start_date, end_date, active")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    amount: Number(r.amount),
    interval: (["monatlich", "vierteljährlich", "jährlich"].includes(r.interval)
      ? r.interval
      : "monatlich") as RecurringInterval,
    startDate: r.start_date,
    endDate: r.end_date,
    active: r.active,
  }));
}

export function monthlyTotal(items: RecurringExpense[]): number {
  return items.filter((f) => f.active).reduce((s, f) => s + monthlyShare(f.amount, f.interval), 0);
}

const toRow = (i: RecurringInput) => ({
  name: i.name,
  description: i.description,
  category: i.category,
  amount: i.amount,
  interval: i.interval,
  start_date: i.startDate,
  end_date: i.endDate,
  active: i.active,
});

export function useFixedCosts(orgId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [...FIXED_COSTS_QUERY_KEY, orgId],
    queryFn: () => fetchRecurring(orgId),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: FIXED_COSTS_QUERY_KEY });

  const save = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: RecurringInput }) => {
      if (id) {
        const { error } = await supabase.from("fixed_costs").update(toRow(values)).eq("id", id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Nicht angemeldet.");
        const { error } = await supabase
          .from("fixed_costs")
          .insert({ ...toRow(values), user_id: u.user.id, organization_id: orgId });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase
        .from("fixed_costs")
        .delete({ count: "exact" })
        .eq("id", id);
      if (error) throw error;
      if (!count) throw new Error("Nur Inhaber und Admins dürfen löschen.");
    },
    onSuccess: invalidate,
  });

  const bookDue = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("book_due_recurring_expenses", { _org: orgId });
      if (error) throw error;
      return data ?? 0;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", orgId] }),
  });

  const items = query.data ?? [];
  return { items, monthly: monthlyTotal(items), isLoading: query.isLoading, error: query.error, save, remove, bookDue };
}

/** Nur die monatliche Summe aktiver wiederkehrender Ausgaben (Dashboard). */
export function useMonthlyFixedCosts(orgId: string | null | undefined): number {
  const { data } = useQuery({
    queryKey: [...FIXED_COSTS_QUERY_KEY, orgId],
    queryFn: () => fetchRecurring(orgId!),
    enabled: !!orgId,
  });
  return monthlyTotal(data ?? []);
}
