import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TariffOverview } from "./tariffs";
import { actualTotals, byCategory, monthlySeries, type Range } from "./analytics";
import type { Transaction } from "@/hooks/useBusiness";
const uuid = (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new Error("Ungültiges Unternehmen.");
  return id;
};
export const getTariff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { orgId: string }) => ({ orgId: uuid(i.orgId) }))
  .handler(async ({ data, context }): Promise<TariffOverview> => {
    const r = await context.supabase.rpc("tariff_overview", { _org: data.orgId });
    if (r.error) throw new Error(r.error.message);
    return r.data as unknown as TariffOverview;
  });
export const checkFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { orgId: string; feature: "voice" | "logo" | "advanced_reports" | "documents" }) => ({
      ...i,
      orgId: uuid(i.orgId),
    }),
  )
  .handler(async ({ data, context }) => {
    const r = await context.supabase.rpc("tariff_feature", {
      _org: data.orgId,
      _feature: data.feature,
    });
    if (r.error) throw new Error(r.error.message);
    if (!r.data) throw new Error("Diese Funktion ist in deinem aktuellen Tarif nicht verfügbar.");
    return true;
  });
export const getAdvancedReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { orgId: string; range: Range; category?: string; customerId?: string }) => {
    uuid(i.orgId);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(i.range.from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(i.range.to) ||
      i.range.from > i.range.to
    )
      throw new Error("Ungültiger Zeitraum.");
    return i;
  })
  .handler(async ({ data, context }) => {
    const f = await context.supabase.rpc("tariff_feature", {
      _org: data.orgId,
      _feature: "advanced_reports",
    });
    if (f.error || !f.data)
      throw new Error("Erweiterte Auswertungen sind im Premium-Tarif verfügbar.");
    const r = await context.supabase
      .from("transactions")
      .select("*")
      .eq("organization_id", data.orgId)
      .gte("booking_date", data.range.from)
      .lte("booking_date", data.range.to)
      .limit(2000);
    if (r.error) throw new Error("Auswertung konnte nicht geladen werden.");
    const tx: Transaction[] = (r.data ?? []).map((t) => ({
      ...t,
      amount: Number(t.amount),
      type: t.type === "income" ? "income" : "expense",
      status: t.status === "bezahlt" ? "bezahlt" : "offen",
      capture_source: t.capture_source === "voice" ? "voice" : "manual",
    }));
    const filters = { category: data.category, customerId: data.customerId };
    return {
      totals: actualTotals(tx, data.range, filters),
      months: monthlySeries(tx, data.range, filters),
      expenseCats: byCategory(tx, data.range, "expense", filters),
      incomeCats: byCategory(tx, data.range, "income", filters),
    };
  });
export type OperatorData = {
  organizations: { id: string; name: string; tariff: TariffOverview }[];
  users: {
    id: string;
    display_name: string | null;
    memberships: { organization_id: string; role: string }[];
  }[];
  audit: {
    id: string;
    administrator: string;
    reason: string;
    created_at: string;
    before_value: import("@/integrations/supabase/types").Json;
    after_value: import("@/integrations/supabase/types").Json;
    organization_id: string | null;
  }[];
};
export const getOperatorDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OperatorData> => {
    const r = await context.supabase.rpc("operator_dashboard");
    if (r.error) throw new Error(r.error.message);
    return r.data as unknown as OperatorData;
  });
export const setSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      orgId: string;
      plan: string;
      status: string;
      start: string;
      end: string | null;
      reason: string;
    }) => ({ ...i, orgId: uuid(i.orgId) }),
  )
  .handler(async ({ data, context }) => {
    const r = await context.supabase.rpc("operator_set_subscription", {
      _org: data.orgId,
      _plan: data.plan,
      _status: data.status,
      _start: data.start,
      _end: data.end as string,
      _reason: data.reason,
    });
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });
export const setPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { plan: string; values: import("./tariffs").TariffPlan; reason: string }) => i,
  )
  .handler(async ({ data, context }) => {
    const r = await context.supabase.rpc("operator_set_plan", {
      _plan: data.plan,
      _values: JSON.parse(JSON.stringify(data.values)),
      _reason: data.reason,
    });
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

export type OcrReservation = {
  id: string;
  organization_id: string;
  state: string;
  created_at: string;
  reason: string | null;
};
export const getOcrReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OcrReservation[]> => {
    const r = await context.supabase.rpc("operator_ocr_reservations");
    if (r.error) throw new Error(r.error.message);
    return r.data as unknown as OcrReservation[];
  });
export const refundOcr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { requestId: string; reason: string }) => ({
    ...i,
    requestId: uuid(i.requestId),
  }))
  .handler(async ({ data, context }) => {
    const r = await context.supabase.rpc("operator_refund_ocr", {
      _request: data.requestId,
      _reason: data.reason,
    });
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });
