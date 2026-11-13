import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Bell, Camera, ChartNoAxesColumnIncreasing, Check, ChevronRight, FileSignature, FileText, Loader2, PieChart as PieIcon, Plus, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AppShell } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { Empty, Panel, PeriodPicker } from "@/components/AnalyticsUi";
import { categoryColors, ExpenseRing, IncomeExpenseChart, MonthlyBars } from "@/components/DashboardCharts";
import { useProfile, type Profile } from "@/hooks/useProfile";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import { rangeFor, receivables, type Preset, type Range } from "@/lib/analytics";
import { chartSeries, dashboardData } from "@/lib/dashboard";
import { todayIso } from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";
import { VoiceBooking } from "@/components/VoiceBooking";
import { TransactionForm } from "@/components/TransactionForm";
import assistantRobot from "@/assets/business-assistant-robot.png";
import type { parseVoiceBooking } from "@/lib/voice-booking";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
  return <AppShell dashboard><OrgGate>{({ orgId }) => <DashboardView orgId={orgId} profile={profile ?? null} />}</OrgGate></AppShell>;
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

/** Tageszeitabhängige Begrüßung mit dem tatsächlich angemeldeten Namen. */
function greetingFor(profile: Profile | null): string {
  const hour = new Date().getHours();
  const daypart = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const firstName = profile?.displayName.trim().split(/\s+/)[0];
  return firstName ? `${daypart}, ${firstName}!` : `${daypart}!`;
}

function DeltaBadge({ value, tone }: { value: number | null; tone: "onBrand" | "income" | "expense" }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span className={`dash-delta dash-delta-${tone}`}>
      {up ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
      {`${up ? "+" : "−"}${Math.abs(value).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % zum Vormonat`}
    </span>
  );
}

function DashboardView({ orgId, profile }: { orgId: string; profile: Profile | null }) {
  const [voiceResult, setVoiceResult] = useState<ReturnType<typeof parseVoiceBooking> | null>(null);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setHeaderSlot(document.getElementById("app-header-extras")); }, []);
  const [doneTasks, setDoneTasks] = useState<ReadonlySet<string>>(new Set());
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
  const openBookings = d.transactions.filter((t) => t.status === "offen").length;
  const greeting = greetingFor(profile);

  const tasks = [
    { key: "invoices", label: outstanding.length === 1 ? "1 offene Rechnung" : `${outstanding.length} offene Rechnungen`, count: outstanding.length, to: "/rechnungen" as const },
    { key: "bookings", label: openBookings === 1 ? "1 offene Buchung prüfen" : `${openBookings} offene Buchungen prüfen`, count: openBookings, to: "/finanzen" as const },
    { key: "report", label: "Umsatzübersicht erstellen", count: null, to: "/auswertungen" as const },
  ];
  const toggleTask = (key: string) => setDoneTasks((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  if (d.isLoading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Kennzahlen werden geladen …</p>;
  if (d.error) return <p className="text-sm text-destructive">Daten konnten nicht geladen werden: {d.error.message}</p>;
  return <div className="dashboard-view">
    <header className="dash-greet">
      <div className="min-w-0">
        <h1>{greeting} <span aria-hidden="true">👋</span></h1>
        <p>Deine Geschäftszahlen im Überblick</p>
      </div>
      <div className="dash-top-controls">
        <div className="dash-qa" data-tip="Spracheingabe starten"><VoiceBooking orgId={orgId} compact onResult={setVoiceResult} /><span className="dash-qa-label">Sprache</span></div>
        <div className="dash-qa" data-tip="KI-Assistent öffnen"><button type="button" className="dash-round-btn dash-ai-btn" aria-label="KI-Assistent öffnen" onClick={() => { const el = document.getElementById("dash-assistant"); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.focus({ preventScroll: true }); }}><Sparkles size={19} /></button><span className="dash-qa-label">KI-Assistent</span></div>
        <div className="dash-qa" data-tip="Berichte erstellen"><Link to="/auswertungen" className="dash-round-btn dash-report-btn" aria-label="Berichte erstellen"><ChartNoAxesColumnIncreasing size={19} /></Link><span className="dash-qa-label">Berichte</span></div>
      </div>
      {headerSlot && createPortal(<div className="dash-header-extras">
        <details className="dash-notifications"><summary aria-label="Offene Rechnungen"><Bell size={18} />{outstanding.length > 0 && <span className="dash-notification-dot" />}</summary><div className="dash-notification-list"><strong>Offene Rechnungen</strong>{outstanding.length ? outstanding.slice(0, 5).map(r => <Link key={r.id} to="/rechnungen">{r.number} · {currency(r.open)}</Link>) : <p>Keine offenen Rechnungen.</p>}</div></details>
        <span className="dash-avatar" title={profile?.displayName ?? ""} aria-label={`Angemeldet als ${profile?.displayName ?? ""}`}>{(profile?.displayName.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?")}</span>
      </div>, headerSlot)}
    </header>

    <div id="dashboard-filters" className="dash-filters">
      <PeriodPicker preset={preset} custom={custom} today={today} onChange={(p, c) => { setPreset(p); setCustom(c); }} />
      <p className="text-xs text-muted-foreground">{formatDate(range.from)} – {formatDate(range.to)} · bezahlte Buchungen</p>
    </div>

    {/* Mobile Reihenfolge = DOM-Reihenfolge; Desktop-Anordnung nur über grid-template-areas. */}
    <div className="dash-layout">
          <Link to="/finanzen" search={monthSearch} aria-label="Gewinn und Verlust – alle Buchungen anzeigen" className="dash-card dash-kpi dash-profit-card dash-area-profit">
            <span className="dash-kpi-head"><h2 className="dash-title">Gewinn / Verlust</h2><span className="dash-icon tone-violet"><ChartNoAxesColumnIncreasing size={22} /></span></span>
            <p data-testid="dashboard-balance" className="dash-metric">{currency(m.totals.balance)}</p>
            <span className="dash-kpi-foot">
              <DeltaBadge value={m.deltas.balance} tone="onBrand" />
              <span className="dash-kpi-sub">{m.totals.count} {m.totals.count === 1 ? "Buchung" : "Buchungen"} im Zeitraum</span>
            </span>
          </Link>
          {(["income", "expense"] as const).map((type) => <Link key={type} to="/finanzen" search={{ typ: type, ...monthSearch }} className={`dash-card dash-kpi dash-${type}-card dash-area-${type}`} aria-label={`${type === "income" ? "Einnahmen" : "Ausgaben"} – Buchungen anzeigen`}>
            <span className="dash-kpi-head"><h2 className="dash-title">{type === "income" ? "Einnahmen" : "Ausgaben"}</h2><span className={`dash-icon ${type === "income" ? "tone-green" : "tone-rose"}`}>{type === "income" ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}</span></span>
            <p data-testid={`dashboard-${type}`} className={`dash-metric dash-${type}`}>{currency(m.totals[type])}</p>
            <span className="dash-kpi-foot">
              <DeltaBadge value={m.deltas[type]} tone={type} />
              <span className="dash-kpi-sub">{type === "income" ? m.incomeCount : m.expenseCount} Buchungen</span>
            </span>
          </Link>)}

      <section aria-label="Schnellzugriff" className="dash-area-quick">
        <h2 className="dash-section-title">Schnellzugriff</h2>
        <div className="dash-quick">
        <Link to="/kassenbons" search={{ capture: "1" }} className="dash-card dash-action"><span className="dash-icon tone-blue"><Camera size={22} /></span><span>Beleg scannen<small>Foto oder Galerie</small></span><ChevronRight size={16} /></Link>
        <Link to="/finanzen" search={{ neu: "1" }} className="dash-card dash-action"><span className="dash-icon tone-blue"><Plus size={22} /></span><span>Neue Buchung<small>Einnahme oder Ausgabe</small></span><ChevronRight size={16} /></Link>
        <Link to="/rechnungen" search={{ neu: "1" }} className="dash-card dash-action"><span className="dash-icon tone-amber"><FileText size={22} /></span><span>Rechnung erstellen<small>Schnell & einfach</small></span><ChevronRight size={16} /></Link>
        <Link to="/angebote" search={{ neu: "1" }} className="dash-card dash-action"><span className="dash-icon tone-teal"><FileSignature size={22} /></span><span>Angebot erstellen<small>Für deine Kunden</small></span><ChevronRight size={16} /></Link>
      </div>
      </section>

        <aside id="dash-assistant" tabIndex={-1} className="dash-card dash-assistant dash-area-assistant" aria-label="Business-Assistent">
        <div className="dash-assistant-intro">
          <img src={assistantRobot} width={816} height={816} loading="lazy" alt="KESHJA Business-Assistent" className="dash-assistant-robot" />
          <div>
            <h2 className="dash-title"><Sparkles size={15} aria-hidden="true" /> Business-Assistent</h2>
            <p className="dash-assistant-text">Ich unterstütze dich bei deinen Aufgaben.</p>
          </div>
        </div>
        <nav className="dash-assistant-actions" aria-label="Assistentenaktionen">
          <Link to="/rechnungen" className="dash-assistant-action"><span className="dash-assistant-icon tone-amber"><FileText size={17} /></span><span>Offene Rechnungen prüfen</span><ChevronRight size={16} /></Link>
          <Link to="/finanzen" search={{ neu: "1" }} className="dash-assistant-action"><span className="dash-assistant-icon tone-blue"><Plus size={17} /></span><span>Neue Buchung erfassen</span><ChevronRight size={16} /></Link>
          <Link to="/auswertungen" className="dash-assistant-action"><span className="dash-assistant-icon tone-indigo"><ChartNoAxesColumnIncreasing size={17} /></span><span>Monatsübersicht anzeigen</span><ChevronRight size={16} /></Link>
        </nav>
      </aside>

            <section className="dash-card dash-chart-card dash-area-chart" aria-label="Umsatzentwicklung als Balkendiagramm">
            <div className="dash-chart-heading"><span className="dash-icon tone-indigo"><TrendingUp size={21} /></span><div><h2 className="dash-title">Umsatzentwicklung (6 Monate)</h2><p className="mt-1 text-xs text-muted-foreground">{CHART_PRESET_LABEL[chartPreset]} · {formatDate(chartRange.from)} – {formatDate(chartRange.to)}</p></div>
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"><span className="sr-only">Diagrammzeitraum</span><select className="h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground" value={chartPreset} onChange={(e) => setChartPreset(e.target.value as ChartPreset)} aria-label="Diagrammzeitraum">{(["6m", "12m", "jahr", "quartal"] as const).map((p) => <option key={p} value={p}>{CHART_PRESET_LABEL[p]}</option>)}</select></label></div>
            <div className="dash-bar-chart min-w-0"><MonthlyBars data={chart} /></div>
          </section>
          <section className="dash-card dash-tasks dash-area-tasks" aria-label="Meine Aufgaben">
            <div className="dash-chart-heading"><div><h2 className="dash-title">Meine Aufgaben</h2><p className="mt-1 text-xs text-muted-foreground">Aus deinen aktuellen Daten</p></div></div>
            <ul>
              {tasks.map((task) => {
                const done = doneTasks.has(task.key);
                return <li key={task.key} className="dash-task" data-done={done}>
                  <button type="button" className="dash-task-check" aria-pressed={done} aria-label={`${task.label} – als erledigt markieren`} onClick={() => toggleTask(task.key)}>{done && <Check size={14} strokeWidth={3} />}</button>
                  <Link to={task.to} className="dash-task-label">{task.label}</Link>
                  {task.count !== null && task.count > 0 && <span className="dash-task-count">{task.count}</span>}
                </li>;
              })}
            </ul>
          </section>
    </div>

    <section className="dash-card dash-secondary-section" aria-label="Einnahmen und Ausgaben im Diagrammzeitraum">
      <div className="dash-chart-heading"><span className="dash-icon tone-indigo"><TrendingUp size={21} /></span><div><h2 className="dash-title">Einnahmen & Ausgaben</h2><p className="mt-1 text-xs text-muted-foreground">{formatDate(chartRange.from)} – {formatDate(chartRange.to)}</p></div></div>
      <div className="dash-line-chart min-w-0"><IncomeExpenseChart data={chart} /></div>
    </section>

    <section className="dash-card dash-secondary-section" aria-label="Ausgabenübersicht">
      <div className="mb-5 flex items-center gap-3"><span className="dash-icon tone-rose"><PieIcon size={21} /></span><div><h2 className="dash-title">Ausgabenübersicht</h2><p className="mt-1 text-xs text-muted-foreground">Kategorien im gewählten Zeitraum</p></div></div>
      {m.categories.length > 0 ? <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="relative mx-auto h-52 w-52"><ExpenseRing data={m.categories} /><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center"><strong className="break-all text-xl tabular-nums">{currency(m.totals.expense)}</strong><span className="mt-1 text-[11px] text-muted-foreground">Gesamtausgaben</span></div></div>
        <ul data-testid="expense-categories" className="min-w-0">{m.categories.map((c, i) => <li className="dash-category" key={c.name}>
          <svg width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill={categoryColors[i % categoryColors.length]} /></svg>
          <span className="min-w-0 text-sm">{c.name}<span className="ml-2 text-xs text-muted-foreground">{m.totals.expense > 0 ? `${(c.value / m.totals.expense * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %` : "–"}</span></span>
          <strong className="text-sm font-medium tabular-nums">{currency(c.value)}</strong>
        </li>)}</ul>
      </div> : <Empty>Keine bezahlten Ausgaben in diesem Zeitraum.</Empty>}
    </section>

    <div className="dash-secondary-section grid gap-6 lg:grid-cols-2">
      <Panel title="Letzte Buchungen" action={<Link to="/finanzen" className="text-xs font-medium text-primary">Alle</Link>}>
        {recent.length ? <ul className="divide-y divide-border text-sm">{recent.map((t) => <li key={t.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block truncate font-medium">{t.description || t.category}</span><span className="text-xs text-muted-foreground">{formatDate(t.booking_date)} · {t.category}{t.status === "offen" ? " · offen" : ""}</span></span><span className={`shrink-0 font-medium tabular-nums dash-${t.type}`}>{t.type === "income" ? "+" : "−"}{currency(t.amount)}</span></li>)}</ul> : <Empty>Keine Buchungen im gewählten Zeitraum.</Empty>}
      </Panel>
      {outstanding.length > 0 && <Panel title="Offene Rechnungen · aktuell" action={<Link to="/rechnungen" className="text-xs font-medium text-primary">Alle</Link>}><ul className="divide-y divide-border text-sm">{outstanding.slice(0, 5).map((r) => <li key={r.id} className="flex justify-between gap-3 py-3"><span className="min-w-0 truncate">{r.number} · {r.customerName}<span className="block text-xs text-muted-foreground">fällig {r.due_date ? formatDate(r.due_date) : "–"}{r.overdue ? " · überfällig" : ""}</span></span><span className={`shrink-0 font-medium tabular-nums ${r.overdue ? "dash-expense" : ""}`}>{currency(r.open)}</span></li>)}</ul></Panel>}
    </div>
    {voiceResult && <TransactionForm orgId={orgId} tx={null} initialVoiceResult={voiceResult} linkedReceipts={new Set(d.transactions.flatMap((t) => t.receipt_id ? [t.receipt_id] : []))} onClose={() => setVoiceResult(null)} />}
  </div>;
}
