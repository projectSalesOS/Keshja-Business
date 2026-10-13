import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, CalendarDays, ShoppingBasket, Repeat, Sparkles, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { KpiCard } from "@/components/KpiCard";
import { ChartSection } from "@/components/ChartSection";
import { useReceipts } from "@/hooks/useReceipts";
import { useProfile } from "@/hooks/useProfile";
import { useMonthlyFixedCosts } from "@/hooks/useFixedCosts";
import { useOrganization } from "@/hooks/useOrganization";
import {
  aiSummary,
  currency,
  formatDate,
  receiptsInPeriod,
  sumForBereich,
  sumTotals,
  reportStats,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard – Keshja Business" },
      {
        name: "description",
        content:
          "KESHJA erfasst Kassenbons per Foto, kategorisiert Ausgaben mit KI und zeigt Wochen-, Monats- und wiederkehrende Ausgaben auf einen Blick.",
      },
      { property: "og:title", content: "Dashboard – Keshja Business" },
      {
        property: "og:description",
        content: "Belege fotografieren, KI erkennt die Daten, Geschäftsausgaben im Blick.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: org } = useOrganization();
  const allReceipts = useReceipts(org?.organization?.id);
  const week = receiptsInPeriod("woche", allReceipts);
  const month = receiptsInPeriod("monat", allReceipts);
  const latest = receiptsInPeriod("jahr", allReceipts).slice(0, 5);
  const stats = reportStats(month);
  const monthlyFixedCosts = useMonthlyFixedCosts(org?.organization?.id);

  const [greeting, setGreeting] = useState("Guten Morgen");
  const { data: profile } = useProfile();
  const userName = profile?.displayName.split(" ")[0] ?? "";

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18) setGreeting("Guten Abend");
    else if (hour >= 12) setGreeting("Guten Tag");
    else setGreeting("Guten Morgen");
  }, []);

  const summaryRows: { label: string; value: string }[] = [
    { label: "Gesamtausgaben", value: currency(stats.total) },
    { label: "Anzahl Kassenbons", value: String(stats.receiptCount) },
    { label: "Durchschnittlicher Einkauf", value: currency(stats.average) },
    { label: "Größte Kategorie", value: stats.topBereich?.name ?? "–" },
    { label: "Größte Unterkategorie", value: stats.topKategorie?.name ?? "–" },
    { label: "Wiederkehrende Ausgaben", value: currency(monthlyFixedCosts) },
  ];

  const bullets = [
    <>
      Höchste Ausgaben diesen Monat im Bereich{" "}
      <strong className="font-semibold text-foreground">{stats.topBereich?.name ?? "–"}</strong> mit{" "}
      <strong className="font-semibold text-foreground">
        {currency(stats.topBereich?.value ?? 0)}
      </strong>
      .
    </>,
    <>
      Die durchschnittliche Einkaufssumme beträgt{" "}
      <strong className="font-semibold text-foreground">{currency(stats.average)}</strong>.
    </>,
    <>
      Teuerster Einkauf:{" "}
      <strong className="font-semibold text-foreground">
        {stats.mostExpensive?.store ?? "–"}
      </strong>{" "}
      mit{" "}
      <strong className="font-semibold text-foreground">
        {currency(stats.mostExpensive?.total ?? 0)}
      </strong>
      .
    </>,
    <>
      Auffällige Ausreißer wurden{" "}
      <strong className="font-semibold text-foreground">nicht erkannt</strong>.
    </>,
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Alle Ausgaben automatisch erfasst, kategorisiert und ausgewertet."
          action={
            <Link
              to="/kassenbons"
              className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-card transition-opacity hover:opacity-90 lg:inline-flex"
            >
              <Camera className="h-4 w-4" /> Kassenbon fotografieren
            </Link>
          }
        />

        <section className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2
              className="text-xl font-semibold text-foreground sm:text-2xl"
              suppressHydrationWarning
            >
              {greeting}{userName ? `, ${userName}` : ""} <span aria-hidden>👋</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Du hast deine Finanzen im Blick. Was möchtest du heute erfassen?
            </p>
          </div>
          <Link
            to="/kassenbons"
            search={{ capture: "1" as const }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-card transition-opacity hover:opacity-90"
          >
            <Camera className="h-4 w-4" />
            <span>Bon erfassen</span>
          </Link>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Ausgaben Woche"
            value={currency(sumTotals(week))}
            hint={`${week.length} Kassenbons`}
            icon={CalendarDays}
            color="violet"
          />
          <KpiCard
            label="Ausgaben Monat"
            value={currency(sumTotals(month))}
            hint={`${month.length} Kassenbons`}
            icon={Wallet}
            color="blue"
          />
          <KpiCard
            label="Lebensmittel Monat"
            value={currency(sumForBereich(month, "Lebensmittel"))}
            hint="größter variabler Block"
            icon={ShoppingBasket}
            color="green"
          />
          <KpiCard
            label="Wiederkehrend Monat"
            value={currency(monthlyFixedCosts)}
            hint="wiederkehrend"
            icon={Repeat}
            color="orange"
          />
        </div>

        <ChartSection receipts={month} period="monat" />

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Letzte Kassenbons</h2>
              <Link to="/kassenbons" className="text-xs font-medium text-primary">
                Alle ansehen
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {latest.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{r.store}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.date)} · {r.time} Uhr · {r.items.length} Positionen
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{currency(r.total)}</span>
                </li>
              ))}
            </ul>
            {latest.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Noch keine Kassenbons erfasst. Scanne deinen ersten Kassenbon, um zu starten.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">KI-Zusammenfassung</h2>
            </div>
            <dl className="mt-4 divide-y divide-border">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-card-foreground">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            {stats.receiptCount > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                {aiSummary("monat", month, monthlyFixedCosts)}
              </p>
            )}
          </section>
        </div>

        <Link
          to="/kassenbons"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-elevated transition-opacity hover:opacity-90"
        >
          <Camera className="h-5 w-5" /> Kassenbon fotografieren
        </Link>
      </div>
    </AppShell>
  );
}
