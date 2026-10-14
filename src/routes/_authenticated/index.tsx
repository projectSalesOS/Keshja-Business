import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, FileText, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { Empty, Panel, PeriodPicker, Stat, tooltipStyle } from "@/components/AnalyticsUi";
import { useProfile } from "@/hooks/useProfile";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import { actualTotals, monthlySeries, rangeFor, receivables, type Preset, type Range } from "@/lib/analytics";
import { todayIso } from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard – Keshja Business" },
      {
        name: "description",
        content: "Einnahmen, Ausgaben und Differenz deines Unternehmens auf einen Blick – mit Schnellaktionen.",
      },
      { property: "og:title", content: "Dashboard – Keshja Business" },
      { property: "og:description", content: "Die geschäftliche Startseite von Keshja Business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useProfile();
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description={profile ? `Hallo, ${profile.displayName}!` : "Hallo!"}
        />
        <OrgGate>{({ orgId }) => <DashboardView orgId={orgId} />}</OrgGate>
      </div>
    </AppShell>
  );
}

function DashboardView({ orgId }: { orgId: string }) {
  const today = todayIso();
  const [preset, setPreset] = useState<Preset>("monat");
  const [custom, setCustom] = useState<Range>(rangeFor("monat", today));
  const range = rangeFor(preset, today, custom);
  const d = useAnalyticsData(orgId);
  const series = useMemo(() => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - 5);
    return monthlySeries(d.transactions, { from: date.toISOString().slice(0, 10), to: today });
  }, [d.transactions, today]);

  const m = useMemo(() => {
    const cur = actualTotals(d.transactions, range);
    const rcv = receivables(d.invoices, d.payments, today);
    return { cur, rcv };
  }, [d.transactions, d.invoices, d.payments, range.from, range.to, today]);

  if (d.isLoading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Kennzahlen werden geladen …
      </p>
    );
  if (d.error) return <p className="text-sm text-destructive">Daten konnten nicht geladen werden: {d.error.message}</p>;

  const recent = d.transactions.slice(0, 6);
  const quick = "flex flex-col items-center gap-1.5 rounded-2xl bg-card p-3 text-center text-xs font-medium shadow-card transition-colors hover:bg-accent";

  return (
    <div className="space-y-5">
      <PeriodPicker preset={preset} custom={custom} today={today} onChange={(p, c) => (setPreset(p), setCustom(c))} />
      <p className="-mt-2 text-xs text-muted-foreground">
        {formatDate(range.from)} – {formatDate(range.to)} · nur verbuchte (bezahlte) Beträge
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat accent="green" valueColor="income" label="Einnahmen" value={currency(m.cur.income)} />
        <Stat accent="orange" valueColor="expense" label="Ausgaben" value={currency(m.cur.expense)} />
        <Stat
          accent="blue"
          valueColor="balance"
          label="Differenz"
          value={currency(m.cur.balance)}
          tone={m.cur.count === 0 ? "default" : m.cur.balance >= 0 ? "good" : "bad"}
          hint={`${m.cur.count} Buchungen im Zeitraum`}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/kassenbons" search={{ capture: "1" as const }} className={quick}>
          <Camera className="h-5 w-5 text-primary" /> Beleg erfassen
        </Link>
        <Link to="/finanzen" search={{ neu: "1" as const }} className={quick}>
          <Plus className="h-5 w-5 text-primary" /> Buchung erfassen
        </Link>
        <Link to="/rechnungen" search={{ neu: "1" as const }} className={quick}>
          <FileText className="h-5 w-5 text-primary" /> Rechnung erstellen
        </Link>
      </div>

      <section aria-label="Einnahmen und Ausgaben der letzten sechs Monate" className="space-y-3">
        <h2 className="text-sm font-semibold">Einnahmen & Ausgaben · letzte sechs Monate</h2>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickFormatter={(v: string) => new Date(`${v}-01T12:00:00Z`).toLocaleDateString("de-DE", { month: "short" })} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis width={54} tickFormatter={(v: number) => v.toLocaleString("de-DE", { notation: "compact" })} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => currency(v)} labelFormatter={(v: string) => new Date(`${v}-01T12:00:00Z`).toLocaleDateString("de-DE", { month: "long", year: "numeric" })} />
              <Legend />
              <Line type="linear" dataKey="income" name="Einnahmen" stroke="var(--finance-income)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              <Line type="linear" dataKey="expense" name="Ausgaben" stroke="var(--finance-expense)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Letzte Buchungen" action={<Link to="/finanzen" className="text-xs font-medium text-primary">Alle</Link>}>
          {recent.length ? (
            <ul className="divide-y divide-border text-sm">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.description || t.category}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(t.booking_date)} · {t.category}{t.status === "offen" ? " · offen" : ""}
                    </span>
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

        {m.rcv.length > 0 && (
          <Panel title="Offene Rechnungen" action={<Link to="/rechnungen" className="text-xs font-medium text-primary">Alle</Link>}>
            <ul className="divide-y divide-border text-sm">
              {m.rcv.slice(0, 5).map((r) => (
                <li key={r.id} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">
                    {r.number} · {r.customerName}
                    <span className="block text-xs text-muted-foreground">
                      fällig {r.due_date ? formatDate(r.due_date) : "–"}{r.overdue ? " · überfällig" : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${r.overdue ? "text-destructive" : ""}`}>{currency(r.open)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
