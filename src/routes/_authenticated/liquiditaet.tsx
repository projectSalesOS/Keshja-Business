import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Info, Loader2 } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, PageHeader } from "@/components/AppShell";
import { OrgGate, btnSecondary, inputClass } from "@/components/OrgGate";
import { Empty, Panel, Stat, tooltipStyle } from "@/components/AnalyticsUi";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import { addDaysIso, csvDate, downloadCsv, forecast, receivables, toCsv } from "@/lib/analytics";
import { todayIso } from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/liquiditaet")({
  head: () => ({
    meta: [
      { title: "Liquiditätsvorschau – Keshja Business" },
      { name: "description", content: "Prognose erwarteter Zahlungseingänge und geplanter Ausgaben auf Grundlage der erfassten Daten." },
      { property: "og:title", content: "Liquiditätsvorschau – Keshja Business" },
      { property: "og:description", content: "Erwartete Ein- und Auszahlungen der nächsten Wochen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Liquiditätsvorschau" description="Prognose auf Grundlage der erfassten Rechnungen und wiederkehrenden Ausgaben." />
        <OrgGate>{({ orgId }) => <ForecastView orgId={orgId} />}</OrgGate>
      </div>
    </AppShell>
  ),
});

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

function ForecastView({ orgId }: { orgId: string }) {
  const today = todayIso();
  const [days, setDays] = useState<number | "frei">(30);
  const [customTo, setCustomTo] = useState(addDaysIso(today, 120));
  const to = days === "frei" ? (customTo > today ? customTo : today) : addDaysIso(today, days);
  const d = useAnalyticsData(orgId);
  const f = useMemo(
    () => forecast(receivables(d.invoices, d.payments, today), d.items, d.transactions, today, to),
    [d.invoices, d.payments, d.items, d.transactions, today, to],
  );

  if (d.isLoading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Vorschau wird berechnet …</p>;
  if (d.error) return <p className="text-sm text-destructive">Daten konnten nicht geladen werden: {d.error.message}</p>;

  const exportCsv = () =>
    downloadCsv(
      `liquiditaetsvorschau_${today}_${to}.csv`,
      toCsv(
        ["Art", "Datum", "Bezeichnung", "Betrag (EUR)", "Hinweis"],
        [
          ...f.inflows.map((r) => ["Prognose Eingang", csvDate(r.due_date), `${r.number ?? ""} ${r.customerName}`, r.open, r.overdue ? "überfällig" : "offene Forderung"]),
          ...f.outflows.map((o) => ["Prognose Ausgang", csvDate(o.date), o.name, -o.amount, o.pastDue ? "fällig, nicht gebucht" : "wiederkehrend"]),
        ],
      ),
    );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-xl border border-border bg-accent/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          Kein Kontostand: Ohne Bankanbindung zeigt diese Vorschau nur erwartete Veränderungen aus erfassten Daten. Offene Forderungen sind nicht garantiert; bereits gebuchte Ausgaben sind nicht enthalten.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {([30, 60, 90, "frei"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setDays(v)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${days === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
              {v === "frei" ? "Frei" : `${v} Tage`}
            </button>
          ))}
        </div>
        {days === "frei" && (
          <input type="date" aria-label="Bis" min={today} className={`${inputClass} w-auto py-1.5`} value={customTo} onChange={(e) => e.target.value && setCustomTo(e.target.value)} />
        )}
        <span className="text-xs text-muted-foreground">{formatDate(today)} – {formatDate(to)}</span>
        <button type="button" className={`${btnSecondary} ml-auto py-1.5`} onClick={exportCsv}><Download className="h-4 w-4" /> CSV</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Erwartete Eingänge" value={currency(f.expectedInflow)} badge="Prognose" hint="fällig im Zeitraum" />
        <Stat label="Überfällige Forderungen" value={currency(f.overdueInflow)} badge="unsicher" tone={f.overdueInflow ? "bad" : "default"} hint="Eingang ungewiss" />
        <Stat label="Geplante Ausgaben" value={currency(f.plannedOutflow + f.dueUnbookedOutflow)} badge="Prognose" hint={f.dueUnbookedOutflow ? `inkl. ${currency(f.dueUnbookedOutflow)} fällig, nicht gebucht` : "wiederkehrend"} />
        <Stat label="Prognose-Saldo" value={currency(f.net)} badge="Prognose" tone={f.net >= 0 ? "good" : "bad"} hint="Eingänge − Ausgänge" />
      </div>

      <Panel title="Wochenverlauf (Prognose)">
        {f.inflows.length || f.outflows.length ? (
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={f.weeks}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => currency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="inflow" name="Erwartete Eingänge" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" name="Geplante Ausgänge" fill="var(--chart-7)" radius={[4, 4, 0, 0]} />
                <Line dataKey="cumulative" name="Kumuliert" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty>Keine offenen Forderungen oder anstehenden wiederkehrenden Ausgaben im Zeitraum.</Empty>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Erste Woche enthält überfällige Forderungen und fällige, noch nicht gebuchte Ausgaben.</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Erwartete Eingänge">
          {f.inflows.length ? (
            <ul className="divide-y divide-border text-sm">
              {f.inflows.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{r.number} · {r.customerName}<span className="block text-xs text-muted-foreground">{r.overdue ? `überfällig seit ${formatDate(r.due_date!)}` : `fällig ${r.due_date ? formatDate(r.due_date) : "–"}`}{r.paid > 0 ? ` · Rest nach Teilzahlung` : ""}</span></span>
                  <span className={`shrink-0 tabular-nums ${r.overdue ? "text-destructive" : ""}`}>{currency(r.open)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>Keine erwarteten Eingänge.</Empty>}
        </Panel>
        <Panel title="Geplante Ausgaben">
          {f.outflows.length ? (
            <ul className="divide-y divide-border text-sm">
              {f.outflows.map((o) => (
                <li key={`${o.id}${o.date}`} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{o.name}<span className="block text-xs text-muted-foreground">{formatDate(o.date)}{o.pastDue ? " · fällig, noch nicht gebucht" : ""}</span></span>
                  <span className="shrink-0 tabular-nums">−{currency(o.amount)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>Keine geplanten Ausgaben.</Empty>}
        </Panel>
      </div>
    </div>
  );
}
