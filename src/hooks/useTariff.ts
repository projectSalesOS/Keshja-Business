import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getTariff } from "@/lib/tariffs.functions";
import type { TariffPlan } from "@/lib/tariffs";
export function useTariff(orgId: string | undefined | null) {
  const get = useServerFn(getTariff);
  return useQuery({
    queryKey: ["tariff", orgId],
    queryFn: () => {
      if (!orgId) throw new Error("Kein Unternehmen");
      return get({ data: { orgId } });
    },
    enabled: Boolean(orgId),
    staleTime: 15000,
  });
}
export function usePlans() {
  return useQuery({
    queryKey: ["tariff-plans"],
    queryFn: async (): Promise<TariffPlan[]> => {
      const r = await supabase.from("tariff_plans").select("*").order("price_cents");
      if (r.error) throw r.error;
      return (r.data ?? []).map((p) => {
        if (p.id !== "free" && p.id !== "basic" && p.id !== "premium")
          throw new Error("Ungültiger Tarif");
        return { ...p, id: p.id };
      });
    },
  });
}
export function useOperator() {
  return useQuery({
    queryKey: ["operator"],
    queryFn: async () => {
      const r = await supabase.from("platform_operators").select("user_id");
      if (r.error) throw r.error;
      return Boolean(r.data?.length);
    },
  });
}
