import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

// Supabase-Admin-Client wird erst bei Bedarf geladen (Service-Rolle, umgeht RLS).
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function mapStatus(stripeStatus: string): string | null {
  switch (stripeStatus) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due": return "past_due";
    case "canceled":
    case "unpaid": return "canceled";
    case "incomplete_expired": return "expired";
    default: return null; // incomplete u. a. → keine Rechteänderung
  }
}

function planFromLookupKey(key: string | null | undefined): { planId: string; interval: string } | null {
  if (key === "basic_monthly") return { planId: "basic", interval: "monthly" };
  if (key === "basic_annual") return { planId: "basic", interval: "annual" };
  if (key === "premium_monthly") return { planId: "premium", interval: "monthly" };
  if (key === "premium_annual") return { planId: "premium", interval: "annual" };
  return null;
}

async function audit(
  orgId: string,
  userId: string | null,
  reason: string,
  before: unknown,
  after: unknown,
) {
  const admin = await getAdmin();
  let administrator = userId;
  if (!administrator) {
    const { data: org } = await admin.from("organizations").select("created_by").eq("id", orgId).maybeSingle();
    administrator = org?.created_by ?? null;
  }
  if (!administrator) return;
  await admin.from("subscription_audit").insert({
    organization_id: orgId,
    administrator,
    reason,
    before_value: before as never,
    after_value: after as never,
  });
}

async function syncSubscription(subscription: any, env: StripeEnv) {
  const orgId = subscription.metadata?.organization_id;
  if (!orgId) {
    console.error("Webhook: subscription ohne organization_id", subscription.id);
    return;
  }
  const admin = await getAdmin();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

  // Manuelle Freischaltungen werden niemals durch Zahlungs-Webhooks überschrieben.
  if (existing?.source === "manual") {
    console.log("Webhook: manuelle Freischaltung bleibt unberührt", orgId);
    return;
  }

  const item = subscription.items?.data?.[0];
  const lookupKey = item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? null;
  const mapped = planFromLookupKey(lookupKey);
  const status = mapStatus(subscription.status);
  if (!mapped || !status) {
    console.error("Webhook: unbekannter Preis oder Status", lookupKey, subscription.status);
    return;
  }

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const row = {
    organization_id: orgId,
    plan_id: mapped.planId,
    status,
    starts_at: periodStart ? new Date(periodStart * 1000).toISOString() : new Date().toISOString(),
    period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    renews_at: subscription.cancel_at_period_end
      ? null
      : periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    source: "stripe",
    external_customer_ref: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    external_subscription_ref: subscription.id,
    billing_interval: mapped.interval,
    stripe_environment: env,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("subscriptions")
    .upsert(row, { onConflict: "organization_id" });
  if (error) throw error;

  await audit(orgId, subscription.metadata?.userId ?? null, `Zahlungs-Webhook: Abonnement ${status}`, existing, row);
}

async function markStatusBySubscriptionRef(subscriptionId: string, status: string, env: StripeEnv) {
  const admin = await getAdmin();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("*")
    .eq("external_subscription_ref", subscriptionId)
    .maybeSingle();
  if (!existing || existing.source !== "stripe") return;
  if (existing.stripe_environment && existing.stripe_environment !== env) return;
  const { error } = await admin
    .from("subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("external_subscription_ref", subscriptionId);
  if (error) throw error;
  await audit(existing.organization_id, null, `Zahlungs-Webhook: Status ${status}`, existing, { ...existing, status });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const admin = await getAdmin();

  // Idempotenz: jedes Ereignis wird genau einmal verarbeitet.
  const { error: claimError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, environment: env, event_type: event.type });
  if (claimError) {
    // Primärschlüssel-Konflikt = bereits verarbeitet.
    return;
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markStatusBySubscriptionRef(event.data.object.id, "canceled", env);
      break;
    case "invoice.payment_failed": {
      const subRef = event.data.object.subscription;
      if (typeof subRef === "string") await markStatusBySubscriptionRef(subRef, "past_due", env);
      break;
    }
    case "invoice.paid": {
      const subRef = event.data.object.subscription;
      if (typeof subRef === "string") await markStatusBySubscriptionRef(subRef, "active", env);
      break;
    }
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // Abonnement-Zustand wird über customer.subscription.* abgebildet.
      break;
    default:
      console.log("Webhook: unbehandeltes Ereignis", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook mit ungültigem env-Parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook-Fehler:", e instanceof Error ? e.message : "unbekannt");
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
