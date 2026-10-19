import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string; organizationId: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    const match = found.data[0];
    if (match) return match.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId, organization_id: options.organizationId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { ...(options.userId && { userId: options.userId }), organization_id: options.organizationId },
  });
  return created.id;
}

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    orgId: string;
    planId: string;
    interval: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[0-9a-f-]{36}$/.test(data.orgId)) throw new Error("Ungültige Organisation");
    if (data.planId !== "basic" && data.planId !== "premium") throw new Error("Ungültiger Tarif");
    if (data.interval !== "monthly" && data.interval !== "annual") throw new Error("Ungültiges Intervall");
    if (data.environment !== "sandbox" && data.environment !== "live") throw new Error("Ungültige Umgebung");
    return data as { orgId: string; planId: "basic" | "premium"; interval: "monthly" | "annual"; returnUrl: string; environment: StripeEnv };
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;

    // Nur Inhaber/Admin der Organisation dürfen einen Checkout starten.
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", data.orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return { error: "Nur Inhaber oder Admins dieser Organisation können ein Abonnement abschließen." };
    }

    // Preis-ID kommt serverseitig aus der Tariftabelle, niemals vom Browser.
    const { data: plan } = await supabase
      .from("tariff_plans")
      .select("id, stripe_price_monthly, stripe_price_annual")
      .eq("id", data.planId)
      .maybeSingle();
    const lookupKey = data.interval === "annual" ? plan?.stripe_price_annual : plan?.stripe_price_monthly;
    if (!plan || !lookupKey) return { error: "Für diesen Tarif ist kein Zahlungspreis hinterlegt." };

    // Kein doppeltes aktives Abonnement und keine Übersteuerung manueller Freischaltungen.
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("status, source, period_end")
      .eq("organization_id", data.orgId)
      .maybeSingle();
    if (existing) {
      const active = ["active", "trialing", "past_due"].includes(existing.status) &&
        (!existing.period_end || new Date(existing.period_end) > new Date());
      if (active && existing.source === "manual") {
        return { error: "Für diese Organisation besteht eine manuelle Freischaltung. Bitte wende dich an den Betreiber, bevor du ein Abonnement abschließt." };
      }
      if (active && existing.source === "stripe") {
        return { error: "Es besteht bereits ein aktives Abonnement. Verwalte es über „Abonnement verwalten“." };
      }
    }

    try {
      const stripe = createStripeClient(data.environment);
      const { data: { user } } = await supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, {
        ...(user?.email ? { email: user.email } : {}),
        userId,
        organizationId: data.orgId,
      });

      const prices = await stripe.prices.list({ lookup_keys: [lookupKey] });
      const stripePrice = prices.data[0];
      if (!stripePrice) return { error: "Preis wurde im Zahlungssystem nicht gefunden." };

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId, organization_id: data.orgId },
        subscription_data: { metadata: { userId, organization_id: data.orgId } },
        managed_payments: { enabled: true },
      } as Parameters<typeof stripe.checkout.sessions.create>[0]);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orgId: string; returnUrl?: string; environment: StripeEnv }) => {
    if (!/^[0-9a-f-]{36}$/.test(data.orgId)) throw new Error("Ungültige Organisation");
    if (data.environment !== "sandbox" && data.environment !== "live") throw new Error("Ungültige Umgebung");
    return data;
  })
  .handler(async ({ data, context }): Promise<PortalResult> => {
    const { supabase, userId } = context;

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", data.orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return { error: "Nur Inhaber oder Admins dieser Organisation können das Abonnement verwalten." };
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("external_customer_ref, source")
      .eq("organization_id", data.orgId)
      .maybeSingle();
    if (!sub?.external_customer_ref || sub.source !== "stripe") {
      return { error: "Für diese Organisation existiert kein Online-Abonnement." };
    }

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.external_customer_ref,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
