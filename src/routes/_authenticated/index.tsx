import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Bell, CalendarDays, Camera, ChartNoAxesColumnIncreasing, ChevronRight, FileText, Loader2, PieChart as PieIcon, Plus, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, Logo, PageHeader } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { Empty, Panel, PeriodPicker } from "@/components/AnalyticsUi";
import { categoryColors, ExpenseRing, IncomeExpenseChart, MonthlyBars } from "@/components/DashboardCharts";
import { useProfile } from "@/hooks/useProfile";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import { rangeFor, receivables, type Preset, type Range } from "@/lib/analytics";
import { chartSeries, dashboardData } from "@/lib/dashboard";
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
  return <AppShell dashboard><OrgGate>{({ orgId }) => <DashboardView orgId={orgId} greeting={profile ? `Hallo, ${profile.displayName}!` : "Hallo!"} />}</OrgGate></AppShell>;
}
function sixMonths(today: string): Range {
  const end = rangeFor("monat", today).to;
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - 5);
  return { from: start.toISOString().slice(0, 10), to: end };
}
type ChartPreset = "6m" | "12m" | "jahr" | "quartal";
const CHART_PRESET_LABEL: Record<ChartPreset, string> = { "6m": "Letzte 6 Monate", "12m": "Letzte 12 Monate", jahr: "Aktuelles Kalenderjahr", quartal: "Aktuelles Quartal" };
function chartRangeFor(preset: ChartPreset, today: string): Range {
  if (preset === "jahr") return rangeFor("jahr", today);
  if (preset === "quartal") return rangeFor("quartal", today);
  const end = rangeFor("monat", today).to;
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - (preset === "12m" ? 11 : 5));
  return { from: start.toISOString().slice(0, 10), to: end };
}
function DashboardView({ orgId, greeting }: { orgId: string; greeting: string }) {
  const [voiceResult, setVoiceResult] = useState<ReturnType<typeof parseVoiceBooking> | null>(null);
  const today = todayIso();
  const [preset, setPreset] = useState<Preset>("monat");
  const [custom, setCustom] = useState<Range>(rangeFor("monat", today));
  const range = rangeFor(preset, today, custom);
  const [chartPreset, setChartPreset] = useState<ChartPreset>("6m");
  const chartRange = chartRangeFor(chartPreset, today);
  const d = useAnalyticsData(orgId);
  const m = useMemo(() => dashboardData(d.transactions, range), [d.transactions, range.from, range.to]);
  const chart = useMemo(() => chartSeries(d.transactions, chartRange, today), [d.transactions, chartRange.from, chartRange.to, today]);
  const isFullMonth = range.from.slice(0, 7) === range.to.slice(0, 7) && range.from.endsWith("-01");
  const monthSearch = isFullMonth ? { monat: range.from.slice(0, 7) } : {};
  const outstanding = useMemo(() => receivables(d.invoices, d.payments, today), [d.invoices, d.payments, today]);
  const recent = d.transactions.filter((t) => t.booking_date >= range.from && t.booking_date <= range.to).slice(0, 6);
  if (d.isLoading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Kennzahlen werden geladen …</p>;
  if (d.error) return <p className="text-sm text-destructive">Daten konnten nicht geladen werden: {d.error.message}</p>;
  return <div className="dashboard-view space-y-4">
    <header className="dash-topbar"><Logo /><div className="dash-top-controls"><Button variant="outline" size="icon" aria-label="Zeitraum auswählen" onClick={() => document.getElementById("dashboard-filters")?.scrollIntoView({ behavior: "smooth", block: "center" })}><CalendarDays size={20} /></Button><label className="dash-header-period"><span className="sr-only">Zeitraum im Kopfbereich</span><input type="month" value={range.to.slice(0, 7)} onChange={e => { if (!e.target.value) return; const from = `${e.target.value}-01`; setPreset("frei"); setCustom(rangeFor("monat", from)); }} /></label><details className="dash-notifications"><summary aria-label="Offene Rechnungen"><Bell size={20} />{outstanding.length > 0 && <span className="dash-notification-dot" />}</summary><div className="dash-notification-list"><strong>Offene Rechnungen</strong>{outstanding.length ? outstanding.slice(0, 5).map(r => <Link key={r.id} to="/rechnungen">{r.number} · {currency(r.open)}</Link>) : <p>Keine offenen Rechnungen.</p>}</div></details></div></header>
    <PageHeader title="Dashboard" description={`Deine Geschäftszahlen im Überblick · ${greeting}`} />
    <VoiceBooking dashboard onResult={setVoiceResult} />
    <div id="dashboard-filters" className="dash-filters space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <PeriodPicker preset={preset} custom={custom} today={today} onChange={(p, c) => { setPreset(p); setCustom(c); }} />
        <Button variant="outline" onClick={() => { setPreset("frei"); setCustom(sixMonths(today)); }}>6 Monate</Button>
      </div>
      <p className="text-xs text-muted-foreground">{formatDate(range.from)} – {formatDate(range.to)} · bezahlte Buchungen</p>
    </div>

    <div className="dash-kpis grid grid-cols-2 gap-3" aria-label="Kennzahlen">
      <Link to="/finanzen" search={{ monat: monthParam }} aria-label="Gewinn und Verlust – alle Buchungen anzeigen" className="dash-card dash-kpi dash-profit-card">
        <span className="dash-icon dash-brand"><ChartNoAxesColumnIncreasing size={25} /></span><h2 className="dash-title">Gewinn / Verlust</h2>
        <p data-testid="dashboard-balance" className={`dash-metric ${m.totals.balance < 0 ? "dash-expense" : "dash-brand"}`}>{currency(m.totals.balance)}</p>
        <p className="text-xs text-muted-foreground">{m.totals.count} {m.totals.count === 1 ? "Buchung" : "Buchungen"} im Zeitraum</p>
      </Link>
      {(["income", "expense"] as const).map((type) => <Link key={type} to="/finanzen" search={{ typ: type, monat: monthParam }} className={`dash-card dash-kpi dash-${type}-card`} aria-label={`${type === "income" ? "Einnahmen" : "Ausgaben"} – Buchungen anzeigen`}>
        <span className={`dash-icon dash-${type}`}>{type === "income" ? <ArrowUpRight size={25} /> : <ArrowDownRight size={25} />}</span>
        <h2 className="dash-title">{type === "income" ? "Einnahmen" : "Ausgaben"}</h2>
        <p data-testid={`dashboard-${type}`} className={`dash-metric dash-${type}`}>{currency(m.totals[type])}</p>
        <p className="text-xs text-muted-foreground">{type === "income" ? m.incomeCount : m.expenseCount} Buchungen</p>
      </Link>)}
    </div>

    <section className="dash-card dash-secondary-section" aria-label="Ausgabenübersicht">
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

    <section className="dash-card" aria-label="Einnahmen und Ausgaben im Diagrammzeitraum">
      <div className="dash-chart-heading"><span className="dash-icon dash-brand"><TrendingUp size={21} /></span><div><h2 className="dash-title">Einnahmen & Ausgaben</h2><p className="mt-1 text-xs text-muted-foreground">{formatDate(chartRange.from)} – {formatDate(chartRange.to)}</p></div>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"><span className="sr-only">Diagrammzeitraum</span><select className="h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground" value={chartPreset} onChange={(e) => setChartPreset(e.target.value as ChartPreset)} aria-label="Diagrammzeitraum">{(["6m", "12m", "jahr", "quartal"] as const).map((p) => <option key={p} value={p}>{CHART_PRESET_LABEL[p]}</option>)}</select></label></div>
      <div className="dash-line-chart min-w-0"><IncomeExpenseChart data={chart} /></div>
    </section>

    <section className="dash-card" aria-label="Monatliche Einnahmen und Ausgaben als Balken">
      <div className="dash-chart-heading"><span className="dash-icon dash-brand"><ChartNoAxesColumnIncreasing size={21} /></span><div><h2 className="dash-title">Monatliche Einnahmen & Ausgaben</h2><p className="mt-1 text-xs text-muted-foreground">{CHART_PRESET_LABEL[chartPreset]} · {formatDate(chartRange.from)} – {formatDate(chartRange.to)}</p></div></div>
      <div className="dash-bar-chart min-w-0"><MonthlyBars data={chart} /></div>
    </section>

    <div aria-label="Schnellaktionen" className="grid grid-cols-3 gap-3">
      <Link to="/kassenbons" search={{ capture: "1" }} className="dash-card dash-action"><span className="dash-icon dash-brand"><Camera size={21} /></span><span>Beleg erfassen<small>Foto oder Galerie</small></span><ChevronRight size={16} /></Link>
      <Link to="/finanzen" search={{ neu: "1" }} className="dash-card dash-action"><span className="dash-icon dash-brand"><Plus size={21} /></span><span>Buchung erfassen<small>Einnahme oder Ausgabe</small></span><ChevronRight size={16} /></Link>
      <Link to="/rechnungen" search={{ neu: "1" }} className="dash-card dash-action"><span className="dash-icon dash-brand"><FileText size={21} /></span><span>Rechnung erstellen<small>Schnell & einfach</small></span><ChevronRight size={16} /></Link>
    </div>
    <div className="dash-secondary-section grid gap-6 lg:grid-cols-2">
      <Panel title="Letzte Buchungen" action={<Link to="/finanzen" className="text-xs font-medium text-primary">Alle</Link>}>
        {recent.length ? <ul className="divide-y divide-border text-sm">{recent.map((t) => <li key={t.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block truncate font-medium">{t.description || t.category}</span><span className="text-xs text-muted-foreground">{formatDate(t.booking_date)} · {t.category}{t.status === "offen" ? " · offen" : ""}</span></span><span className={`shrink-0 font-medium tabular-nums dash-${t.type}`}>{t.type === "income" ? "+" : "−"}{currency(t.amount)}</span></li>)}</ul> : <Empty>Keine Buchungen im gewählten Zeitraum.</Empty>}
      </Panel>
      {outstanding.length > 0 && <Panel title="Offene Rechnungen · aktuell" action={<Link to="/rechnungen" className="text-xs font-medium text-primary">Alle</Link>}><ul className="divide-y divide-border text-sm">{outstanding.slice(0, 5).map((r) => <li key={r.id} className="flex justify-between gap-3 py-3"><span className="min-w-0 truncate">{r.number} · {r.customerName}<span className="block text-xs text-muted-foreground">fällig {r.due_date ? formatDate(r.due_date) : "–"}{r.overdue ? " · überfällig" : ""}</span></span><span className={`shrink-0 font-medium tabular-nums ${r.overdue ? "dash-expense" : ""}`}>{currency(r.open)}</span></li>)}</ul></Panel>}
    </div>
    {voiceResult && <TransactionForm orgId={orgId} tx={null} initialVoiceResult={voiceResult} linkedReceipts={new Set(d.transactions.flatMap((t) => t.receipt_id ? [t.receipt_id] : []))} onClose={() => setVoiceResult(null)} />}
  </div>;
}
