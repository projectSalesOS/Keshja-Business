import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Camera, Loader2, Repeat } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { Empty, Panel, PeriodPicker, Stat } from "@/components/AnalyticsUi";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import {
  actualTotals,
  addDaysIso,
  change,
  plannedExpenses,
  previousRange,
  rangeFor,
  receivables,
  sumReceivables,
  type Preset,
  type Range,
} from "@/lib/analytics";
import { todayIso } from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard – Keshja Business" },
      {
        name: "description",
        content: "Einnahmen, Ausgaben, Saldo, offene Forderungen und anstehende Ausgaben deines Unternehmens auf einen Blick.",
      },
      { property: "og:title", content: "Dashboard – Keshja Business" },
      { property: "og:description", content: "Die geschäftliche Startseite von Keshja Business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Deine wichtigsten Geschäftszahlen auf einen Blick."
          action={
            <Link
              to="/kassenbons"
              search={{ capture: "1" as const }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-card hover:opacity-90"
            >
              <Camera className="h-4 w-4" /> Beleg erfassen
            </Link>
          }
        />
        <OrgGate>{({ orgId }) => <DashboardView orgId={orgId} />}</OrgGate>
      </div>
    </AppShell>
  ),
});

function DashboardView({ orgId }: { orgId: string }) {
  const today = todayIso();
  const [preset, setPreset] = useState<Preset>("monat");
  const [custom, setCustom] = useState<Range>(rangeFor("monat", today));
  const range = rangeFor(preset, today, custom);
  const prev = previousRange(range);
  const d = useAnalyticsData(orgId);

  const m = useMemo(() => {
    const cur = actualTotals(d.transactions, range);
    const before = actualTotals(d.transactions, prev);
    const rcv = receivables(d.invoices, d.payments, today);
    const planned = plannedExpenses(d.items, d.transactions, { from: "1900-01-01", to: addDaysIso(today, 30) }, today);
    return { cur, before, rcv, sum: sumReceivables(rcv), planned };
  }, [d.transactions, d.invoices, d.payments, d.items, range.from, range.to, today]);

  if (d.isLoading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Kennzahlen werden geladen …
      </p>
    );
  if (d.error) return <p className="text-sm text-destructive">Daten konnten nicht geladen werden: {d.error.message}</p>;

  const prevLabel = preset === "monat" || preset === "vormonat" ? "Vormonat" : preset === "jahr" ? "Vorjahr" : "Vorzeitraum";
  const dueNow = m.planned.filter((p) => p.pastDue);
  const upcoming = m.planned.filter((p) => !p.pastDue);
  const recent = [...d.transactions].filter((t) => t.status === "bezahlt").slice(0, 6);
  const openTx = d.transactions.filter((t) => t.status === "offen");

  return (
    <div className="space-y-6">
      <PeriodPicker preset={preset} custom={custom} today={today} onChange={(p, c) => (setPreset(p), setCustom(c))} />
      <p className="-mt-3 text-xs text-muted-foreground">
        {formatDate(range.from)} – {formatDate(range.to)} · Vergleich: {formatDate(prev.from)} – {formatDate(prev.to)}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat accent="violet" label="Einnahmen" value={currency(m.cur.income)} badge="Ist" delta={{ pct: change(m.cur.income, m.before.income, m.before.count), label: prevLabel }} />
        <Stat accent="blue" label="Ausgaben" value={currency(m.cur.expense)} badge="Ist" delta={{ pct: change(m.cur.expense, m.before.expense, m.before.count), label: prevLabel, invert: true }} />
        <Stat
          label="Saldo"
          accent="turquoise"
          value={currency(m.cur.balance)}
          badge="Ist"
          tone={m.cur.count === 0 ? "default" : m.cur.balance >= 0 ? "good" : "bad"}
          hint={m.cur.count === 0 ? "Keine bezahlten Buchungen im Zeitraum" : `${m.cur.count} Buchungen · Vorzeitraum ${m.before.count ? currency(m.before.balance) : "ohne Daten"}`}
        />
        <Stat accent="green" label="Offene Forderungen" value={currency(m.sum.openTotal)} badge="erwartet" hint={`${m.sum.openCount} offene Rechnungen (Restbeträge)`} />
        <Stat accent="orange" label="Überfällig" value={currency(m.sum.overdueTotal)} tone={m.sum.overdueCount ? "bad" : "default"} hint={`${m.sum.overdueCount} Rechnungen überfällig`} />
        <Stat
          label="Wiederkehrend fällig"
          accent="pink"
          value={currency(m.planned.reduce((s, p) => s + p.amount, 0))}
          badge="geplant"
          hint={`${dueNow.length} fällig, ${upcoming.length} in 30 Tagen · noch nicht gebucht`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Anstehende Aufgaben">
          <ul className="divide-y divide-border text-sm">
            {m.rcv.filter((r) => r.overdue).slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  <span className="truncate">
                    {r.number} · {r.customerName} – {r.daysOverdue} Tage überfällig
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{currency(r.open)}</span>
              </li>
            ))}
            {dueNow.length > 0 && (
              <li className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" /> {dueNow.length} wiederkehrende Ausgabe(n) fällig, noch nicht gebucht
                </span>
                <Link to="/fixkosten" className="shrink-0 text-xs font-medium text-primary">Buchen</Link>
              </li>
            )}
            {openTx.length > 0 && (
              <li className="flex items-center justify-between gap-3 py-2">
                <span>{openTx.length} Buchung(en) mit Status „offen“</span>
                <Link to="/finanzen" className="shrink-0 text-xs font-medium text-primary">Ansehen</Link>
              </li>
            )}
          </ul>
          {!m.sum.overdueCount && !dueNow.length && !openTx.length && <Empty>Keine offenen Aufgaben.</Empty>}
        </Panel>

        <Panel title="Letzte Geschäftsvorgänge" action={<Link to="/finanzen" className="text-xs font-medium text-primary">Alle</Link>}>
          {recent.length ? (
            <ul className="divide-y divide-border text-sm">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.description || t.category}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(t.booking_date)} · {t.category}</span>
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${t.type === "income" ? "text-primary" : ""}`}>
                    {t.type === "income" ? "+" : "−"}{currency(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Noch keine Buchungen erfasst.</Empty>
          )}
        </Panel>

        <Panel title="Wiederkehrende Ausgaben – nächste 30 Tage" action={<Link to="/liquiditaet" className="text-xs font-medium text-primary">Liquiditätsvorschau</Link>}>
          {upcoming.length ? (
            <ul className="divide-y divide-border text-sm">
              {upcoming.slice(0, 6).map((p) => (
                <li key={`${p.id}${p.date}`} className="flex justify-between gap-3 py-2">
                  <span className="truncate">{formatDate(p.date)} · {p.name}</span>
                  <span className="shrink-0 tabular-nums">{currency(p.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Keine anstehenden wiederkehrenden Ausgaben.</Empty>
          )}
        </Panel>

        <Panel title="Offene Rechnungen" action={<Link to="/rechnungen" className="text-xs font-medium text-primary">Rechnungen</Link>}>
          {m.rcv.length ? (
            <ul className="divide-y divide-border text-sm">
              {m.rcv.slice(0, 6).map((r) => (
                <li key={r.id} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">
                    {r.number} · {r.customerName}
                    <span className="block text-xs text-muted-foreground">
                      fällig {r.due_date ? formatDate(r.due_date) : "–"}{r.paid > 0 ? ` · teilbezahlt ${currency(r.paid)}` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${r.overdue ? "text-destructive" : ""}`}>{currency(r.open)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Keine offenen Rechnungen.</Empty>
          )}
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">
        Ist = bezahlte Buchungen (Zahlungseingänge zählen genau einmal). Erwartet/geplant = offene Restbeträge bzw. noch nicht gebuchte Fälligkeiten – keine garantierten Zahlungen. Details unter{" "}
        <Link to="/auswertungen" className="font-medium text-primary">Auswertungen</Link>.
      </p>
    </div>
  );
}
