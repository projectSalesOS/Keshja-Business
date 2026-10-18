import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Camera, ChartNoAxesColumnIncreasing, FileText, Loader2, PieChart as PieIcon, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { Empty, Panel, PeriodPicker } from "@/components/AnalyticsUi";
import { BalanceChart, categoryColors, ExpenseRing, IncomeExpenseChart, MiniBars } from "@/components/DashboardCharts";
import { useProfile } from "@/hooks/useProfile";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import { rangeFor, receivables, type Preset, type Range } from "@/lib/analytics";
import { dashboardData } from "@/lib/dashboard";
import { todayIso } from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";
import { VoiceBooking } from "@/components/VoiceBooking";
import { TransactionForm } from "@/components/TransactionForm";
import { Button } from "@/components/ui/button";
import type { parseVoiceBooking } from "@/lib/voice-booking";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [
    { title: "Dashboard – KESHJA Business" },
    { name: "description", content: "Gewinn, Einnahmen, Ausgabenkategorien und Verläufe aus deinen tatsächlichen Geschäftsbuchungen." },
    { property: "og:title", content: "Dashboard – KESHJA Business" },
    { property: "og:description", content: "Deine Geschäftsfinanzen mit synchronisierten Zeiträumen und bestätigter Sprachbuchung." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useProfile();
  return <AppShell><OrgGate>{({ orgId }) => <DashboardView orgId={orgId} greeting={profile ? `Hallo, ${profile.displayName}!` : "Hallo!"} />}</OrgGate></AppShell>;
}
function sixMonths(today: string): Range {
  const end = rangeFor("monat", today).to;
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - 5);
  return { from: start.toISOString().slice(0, 10), to: end };
}
function Comparison({ value, previous }: { value: number | null; previous: Range }) {
  return <p className="dash-comparison">{value === null ? "Vergleich nicht berechenbar" : `${value > 0 ? "+" : ""}${value.toLocaleString("de-DE")} %`}<br /><span>ggü. {formatDate(previous.from)} – {formatDate(previous.to)}</span></p>;
}
function DashboardView({ orgId, greeting }: { orgId: string; greeting: string }) {
  const [voiceResult, setVoiceResult] = useState<ReturnType<typeof parseVoiceBooking> | null>(null);
  const today = todayIso();
  const [preset, setPreset] = useState<Preset>("monat");
  const [custom, setCustom] = useState<Range>(rangeFor("monat", today));
  const range = rangeFor(preset, today, custom);
  const d = useAnalyticsData(orgId);
  const m = useMemo(() => dashboardData(d.transactions, range), [d.transactions, range.from, range.to]);
  const outstanding = useMemo(() => receivables(d.invoices, d.payments, today), [d.invoices, d.payments, today]);
  const recent = d.transactions.filter((t) => t.booking_date >= range.from && t.booking_date <= range.to).slice(0, 6);
  if (d.isLoading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Kennzahlen werden geladen …</p>;
  if (d.error) return <p className="text-sm text-destructive">Daten konnten nicht geladen werden: {d.error.message}</p>;
  return <div className="dashboard-view space-y-5 sm:space-y-6">
    <PageHeader title="Dashboard" description={greeting} action={<div className="dash-voice"><VoiceBooking prominent onResult={setVoiceResult} /></div>} />
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <PeriodPicker preset={preset} custom={custom} today={today} onChange={(p, c) => { setPreset(p); setCustom(c); }} />
        <Button variant="outline" onClick={() => { setPreset("frei"); setCustom(sixMonths(today)); }}>6 Monate</Button>
      </div>
      <p className="text-xs text-muted-foreground">{formatDate(range.from)} – {formatDate(range.to)} · bezahlte Buchungen</p>
    </div>

    <section aria-label="Gewinn und Verlust" className="dash-card grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="min-w-0">
        <div className="mb-5 flex items-center gap-3"><span className="dash-icon dash-brand"><ChartNoAxesColumnIncreasing size={21} /></span><h2 className="dash-title">Gewinn / Verlust</h2></div>
        <p data-testid="dashboard-balance" className={`dash-metric dash-profit ${m.totals.balance < 0 ? "dash-expense" : "dash-brand"}`}>{currency(m.totals.balance)}</p>
        <p className="mt-2 mb-3 text-xs text-muted-foreground">{m.totals.count} {m.totals.count === 1 ? "Buchung" : "Buchungen"} im Zeitraum</p>
        <Comparison value={m.deltas.balance} previous={m.previous} />
      </div>
      <div className="min-w-0"><div className="h-40 sm:h-48" aria-label="Monatlicher Gewinnverlauf"><BalanceChart data={m.series} /></div>{!m.totals.count && <p className="text-xs text-muted-foreground">Keine bezahlten Buchungen im Zeitraum.</p>}</div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2">
      {(["income", "expense"] as const).map((type) => <section key={type} className="dash-card" aria-label={type === "income" ? "Einnahmen" : "Ausgaben"}>
        <div className="mb-5 flex items-center gap-3"><span className={`dash-icon dash-${type}`}>{type === "income" ? <ArrowUpRight size={21} /> : <ArrowDownLeft size={21} />}</span><h2 className="dash-title">{type === "income" ? "Einnahmen" : "Ausgaben"}</h2></div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p data-testid={`dashboard-${type}`} className={`dash-metric dash-${type}`}>{currency(m.totals[type])}</p><p className="mt-2 text-xs text-muted-foreground">{type === "income" ? m.incomeCount : m.expenseCount} Buchungen</p></div>
          <Comparison value={m.deltas[type]} previous={m.previous} />
        </div>
        <div className="mt-4 h-24" aria-label={`Monatliche ${type === "income" ? "Einnahmen" : "Ausgaben"}`}><MiniBars data={m.series} type={type} /></div>
      </section>)}
    </div>

    <section className="dash-card" aria-label="Ausgabenübersicht">
      <div className="mb-5 flex items-center gap-3"><span className="dash-icon dash-brand"><PieIcon size={21} /></span><div><h2 className="dash-title">Ausgabenübersicht</h2><p className="mt-1 text-xs text-muted-foreground">Kategorien im gewählten Zeitraum</p></div></div>
      {m.categories.length > 0 ? <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="relative mx-auto h-52 w-52"><ExpenseRing data={m.categories} /><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center"><strong className="break-all text-xl tabular-nums">{currency(m.totals.expense)}</strong><span className="mt-1 text-[11px] text-muted-foreground">Gesamtausgaben</span></div></div>
        <ul data-testid="expense-categories" className="min-w-0">{m.categories.map((c, i) => <li className="dash-category" key={c.name}>
          <svg width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill={categoryColors[i % categoryColors.length]} /></svg>
          <span className="min-w-0 text-sm">{c.name}<span className="ml-2 text-xs text-muted-foreground">{m.totals.expense > 0 ? `${(c.value / m.totals.expense * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %` : "–"}</span></span>
          <strong className="text-sm font-medium tabular-nums">{currency(c.value)}</strong>
        </li>)}</ul>
      </div> : <Empty>Keine bezahlten Ausgaben in diesem Zeitraum.</Empty>}
    </section>

    <section className="dash-card" aria-label="Einnahmen und Ausgaben der letzten sechs Monate">
      <div className="mb-5 flex items-center gap-3"><span className="dash-icon dash-brand"><ChartNoAxesColumnIncreasing size={21} /></span><div><h2 className="dash-title">Einnahmen & Ausgaben</h2><p className="mt-1 text-xs text-muted-foreground">Sechs Monate bis {formatDate(range.to)} · Werte nur im gewählten Zeitraum</p></div></div>
      <div className="h-56 min-w-0 sm:h-64"><IncomeExpenseChart data={m.trend} /></div>
      <p className="mt-3 text-xs text-muted-foreground">Monate außerhalb der Auswahl bleiben ohne Werte. Für den vollständigen Verlauf: 6 Monate.</p>
    </section>

    <div aria-label="Schnellaktionen" className="grid grid-cols-3 gap-3">
      <Link to="/kassenbons" search={{ capture: "1" }} className="dash-card dash-action"><span className="dash-icon dash-brand"><Camera size={21} /></span>Beleg erfassen</Link>
      <Link to="/finanzen" search={{ neu: "1" }} className="dash-card dash-action"><span className="dash-icon dash-brand"><Plus size={21} /></span>Buchung erfassen</Link>
      <Link to="/rechnungen" search={{ neu: "1" }} className="dash-card dash-action"><span className="dash-icon dash-brand"><FileText size={21} /></span>Rechnung erstellen</Link>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Letzte Buchungen" action={<Link to="/finanzen" className="text-xs font-medium text-primary">Alle</Link>}>
        {recent.length ? <ul className="divide-y divide-border text-sm">{recent.map((t) => <li key={t.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block truncate font-medium">{t.description || t.category}</span><span className="text-xs text-muted-foreground">{formatDate(t.booking_date)} · {t.category}{t.status === "offen" ? " · offen" : ""}</span></span><span className={`shrink-0 font-medium tabular-nums dash-${t.type}`}>{t.type === "income" ? "+" : "−"}{currency(t.amount)}</span></li>)}</ul> : <Empty>Keine Buchungen im gewählten Zeitraum.</Empty>}
      </Panel>
      {outstanding.length > 0 && <Panel title="Offene Rechnungen · aktuell" action={<Link to="/rechnungen" className="text-xs font-medium text-primary">Alle</Link>}><ul className="divide-y divide-border text-sm">{outstanding.slice(0, 5).map((r) => <li key={r.id} className="flex justify-between gap-3 py-3"><span className="min-w-0 truncate">{r.number} · {r.customerName}<span className="block text-xs text-muted-foreground">fällig {r.due_date ? formatDate(r.due_date) : "–"}{r.overdue ? " · überfällig" : ""}</span></span><span className={`shrink-0 font-medium tabular-nums ${r.overdue ? "dash-expense" : ""}`}>{currency(r.open)}</span></li>)}</ul></Panel>}
    </div>
    {voiceResult && <TransactionForm orgId={orgId} tx={null} initialVoiceResult={voiceResult} linkedReceipts={new Set(d.transactions.flatMap((t) => t.receipt_id ? [t.receipt_id] : []))} onClose={() => setVoiceResult(null)} />}
  </div>;
}
