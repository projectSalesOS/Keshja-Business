import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { money } from "@/lib/documentPdf";
import { csvDate, monthLabel, type ActualTotals, type MonthRow, type PlannedExpense, type Range, type Receivable } from "@/lib/analytics";

export type ReportInput = {
  company: { name: string; street?: string | null; postal_code?: string | null; city?: string | null; tax_number?: string | null; vat_id?: string | null };
  range: Range;
  createdOn: string;
  totals: ActualTotals;
  months: MonthRow[];
  expenseCategories: { name: string; value: number }[];
  incomeCategories: { name: string; value: number }[];
  receivables: Receivable[];
  recurring: { name: string; category: string; amount: number; interval: string; active: boolean }[];
  planned: PlannedExpense[];
};

type Last = { lastAutoTable?: { finalY: number } };

/** Geschäftsbericht (betriebliche Übersicht, kein Steuerdokument). */
export function buildReportPdf(r: ReportInput): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const L = 15;
  let y = 18;
  const next = (gap = 8) => ((pdf as unknown as Last).lastAutoTable?.finalY ?? y) + gap;
  const title = (t: string) => {
    if (y > 260) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFont("helvetica", "bold").setFontSize(11).text(t, L, y);
    y += 3;
  };
  const table = (head: string[], body: (string | number)[][], right: number[] = []) => {
    autoTable(pdf, {
      startY: y,
      head: [head],
      body: body.length ? body.map((row) => row.map(String)) : [[{ content: "Keine Daten im Zeitraum", colSpan: head.length }] as never],
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [40, 90, 95] },
      columnStyles: Object.fromEntries(right.map((i) => [i, { halign: "right" as const }])),
      margin: { left: L, right: L },
    });
    y = next();
  };

  pdf.setFont("helvetica", "bold").setFontSize(16).text("Geschäftsbericht", L, y);
  y += 7;
  pdf.setFont("helvetica", "normal").setFontSize(9);
  const c = r.company;
  pdf.text(
    [
      [c.name, [c.street, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")].filter(Boolean).join(" – "),
      [c.tax_number && `Steuernr.: ${c.tax_number}`, c.vat_id && `USt-IdNr.: ${c.vat_id}`].filter(Boolean).join("  |  "),
      `Berichtszeitraum: ${csvDate(r.range.from)} – ${csvDate(r.range.to)}   |   Erstellt am ${csvDate(r.createdOn)}`,
    ].filter(Boolean),
    L,
    y,
  );
  y += 16;

  title("1. Zusammenfassung (tatsächliche, bezahlte Buchungen)");
  table(["Kennzahl", "Betrag"], [
    ["Einnahmen", money(r.totals.income)],
    ["Ausgaben", money(r.totals.expense)],
    ["Saldo", money(r.totals.balance)],
    ["Anzahl Buchungen", r.totals.count],
  ], [1]);

  title("2. Monatsübersicht");
  table(["Monat", "Einnahmen", "Ausgaben", "Saldo", "Saldo kumuliert"], r.months.map((m) => [monthLabel(m.month), money(m.income), money(m.expense), money(m.balance), money(m.cumulative)]), [1, 2, 3, 4]);

  title("3. Ausgaben nach Kategorie");
  table(["Kategorie", "Betrag"], r.expenseCategories.map((x) => [x.name, money(x.value)]), [1]);
  title("4. Einnahmen nach Kategorie");
  table(["Kategorie", "Betrag"], r.incomeCategories.map((x) => [x.name, money(x.value)]), [1]);

  title("5. Offene und überfällige Forderungen (Stand heute)");
  table(
    ["Rechnung", "Kunde", "Fällig", "Offen", "Status"],
    r.receivables.map((x) => [x.number ?? "", x.customerName, csvDate(x.due_date), money(x.open), x.overdue ? `überfällig (${x.daysOverdue} T.)` : "offen"]),
    [3],
  );

  title("6. Wiederkehrende Ausgaben");
  table(["Bezeichnung", "Kategorie", "Intervall", "Betrag", "Aktiv"], r.recurring.map((x) => [x.name, x.category, x.interval, money(x.amount), x.active ? "ja" : "nein"]), [3]);

  title("7. Prognose: noch nicht gebuchte Fälligkeiten im Zeitraum");
  table(["Datum", "Bezeichnung", "Betrag"], r.planned.map((x) => [csvDate(x.date), x.name, money(x.amount)]), [2]);

  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal").setFontSize(7).setTextColor(120);
    pdf.text(
      `Betriebliche Übersicht auf Grundlage der erfassten Daten – ersetzt keine steuerliche Prüfung. Prognosen sind keine Ist-Werte.   Seite ${i}/${pages}`,
      L,
      290,
    );
    pdf.setTextColor(0);
  }
  return pdf;
}
