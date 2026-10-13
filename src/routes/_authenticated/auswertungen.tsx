import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, PageHeader } from "@/components/AppShell";
import { OrgGate, btnSecondary, inputClass } from "@/components/OrgGate";
import { Empty, Panel, PeriodPicker, Stat, tooltipStyle } from "@/components/AnalyticsUi";
import { useAnalyticsData } from "@/hooks/useAnalytics";
import { useOrganization } from "@/hooks/useOrganization";
import {
  actualTotals,
  byCategory,
  byCustomer,
  csvDate,
  downloadCsv,
  monthLabel,
  monthlySeries,
  plannedExpenses,
  rangeFor,
  receivables,
  sumReceivables,
  toCsv,
  type Preset,
  type Range,
} from "@/lib/analytics";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, todayIso } from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/auswertungen")({
  head: () => ({
    meta: [
      { title: "Auswertungen & Berichte – Keshja Business" },
      { name: "description", content: "Einnahmen, Ausgaben, Saldo, Kategorien, Kunden und Forderungen auswerten; Bericht als PDF und CSV." },
      { property: "og:title", content: "Auswertungen & Berichte – Keshja Business" },
      { property: "og:description", content: "Geschäftsauswertungen mit PDF- und CSV-Export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Auswertungen" description="Entwicklung, Kategorien, Kunden und Forderungen – mit Bericht und Export." />
        <OrgGate>{({ orgId }) => <ReportsView orgId={orgId} />}</OrgGate>
      </div>
    </AppShell>
  ),
});

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const short = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

function ReportsView({ orgId }: { orgId: string }) {
  const today = todayIso();
  const [preset, setPreset] = useState<Preset>("jahr");
  const [custom, setCustom] = useState<Range>(rangeFor("jahr", today));
  const [category, setCategory] = useState("");
  const [customerId, setCustomerId] = useState("");
  const range = rangeFor(preset, today, custom);
  const d = useAnalyticsData(orgId);
  const { data: org } = useOrganization();

  const r = useMemo(() => {
    const f = { category: category || undefined, customerId: customerId || undefined };
    const rcv = receivables(d.invoices, d.payments, today, customerId || undefined);
    return {
      totals: actualTotals(d.transactions, range, f),
      months: monthlySeries(d.transactions, range, f),
      expenseCats: byCategory(d.transactions, range, "expense", f),
      incomeCats: byCategory(d.transactions, range, "income", f),
      customers: byCustomer(d.invoices, d.payments, range, today).filter((c) => !customerId || c.id === customerId),
      rcv,
      rcvSum: sumReceivables(rcv),
      planned: plannedExpenses(d.items, d.transactions, range, today).filter((p) => p.date > today),
    };
  }, [d.transactions, d.invoices, d.payments, d.items, range.from, range.to, category, customerId, today]);

  if (d.isLoading)
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Auswertungen werden geladen …</p>;
  if (d.error) return <p className="text-sm text-destructive">Daten konnten nicht geladen werden: {d.error.message}</p>;

  const tag = `${range.from}_${range.to}`;
  const exportTx = () => {
    const rows = d.transactions
      .filter((t) => t.booking_date >= range.from && t.booking_date <= range.to && (!category || t.category === category) && (!customerId || t.customer_id === customerId))
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date));
    const names = new Map(d.customers.map((c) => [c.id, c.name]));
    downloadCsv(
      `buchungen_${tag}.csv`,
      toCsv(
        ["Datum", "Art", "Kategorie", "Beschreibung", "Kunde", "Status", "Betrag (EUR)", "Vorzeichenbehaftet (EUR)"],
        rows.map((t) => [csvDate(t.booking_date), t.type === "income" ? "Einnahme" : "Ausgabe", t.category, t.description, t.customer_id ? names.get(t.customer_id) : "", t.status, t.amount, t.type === "income" ? t.amount : -t.amount]),
      ),
    );
  };
  const exportMonths = () =>
    downloadCsv(`monatsuebersicht_${tag}.csv`, toCsv(["Monat", "Einnahmen (EUR)", "Ausgaben (EUR)", "Saldo (EUR)", "Saldo kumuliert (EUR)", "Buchungen"], r.months.map((m) => [m.month, m.income, m.expense, m.balance, m.cumulative, m.count])));
  const exportRcv = () =>
    downloadCsv(`forderungen_${today}.csv`, toCsv(["Rechnung", "Kunde", "Rechnungsdatum", "Fällig", "Betrag (EUR)", "Bezahlt (EUR)", "Offen (EUR)", "Status"], r.rcv.map((x) => [x.number, x.customerName, csvDate(x.doc_date), csvDate(x.due_date), x.total, x.paid, x.open, x.overdue ? "überfällig" : "offen"])));
  const exportPdf = async () => {
    const o = org?.organization;
    if (!o) return;
    try {
      const { buildReportPdf } = await import("@/lib/reportPdf");
      const all = { ...r, rcv: receivables(d.invoices, d.payments, today) };
      buildReportPdf({
        company: o,
        range,
        createdOn: today,
        totals: actualTotals(d.transactions, range),
        months: monthlySeries(d.transactions, range),
        expenseCategories: byCategory(d.transactions, range, "expense"),
        incomeCategories: byCategory(d.transactions, range, "income"),
        receivables: all.rcv,
        recurring: d.items,
        planned: r.planned,
      }).save(`geschaeftsbericht_${tag}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF konnte nicht erstellt werden.");
    }
  };

  const filtered = !!(category || customerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodPicker preset={preset} custom={custom} today={today} onChange={(p, c) => (setPreset(p), setCustom(c))} />
        <div className="flex flex-wrap gap-2">
          <select aria-label="Kategorie" className={`${inputClass} w-auto py-1.5`} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Alle Kategorien</option>
            <optgroup label="Einnahmen">{INCOME_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</optgroup>
            <optgroup label="Ausgaben">{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</optgroup>
          </select>
          <select aria-label="Kunde" className={`${inputClass} w-auto py-1.5`} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Alle Kunden</option>
            {d.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        {formatDate(range.from)} – {formatDate(range.to)}{filtered ? " · gefiltert" : ""} · Ist-Werte aus bezahlten Buchungen
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Einnahmen" value={currency(r.totals.income)} badge="Ist" />
        <Stat label="Ausgaben" value={currency(r.totals.expense)} badge="Ist" />
        <Stat label="Saldo" value={currency(r.totals.balance)} tone={!r.totals.count ? "default" : r.totals.balance >= 0 ? "good" : "bad"} hint={`${r.totals.count} Buchungen`} />
        <Stat label="Offen / überfällig" value={currency(r.rcvSum.openTotal)} badge="erwartet" hint={`davon überfällig ${currency(r.rcvSum.overdueTotal)}`} />
      </div>

      <Panel title="Berichte & Export" action={<span className="text-xs text-muted-foreground">nur aktuelles Unternehmen</span>}>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={exportPdf}><FileDown className="h-4 w-4" /> Geschäftsbericht (PDF)</button>
          <button type="button" className={btnSecondary} onClick={exportTx}><Download className="h-4 w-4" /> Buchungen (CSV)</button>
          <button type="button" className={btnSecondary} onClick={exportMonths}><Download className="h-4 w-4" /> Monatsübersicht (CSV)</button>
          <button type="button" className={btnSecondary} onClick={exportRcv}><Download className="h-4 w-4" /> Forderungen (CSV)</button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Der PDF-Bericht umfasst das gesamte Unternehmen im Zeitraum (ohne Filter). Betriebliche Übersicht – ersetzt keine steuerliche Prüfung.</p>
      </Panel>

      {r.totals.count === 0 ? (
        <Panel title="Entwicklung"><Empty>Keine bezahlten Buchungen im gewählten Zeitraum.</Empty></Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Einnahmen und Ausgaben je Monat">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={r.months.map((m) => ({ ...m, label: monthLabel(m.month) }))}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis tick={axis} tickFormatter={short} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => currency(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Einnahmen" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Ausgaben" fill="var(--chart-7)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Saldoentwicklung (kumuliert)">
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={r.months.map((m) => ({ ...m, label: monthLabel(m.month) }))}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis tick={axis} tickFormatter={short} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => currency(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="cumulative" name="Saldo kumuliert" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <Line dataKey="balance" name="Monatssaldo" stroke="var(--chart-3)" strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Ausgaben nach Kategorie"><CatTable rows={r.expenseCats} /></Panel>
        <Panel title="Einnahmen nach Kategorie"><CatTable rows={r.incomeCats} /></Panel>
      </div>

      <Panel title="Monatsübersicht">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Monat</th><th className="text-right">Einnahmen</th><th className="text-right">Ausgaben</th><th className="text-right">Saldo</th><th className="text-right">kumuliert</th></tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {r.months.map((m) => (
                <tr key={m.month} className={m.count ? "" : "text-muted-foreground"}>
                  <td className="py-1.5">{monthLabel(m.month)}</td>
                  <td className="text-right">{m.count ? currency(m.income) : "–"}</td>
                  <td className="text-right">{m.count ? currency(m.expense) : "–"}</td>
                  <td className="text-right">{m.count ? currency(m.balance) : "–"}</td>
                  <td className="text-right">{currency(m.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">„–“ = keine Buchungen im Monat (kein Verlust).</p>
        </div>
      </Panel>

      <Panel title="Auswertung nach Kunde">
        {r.customers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-2">Kunde</th><th className="text-right">Rechnungsumsatz</th><th className="text-right">Zahlungseingang</th><th className="text-right">Offen (heute)</th></tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {r.customers.map((c) => (
                  <tr key={c.id}><td className="py-1.5">{c.name}</td><td className="text-right">{currency(c.invoiced)}</td><td className="text-right">{currency(c.received)}</td><td className="text-right">{currency(c.open)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">Rechnungsumsatz = ausgestellte, nicht stornierte Rechnungen nach Rechnungsdatum (keine Einnahme). Zahlungseingang = erfasste Zahlungen im Zeitraum.</p>
          </div>
        ) : (
          <Empty>Keine Rechnungen oder Zahlungen mit Kundenbezug im Zeitraum.</Empty>
        )}
      </Panel>

      <Panel title="Offene und überfällige Forderungen (Stand heute)">
        {r.rcv.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-2">Rechnung</th><th>Kunde</th><th>Fällig</th><th className="text-right">Bezahlt</th><th className="text-right">Offen</th></tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {r.rcv.map((x) => (
                  <tr key={x.id} className={x.overdue ? "text-destructive" : ""}>
                    <td className="py-1.5">{x.number}</td><td>{x.customerName}</td>
                    <td>{x.due_date ? formatDate(x.due_date) : "–"}{x.overdue ? ` (${x.daysOverdue} T.)` : ""}</td>
                    <td className="text-right">{currency(x.paid)}</td><td className="text-right font-semibold">{currency(x.open)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Keine offenen Forderungen.</Empty>
        )}
      </Panel>
    </div>
  );
}

function CatTable({ rows }: { rows: { name: string; value: number }[] }) {
  if (!rows.length) return <Empty>Keine Buchungen.</Empty>;
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.name}>
          <div className="flex justify-between gap-2"><span className="truncate">{r.name}</span><span className="tabular-nums">{currency(r.value)}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / total) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
