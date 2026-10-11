import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FixedCost } from "@/lib/mock-data";

export const FIXED_COSTS_QUERY_KEY = ["fixed-costs"] as const;

async function fetchFixedCosts(): Promise<FixedCost[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("fixed_costs")
    .select("id, name, category, amount, interval, due_day")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    amount: Number(row.amount),
    interval: row.interval === "jährlich" ? "jährlich" : "monatlich",
    dueDay: Number(row.due_day ?? 1),
  }));
}

/** Monatliche Belastung aus allen Fixkosten. */
export function monthlyTotal(items: FixedCost[]): number {
  return items.reduce((sum, f) => sum + (f.interval === "monatlich" ? f.amount : f.amount / 12), 0);
}

export function useFixedCosts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: FIXED_COSTS_QUERY_KEY,
    queryFn: fetchFixedCosts,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: FIXED_COSTS_QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: async (input: Omit<FixedCost, "id">) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Nicht angemeldet.");
      const { error } = await supabase.from("fixed_costs").insert({
        user_id: userId,
        name: input.name,
        category: input.category,
        amount: input.amount,
        interval: input.interval,
        due_day: input.dueDay,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fixed_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const items = query.data ?? [];

  return {
    items,
    monthly: monthlyTotal(items),
    isLoading: query.isLoading,
    add: addMutation.mutate,
    remove: removeMutation.mutate,
  };
}

/** Nur die monatliche Summe (Dashboard/Auswertungen). */
export function useMonthlyFixedCosts(): number {
  const { data } = useQuery({
    queryKey: FIXED_COSTS_QUERY_KEY,
    queryFn: fetchFixedCosts,
    staleTime: 30_000,
  });
  return monthlyTotal(data ?? []);
}
