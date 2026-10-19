import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { useTariff } from "@/hooks/useTariff";
import { TariffComparison } from "@/components/TariffComparison";
import { STATUS_LABEL, remaining, formatCents, monthlyPriceCents, type BillingInterval } from "@/lib/tariffs";
import { formatDate } from "@/lib/finance";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tarif")({
  validateSearch: (search: Record<string, unknown>): { checkout?: string } =>
    typeof search["checkout"] === "string" ? { checkout: search["checkout"] } : {},
  head: () => ({
    meta: [
      { title: "Dein Tarif – KESHJA Business" },
      {
        name: "description",
        content: "Aktueller Tarif, Freischaltung und verbleibende Buchungs- und Scan-Kontingente.",
      },
      { property: "og:title", content: "Dein Tarif – KESHJA Business" },
      {
        property: "og:description",
        content: "Tarife und tatsächliche Nutzung deines Unternehmens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <OrgGate>{({ orgId }) => <TariffPage orgId={orgId} />}</OrgGate>
    </AppShell>
  ),
});

function useMemberRole(orgId: string) {
  return useQuery({
    queryKey: ["member-role", orgId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const r = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();
      return r.data?.role ?? null;
    },
  });
}

function TariffPage({ orgId }: { orgId: string }) {
  const q = useTariff(orgId);
  const role = useMemberRole(orgId);
  const queryClient = useQueryClient();
  const { checkout } = Route.useSearch();
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [checkoutTarget, setCheckoutTarget] = useState<"basic" | "premium" | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const isAdmin = role.data === "owner" || role.data === "admin";
  const sub = q.data?.subscription;
  const hasStripeSub = sub?.source === "stripe" && Boolean(sub.period_end) &&
    ["active", "trialing", "past_due"].includes(sub.status);
  const hasManualGrant = sub?.source === "manual" && Boolean(sub.period_end) &&
    new Date(sub.period_end!) > new Date() && ["active", "trialing"].includes(sub.status);

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const result = await createPortalSession({
        data: {
          orgId,
          returnUrl: `${window.location.origin}/tarif`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Abonnementverwaltung konnte nicht geöffnet werden.");
    } finally {
      setPortalBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <PaymentTestModeBanner />
      <PageHeader title="Dein Tarif" description="Ein Tarif für dein gesamtes Unternehmen." />
      {checkout === "success" && (
        <p role="status" className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          Zahlung erfolgreich – dein Tarif wird gleich aktiviert, sobald das Zahlungssystem die
          Bestätigung übermittelt hat.
        </p>
      )}
      {q.isPending ? (
        <p>Tarif wird geladen …</p>
      ) : q.error ? (
        <p role="alert" className="text-destructive">
          {q.error.message}
        </p>
      ) : (
        <section className="space-y-5 border-y border-border py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">{q.data.plan.name}</h2>
            <span className="text-sm text-primary">{STATUS_LABEL[q.data.subscription.status]}</span>
          </div>
          {sub?.period_end && (
            <p className="text-sm text-muted-foreground">
              {sub.source === "stripe" ? "Abonnement" : "Freischaltung"}:{" "}
              {formatDate(sub.starts_at.slice(0, 10))} bis {formatDate(sub.period_end.slice(0, 10))}
              {sub.billing_interval
                ? ` · ${sub.billing_interval === "annual" ? "jährliche" : "monatliche"} Zahlung`
                : ""}
              {sub.renews_at ? ` · verlängert sich am ${formatDate(sub.renews_at.slice(0, 10))}` : ""}
              {q.data.plan.id !== sub.plan_id ? " · aktuell gelten Free-Rechte" : ""}
            </p>
          )}
          {hasStripeSub && isAdmin && (
            <div>
              <Button variant="outline" onClick={openPortal} disabled={portalBusy}>
                {portalBusy ? "Wird geöffnet …" : "Abonnement verwalten oder kündigen"}
              </Button>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Usage
              title="Manuelle Buchungen"
              used={q.data.manual_used}
              limit={q.data.plan.manual_limit}
            />
            <Usage
              title="KI-Belegscans im Kalendermonat (UTC)"
              used={q.data.ocr_used}
              limit={q.data.plan.ocr_limit}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Reine aktive Handbuchungen zählen insgesamt. Belegzuordnungen, Rechnungszahlungen und
            automatisch gebuchte Fixkosten zählen nicht. Reservierte KI-Aufrufe zählen bis zur
            bestätigten Erstattung.
          </p>
        </section>
      )}

      {isAdmin && !hasManualGrant && (
        <section>
          <h2 className="mb-2 text-xl font-semibold">Tarif buchen</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Sichere Zahlung über unseren Zahlungsdienstleister. Alle Preise inklusive 19 %
            Umsatzsteuer. Jahrestarife werden jährlich im Voraus abgerechnet.
          </p>
          <div
            role="group"
            aria-label="Zahlungsintervall"
            className="mb-5 inline-flex rounded-full border border-border bg-card p-1"
          >
            {(
              [
                ["annual", "Jährliche Zahlung"],
                ["monthly", "Monatliche Zahlung"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={interval === value}
                onClick={() => setInterval(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  interval === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {(["basic", "premium"] as const).map((planId) => {
              const plan = q.data && planId === "basic" ? { name: "Basic", monthly: 1290, annual: 11880 } : { name: "Premium", monthly: 1990, annual: 20280 };
              const cents = interval === "annual" ? Math.round(plan.annual / 12) : plan.monthly;
              const isCurrent = q.data?.subscription.plan_id === planId && hasStripeSub;
              return (
                <article key={planId} className="glass-tile rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mb-1 mt-3 text-2xl font-semibold">
                    {formatCents(cents)}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">/ Monat</span>
                  </p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    {interval === "annual"
                      ? `${formatCents(plan.annual)} pro Jahr, jährlich im Voraus zahlbar.`
                      : "Monatlich zahlbar, monatlich kündbar."}
                  </p>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent}
                    onClick={() => setCheckoutTarget(planId)}
                  >
                    {isCurrent ? "Aktueller Tarif" : `${plan.name} buchen`}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Tarife im Vergleich</h2>
        <TariffComparison />
      </section>
      <section className="border-t border-border pt-6">
        <h2 className="font-semibold">Manuelle Freischaltung</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Basic, Premium und Testzeiträume können zusätzlich vom Betreiber freigeschaltet werden.
          Manuelle Freischaltungen bleiben von Online-Abonnements unberührt.
        </p>
      </section>

      <Dialog
        open={checkoutTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCheckoutTarget(null);
            queryClient.invalidateQueries({ queryKey: ["tariff", orgId] });
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {checkoutTarget === "premium" ? "Premium" : "Basic"} buchen –{" "}
              {interval === "annual" ? "jährliche Zahlung" : "monatliche Zahlung"}
            </DialogTitle>
          </DialogHeader>
          {checkoutTarget && (
            <StripeEmbeddedCheckout
              orgId={orgId}
              planId={checkoutTarget}
              interval={interval}
              returnUrl={`${window.location.origin}/tarif?checkout=success`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Usage({ title, used, limit }: { title: string; used: number; limit: number | null }) {
  const rest = remaining(limit, used);
  return (
    <div>
      <h3 className="text-sm text-muted-foreground">{title}</h3>
      <p className="mt-2 text-xl font-semibold">
        {used}{" "}
        <span className="text-sm font-normal text-muted-foreground">/ {limit ?? "unbegrenzt"}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {rest === null ? "Ohne Kontingentbegrenzung" : `${rest} verbleibend`}
      </p>
      {limit !== null && (
        <progress
          className="mt-3 h-2 w-full accent-primary"
          value={Math.min(used, limit)}
          max={Math.max(1, limit)}
          aria-label={title}
        />
      )}
    </div>
  );
}
