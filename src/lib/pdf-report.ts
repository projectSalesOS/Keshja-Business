import jsPDF from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import {
  PERIOD_LABELS,
  aiSummary,
  breakdown,
  currency,
  formatDate,
  receiptsInPeriod,
  reportStats,
  type Period,
} from "./finance";
import { colorRgb } from "./categories";

/** paints the leading category cell in its fixed category color */
const categoryCellStyles = {
  didParseCell: (data: CellHookData) => {
    if (data.section !== "body" || data.column.index !== 0) return;
    data.cell.styles.textColor = colorRgb(String(data.cell.raw));
    data.cell.styles.fontStyle = "bold";
  },
};

export function generateReport(
  period: Period,
  withAiComment: boolean,
  allReceipts?: Parameters<typeof receiptsInPeriod>[1],
) {
  const receipts = receiptsInPeriod(period, allReceipts);
  const stats = reportStats(receipts);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;

  doc.setFontSize(20);
  doc.text("KESHJA Finanzbericht", margin, y);
  y += 20;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Zeitraum: ${PERIOD_LABELS[period]}  ·  Erstellt am ${formatDate(new Date().toISOString().slice(0, 10))}`,
    margin,
    y,
  );
  doc.setTextColor(30);
  y += 28;

  doc.setFontSize(13);
  doc.text("Management-Zusammenfassung", margin, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [40, 84, 84], textColor: 255 },
    head: [["Kennzahl", "Wert"]],
    body: [
      ["Gesamtausgaben", currency(stats.total)],
      ["Anzahl Kassenbons", String(stats.receiptCount)],
      ["Durchschnittlicher Einkaufswert", currency(stats.average)],
      ["Größte Kategorie", stats.topBereich ? `${stats.topBereich.name} (${currency(stats.topBereich.value)})` : "-"],
      ["Größte Unterkategorie", stats.topKategorie ? `${stats.topKategorie.name} (${currency(stats.topKategorie.value)})` : "-"],
      [
        "Teuerster Einkauf",
        stats.mostExpensive
          ? `${stats.mostExpensive.store}, ${formatDate(stats.mostExpensive.date)} – ${currency(stats.mostExpensive.total)}`
          : "-",
      ],
      [
        "Günstigster Einkauf",
        stats.cheapest
          ? `${stats.cheapest.store}, ${formatDate(stats.cheapest.date)} – ${currency(stats.cheapest.total)}`
          : "-",
      ],
    ],
  });

  const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;

  autoTable(doc, {
    startY: afterSummary + 26,
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [40, 84, 84], textColor: 255 },
    ...categoryCellStyles,
    head: [["Kategorie", "Ausgaben", "Anteil"]],
    body: breakdown(receipts, "bereich", 12).map((s) => [
      s.name,
      currency(s.value),
      `${stats.total ? ((s.value / stats.total) * 100).toFixed(1) : "0.0"} %`,
    ]),
  });

  const afterBereich = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;

  autoTable(doc, {
    startY: afterBereich + 26,
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [40, 84, 84], textColor: 255 },
    ...categoryCellStyles,
    head: [["Unterkategorie", "Ausgaben", "Anteil"]],
    body: breakdown(receipts, "kategorie", 15).map((s) => [
      s.name,
      currency(s.value),
      `${stats.total ? ((s.value / stats.total) * 100).toFixed(1) : "0.0"} %`,
    ]),
  });

  if (withAiComment) {
    const afterKategorie = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY;
    let ty = afterKategorie + 30;
    if (ty > 700) {
      doc.addPage();
      ty = margin;
    }
    doc.setFontSize(13);
    doc.text("KI-Zusammenfassung", margin, ty);
    doc.setFontSize(10);
    doc.setTextColor(70);
    const lines = doc.splitTextToSize(aiSummary(period, receipts), 500) as string[];
    doc.text(lines, margin, ty + 18);
  }

  doc.save(`keshja-bericht-${period}.pdf`);
}