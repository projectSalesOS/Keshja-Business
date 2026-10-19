import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { money } from "@/lib/documentPdf";
import { fitLogo, type PdfLogo } from "@/lib/orgLogo";
import { csvDate, monthLabel, round, type ActualTotals, type MonthRow, type PlannedExpense, type Range, type Receivable } from "@/lib/analytics";

export type ReportVat = {
  /** true = Kleinunternehmerregelung (§ 19 UStG), keine Umsatzsteuer ausgewiesen. */
  smallBusiness: boolean;
  /** Umsatzsteuer aus ausgestellten Rechnungen im Zeitraum (Stornos bereits abgezogen). */
  outputVat: number;
  /** Abziehbare Vorsteuer aus Belegen mit erfasster Steueraufschlüsselung. */
  inputVat: number;
  /** Bezahlte Einnahmen ohne Rechnung – Steueranteil unbekannt. */
  incomeWithoutInvoice: number;
  /** Bezahlte Ausgaben ohne Beleg oder ohne Steueraufschlüsselung – Vorsteuer unbekannt. */
  expensesWithoutVat: number;
};

export type ReportInput = {
  company: { name: string; street?: string | null; postal_code?: string | null; city?: string | null; country?: string | null; email?: string | null; phone?: string | null; tax_number?: string | null; vat_id?: string | null };
  logo?: PdfLogo | null;
  range: Range;
  createdOn: string;
  totals: ActualTotals;
  months: MonthRow[];
  expenseCategories: { name: string; value: number }[];
  incomeCategories: { name: string; value: number }[];
  vat: ReportVat;
  receivables: Receivable[];
  recurring: { name: string; category: string; amount: number; interval: string; active: boolean }[];
  planned: PlannedExpense[];
};

type Last = { lastAutoTable?: { finalY: number } };

/** Geschäftsbericht (betriebliche Übersicht, kein Steuerdokument). */
export function buildReportPdf(r: ReportInput): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const L = 15;
  let y = 16;
  const next = (gap = 8) => ((pdf as unknown as Last).lastAutoTable?.finalY ?? y) + gap;
  const title = (t: string) => {
    if (y > 255) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFont("helvetica", "bold").setFontSize(11).setTextColor(30).text(t, L, y);
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
      margin: { left: L, right: L, bottom: 18 },
    });
    y = next();
  };

  // --- Firmenkopf: Logo links, Name/Anschrift/Kontakt daneben ---
  const c = r.company;
  let textX = L;
  if (r.logo) {
    const box = fitLogo(r.logo, 42, 16);
    pdf.addImage(r.logo.dataUrl, "PNG", L, y - 2, box.w, box.h);
    textX = L + 46;
  }
  pdf.setFont("helvetica", "bold").setFontSize(13).setTextColor(30).text(c.name, textX, y + 2);
  pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(80);
  const address = [
    c.street ?? "",
    [c.postal_code, c.city].filter(Boolean).join(" "),
    c.country && c.country !== "Deutschland" ? c.country : "",
  ].filter(Boolean);
  const contact = [c.email, c.phone].filter(Boolean).join("  |  ");
  const taxLine = [c.tax_number && `Steuernr.: ${c.tax_number}`, c.vat_id && `USt-IdNr.: ${c.vat_id}`].filter(Boolean).join("  |  ");
  const headLines = [...address, contact, taxLine].filter(Boolean);
  if (headLines.length) pdf.text(headLines, textX, y + 7);
  y += 7 + headLines.length * 3.4 + 4;

  pdf.setFont("helvetica", "bold").setFontSize(15).setTextColor(30).text("Einnahmen- und Ausgabenbericht", L, y);
  y += 6;
  pdf.setFont("helvetica", "normal").setFontSize(9).setTextColor(80);
  pdf.text(`Berichtszeitraum: ${csvDate(r.range.from)} – ${csvDate(r.range.to)}   |   Erstellt am ${csvDate(r.createdOn)}`, L, y);
  pdf.setTextColor(30);
  y += 10;

  title("1. Zusammenfassung (tatsächliche, bezahlte Buchungen)");
  table(["Kennzahl", "Betrag"], [
    ["Einnahmen", money(r.totals.income)],
    ["Ausgaben", money(r.totals.expense)],
    ["Saldo", money(r.totals.balance)],
    ["Anzahl Buchungen", r.totals.count],
  ], [1]);

  title("2. Umsatzsteuerübersicht (rechnerisch)");
  if (r.vat.smallBusiness) {
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(80);
    pdf.text("Kleinunternehmerregelung (§ 19 UStG): Es wird keine Umsatzsteuer erhoben und keine Vorsteuer abgezogen.", L, y + 2);
    pdf.setTextColor(30);
    y += 8;
  } else {
    const due = round(r.vat.outputVat - r.vat.inputVat);
    table(["Position", "Betrag"], [
      ["Umsatzsteuer aus Einnahmen (ausgestellte Rechnungen, Stornos abgezogen)", money(r.vat.outputVat)],
      ["Abziehbare Vorsteuer aus Ausgaben (Belege mit Steueraufschlüsselung)", money(r.vat.inputVat)],
      [due >= 0 ? "Rechnerische Zahllast" : "Rechnerischer Erstattungsbetrag", money(Math.abs(due))],
    ], [1]);
    const hints: string[] = [];
    if (r.vat.incomeWithoutInvoice > 0)
      hints.push(`${r.vat.incomeWithoutInvoice} bezahlte Einnahme(n) ohne Rechnung: enthaltener Steueranteil ist unbekannt und nicht enthalten.`);
    if (r.vat.expensesWithoutVat > 0)
      hints.push(`${r.vat.expensesWithoutVat} bezahlte Ausgabe(n) ohne Beleg-Steueraufschlüsselung: mögliche Vorsteuer ist nicht enthalten.`);
    hints.push("Rechnerische Übersicht aus den erfassten Daten – ersetzt keine Umsatzsteuervoranmeldung.");
    pdf.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(80);
    pdf.text(hints, L, y - 4);
    pdf.setTextColor(30);
    y += hints.length * 3.2;
  }

  title("3. Monatsübersicht");
  table(["Monat", "Einnahmen", "Ausgaben", "Saldo", "Saldo kumuliert"], r.months.map((m) => [monthLabel(m.month), money(m.income), money(m.expense), money(m.balance), money(m.cumulative)]), [1, 2, 3, 4]);

  title("4. Ausgaben nach Kategorie");
  table(["Kategorie", "Betrag"], r.expenseCategories.map((x) => [x.name, money(x.value)]), [1]);
  title("5. Einnahmen nach Kategorie");
  table(["Kategorie", "Betrag"], r.incomeCategories.map((x) => [x.name, money(x.value)]), [1]);

  // --- Fußzeile mit Seitenzahlen auf jeder Seite ---
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(210).setLineWidth(0.2).line(L, 284, 195, 284);
    pdf.setFont("helvetica", "normal").setFontSize(7).setTextColor(120);
    pdf.text(`${c.name} · Einnahmen- und Ausgabenbericht ${csvDate(r.range.from)} – ${csvDate(r.range.to)}`, L, 289);
    pdf.text("Betriebliche Übersicht – ersetzt keine steuerliche Prüfung.", L, 293);
    pdf.text(`Seite ${i} von ${pages}`, 195, 289, { align: "right" });
    pdf.setTextColor(30);
  }
  return pdf;
}
