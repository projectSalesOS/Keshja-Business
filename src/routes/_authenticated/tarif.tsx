import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { useTariff } from "@/hooks/useTariff";
import { TariffComparison } from "@/components/TariffComparison";
import { STATUS_LABEL, remaining } from "@/lib/tariffs";
import { formatDate } from "@/lib/finance";
export const Route = createFileRoute("/_authenticated/tarif")({
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
function TariffPage({ orgId }: { orgId: string }) {
  const q = useTariff(orgId);
  return (
    <div className="space-y-8">
      <PageHeader title="Dein Tarif" description="Ein Tarif für dein gesamtes Unternehmen." />
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
          {q.data.subscription.period_end && (
            <p className="text-sm text-muted-foreground">
              Freischaltung: {formatDate(q.data.subscription.starts_at.slice(0, 10))} bis{" "}
              {formatDate(q.data.subscription.period_end.slice(0, 10))}
              {q.data.plan.id !== q.data.subscription.plan_id
                ? " · aktuell gelten Free-Rechte"
                : ""}
            </p>
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
      <section>
        <h2 className="mb-4 text-xl font-semibold">Tarife im Vergleich</h2>
        <TariffComparison />
      </section>
      <section className="border-t border-border pt-6">
        <h2 className="font-semibold">Manuelle Freischaltung</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Basic, Premium und Testzeiträume werden vom Betreiber freigeschaltet. Ein öffentlicher
          Kontaktweg ist noch nicht hinterlegt. Es wird keine Zahlung ausgelöst.
        </p>
      </section>
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
