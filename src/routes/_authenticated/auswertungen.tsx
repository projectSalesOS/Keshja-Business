import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileDown, Sparkles } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ChartSection } from "@/components/ChartSection";
import { KpiCard } from "@/components/KpiCard";
import { CalendarDays, Receipt as ReceiptIcon, TrendingUp, Layers } from "lucide-react";
import {
  PERIOD_LABELS,
  aiSummary,
  currency,
  receiptsInPeriod,
  reportStats,
  type Period,
} from "@/lib/finance";
import { generateReport } from "@/lib/pdf-report";
import { useReceipts } from "@/hooks/useReceipts";
import { useMonthlyFixedCosts } from "@/hooks/useFixedCosts";

export const Route = createFileRoute("/_authenticated/auswertungen")({
  head: () => ({
    meta: [
      { title: "Auswertungen – KESHJA" },
      {
        name: "description",
        content:
          "Ausgaben nach Tag, Woche, Monat, Quartal und Jahr auswerten – nach Kategorien und Unterkategorien, inklusive PDF-Bericht.",
      },
      { property: "og:title", content: "Auswertungen – KESHJA" },
      {
        property: "og:description",
        content: "Zeiträume vergleichen und professionelle PDF-Berichte erstellen.",
      },
    ],
  }),
  component: AuswertungenPage,
});

const PERIODS: Period[] = ["heute", "woche", "monat", "quartal", "jahr"];

function AuswertungenPage() {
  const [period, setPeriod] = useState<Period>("monat");
  const [withAi, setWithAi] = useState(true);
  const allReceipts = useReceipts();
  const receipts = receiptsInPeriod(period, allReceipts);
  const stats = reportStats(receipts);
  const monthlyFixedCosts = useMonthlyFixedCosts();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Auswertungen"
          description="Dieselbe Datenbasis wie das Dashboard – über frei wählbare Zeiträume."
        />

        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                period === p
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Gesamtausgaben"
            value={currency(stats.total)}
            icon={CalendarDays}
            color="violet"
          />
          <KpiCard
            label="Kassenbons"
            value={String(stats.receiptCount)}
            icon={ReceiptIcon}
            color="blue"
          />
          <KpiCard label="Ø Einkauf" value={currency(stats.average)} icon={TrendingUp} color="green" />
          <KpiCard
            label="Größte Kategorie"
            value={stats.topBereich?.name ?? "–"}
            hint={stats.topBereich ? currency(stats.topBereich.value) : undefined}
            icon={Layers}
            color="orange"
          />
        </div>

        <ChartSection receipts={receipts} period={period} />

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">KI-Zusammenfassung</h2>
          </div>

          {stats.receiptCount > 0 ? (
            <>
              <dl className="mt-4 divide-y divide-border">
                {[
                  {
                    label: "Kassenbons",
                    value: `${stats.receiptCount} Kassenbons mit einem Gesamtwert von ${currency(stats.total)}`,
                  },
                  { label: "Durchschnittlicher Einkauf", value: currency(stats.average) },
                  {
                    label: "Größter Ausgabenbereich",
                    value: `${stats.topBereich?.name ?? "–"} – ${currency(stats.topBereich?.value ?? 0)}`,
                  },
                  {
                    label: "Dominierende Unterkategorie",
                    value: `${stats.topKategorie?.name ?? "–"} – ${currency(stats.topKategorie?.value ?? 0)}`,
                  },
                  { label: "Fixkosten", value: `${currency(monthlyFixedCosts)} monatlich` },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-xs text-muted-foreground">{row.label}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-foreground text-right">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Im Zeitraum <strong className="font-semibold text-foreground">{PERIOD_LABELS[period]}</strong> wurden{" "}
                    <strong className="font-semibold text-foreground">{stats.receiptCount}</strong> Kassenbons mit einem Gesamtwert von{" "}
                    <strong className="font-semibold text-foreground">{currency(stats.total)}</strong> erfasst.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Der durchschnittliche Einkauf lag bei{" "}
                    <strong className="font-semibold text-foreground">{currency(stats.average)}</strong>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Der größte Ausgabenbereich war{" "}
                    <strong className="font-semibold text-foreground">{stats.topBereich?.name ?? "–"}</strong> mit{" "}
                    <strong className="font-semibold text-foreground">{currency(stats.topBereich?.value ?? 0)}</strong>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Innerhalb der Unterkategorien dominierte{" "}
                    <strong className="font-semibold text-foreground">{stats.topKategorie?.name ?? "–"}</strong> mit{" "}
                    <strong className="font-semibold text-foreground">{currency(stats.topKategorie?.value ?? 0)}</strong>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    Zusammen mit{" "}
                    <strong className="font-semibold text-foreground">{currency(monthlyFixedCosts)} monatlichen Fixkosten</strong>{" "}
                    ergibt sich ein stabiles Ausgabenbild ohne auffällige Ausreißer.
                  </span>
                </li>
              </ul>
            </>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {aiSummary(period, receipts, monthlyFixedCosts)}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold">PDF-Bericht</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Management-Zusammenfassung, Kennzahlen sowie Kategorien und Unterkategorien für den
            Zeitraum {PERIOD_LABELS[period]}.
          </p>

          <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium">KI-Kommentar hinzufügen</span>
            <input
              type="checkbox"
              checked={withAi}
              onChange={(e) => setWithAi(e.target.checked)}
              className="h-5 w-9 appearance-none rounded-full bg-muted transition-colors checked:bg-primary"
            />
          </label>

          <button
            type="button"
            onClick={() => generateReport(period, withAi, allReceipts)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
          >
            <FileDown className="h-4 w-4" /> Bericht erstellen
          </button>
        </section>
      </div>
    </AppShell>
  );
}