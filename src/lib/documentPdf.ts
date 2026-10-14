import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fitLogo, type PdfLogo } from "@/lib/orgLogo";
import { DUNNING_LABEL, KIND_LABEL, computeTotals, lineTotal, type DocKind } from "@/lib/documents";

type Snap = Record<string, unknown> | null;
export type PdfDoc = {
  kind: DocKind;
  number: string | null;
  doc_date: string;
  valid_until: string | null;
  service_date: string | null;
  service_period_end: string | null;
  due_date: string | null;
  payment_days: number | null;
  intro: string | null;
  terms: string | null;
  small_business: boolean;
  company_snapshot: Snap;
  customer_snapshot: Snap;
};
export type PdfItem = { description: string; quantity: number; unit: string | null; unit_price: number; tax_rate: number };

/** Betrag für PDF (nur Zeichen aus dem Standard-Zeichensatz). */
export function money(n: number): string {
  const [i, d] = Math.abs(n).toFixed(2).split(".") as [string, string];
  return `${n < 0 ? "-" : ""}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${d} EUR`;
}
const qty = (n: number) => String(n).replace(".", ",");
const de = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "");
const s = (o: Snap, k: string) => (o && typeof o[k] === "string" ? (o[k] as string) : "");

function header(pdf: jsPDF, company: Snap, customer: Snap, logo?: PdfLogo | null) {
  const L = 20;
  if (logo) {
    // Logo rechts oben, max. 50 × 22 mm, Seitenverhältnis bleibt erhalten; endet vor dem Meta-Block (y=45).
    const { w, h } = fitLogo(logo, 50, 22);
    pdf.addImage(logo.dataUrl, "PNG", 190 - w, 12, w, h);
  }
  pdf.setFont("helvetica", "bold").setFontSize(14).text(s(company, "name") || "Unternehmen", L, 22);
  pdf.setFont("helvetica", "normal").setFontSize(8);
  pdf.text(
    [s(company, "street"), [s(company, "postal_code"), s(company, "city")].filter(Boolean).join(" "), s(company, "email"), s(company, "phone")]
      .filter(Boolean)
      .join("  |  "),
    L,
    28,
  );
  pdf.setFontSize(10);
  const addr = [
    s(customer, "name"),
    s(customer, "contact_person"),
    s(customer, "street"),
    [s(customer, "postal_code"), s(customer, "city")].filter(Boolean).join(" "),
    s(customer, "country") && s(customer, "country") !== "DE" ? s(customer, "country") : "",
  ].filter(Boolean);
  pdf.text(addr, L, 45);
}

function footer(pdf: jsPDF, company: Snap) {
  const h = pdf.internal.pageSize.getHeight();
  const lines = [
    [s(company, "name"), s(company, "legal_form")].filter(Boolean).join(" "),
    [s(company, "tax_number") && `Steuernr.: ${s(company, "tax_number")}`, s(company, "vat_id") && `USt-IdNr.: ${s(company, "vat_id")}`]
      .filter(Boolean)
      .join("  |  "),
    [s(company, "bank_name"), s(company, "iban") && `IBAN: ${s(company, "iban")}`, s(company, "bic") && `BIC: ${s(company, "bic")}`]
      .filter(Boolean)
      .join("  |  "),
  ].filter(Boolean);
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7).setTextColor(110);
    pdf.text(lines, 20, h - 18);
    pdf.text(`Seite ${p} von ${pages}`, 190, h - 10, { align: "right" });
    pdf.setTextColor(0);
  }
}

export function buildDocumentPdf(d: PdfDoc, items: PdfItem[], logo?: PdfLogo | null): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const company = d.company_snapshot;
  header(pdf, company, d.customer_snapshot, logo);

  const meta: [string, string][] = [[`${KIND_LABEL[d.kind]}snr.`, d.number ?? "ENTWURF"], ["Datum", de(d.doc_date)]];
  if (s(d.customer_snapshot, "customer_number")) meta.push(["Kundennr.", s(d.customer_snapshot, "customer_number")]);
  if (d.kind === "quote" && d.valid_until) meta.push(["Gültig bis", de(d.valid_until)]);
  if (d.kind !== "quote" && d.service_date)
    meta.push([d.service_period_end ? "Leistungszeitraum" : "Leistungsdatum", d.service_period_end ? `${de(d.service_date)} - ${de(d.service_period_end)}` : de(d.service_date)]);
  if (d.kind === "invoice" && d.due_date) meta.push(["Fällig am", de(d.due_date)]);
  pdf.setFontSize(9);
  meta.forEach(([k, v], i) => {
    pdf.text(k, 140, 45 + i * 5);
    pdf.text(v, 190, 45 + i * 5, { align: "right" });
  });

  let y = 85;
  pdf.setFont("helvetica", "bold").setFontSize(13).text(`${KIND_LABEL[d.kind]} ${d.number ?? "(Entwurf)"}`, 20, y);
  pdf.setFont("helvetica", "normal").setFontSize(10);
  y += 7;
  if (d.intro) {
    const t = pdf.splitTextToSize(d.intro, 170);
    pdf.text(t, 20, y);
    y += t.length * 5 + 2;
  }

  const showTax = !d.small_business;
  autoTable(pdf, {
    startY: y,
    head: [["Pos.", "Bezeichnung", "Menge", "Einzelpreis", ...(showTax ? ["USt."] : []), "Gesamt"]],
    body: items.map((i, idx) => [
      String(idx + 1),
      i.description,
      `${qty(i.quantity)}${i.unit ? " " + i.unit : ""}`,
      money(i.unit_price),
      ...(showTax ? [`${qty(i.tax_rate)} %`] : []),
      money(lineTotal(i)),
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: { 0: { cellWidth: 12 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: 20, right: 20, bottom: 30 },
  });
  y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  const t = computeTotals(items, d.small_business);
  const rows: [string, string][] = [["Zwischensumme (netto)", money(t.subtotal)]];
  for (const g of t.taxes) rows.push([`zzgl. ${qty(g.rate)} % USt. auf ${money(g.net)}`, money(g.tax)]);
  rows.push([d.kind === "quote" ? "Angebotssumme" : "Gesamtbetrag", money(t.total)]);
  if (y > 250) { pdf.addPage(); y = 25; }
  rows.forEach(([k, v], i) => {
    if (i === rows.length - 1) pdf.setFont("helvetica", "bold");
    pdf.text(k, 130, y, { align: "right" });
    pdf.text(v, 190, y, { align: "right" });
    y += 5.5;
  });
  pdf.setFont("helvetica", "normal");
  y += 4;

  const notes: string[] = [];
  if (d.small_business) notes.push("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).");
  if (d.kind === "invoice" && d.due_date)
    notes.push(`Bitte überweisen Sie den Gesamtbetrag bis zum ${de(d.due_date)} unter Angabe der Rechnungsnummer ${d.number ?? ""}.`);
  if (d.kind === "quote" && d.valid_until) notes.push(`Dieses Angebot ist gültig bis zum ${de(d.valid_until)}.`);
  if (d.terms) notes.push(d.terms);
  for (const n of notes) {
    const lines = pdf.splitTextToSize(n, 170);
    if (y + lines.length * 5 > 262) { pdf.addPage(); y = 25; }
    pdf.text(lines, 20, y);
    y += lines.length * 5 + 2;
  }
  footer(pdf, company);
  return pdf;
}

export type PdfDunning = { level: number; notice_date: string; new_due_date: string; open_amount: number };

export function buildDunningPdf(inv: PdfDoc & { total: number }, n: PdfDunning, paid: number, logo?: PdfLogo | null): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  header(pdf, inv.company_snapshot, inv.customer_snapshot, logo);
  pdf.setFontSize(9);
  pdf.text("Datum", 140, 45);
  pdf.text(de(n.notice_date), 190, 45, { align: "right" });
  pdf.text("Rechnungsnr.", 140, 50);
  pdf.text(inv.number ?? "", 190, 50, { align: "right" });

  const title = DUNNING_LABEL[n.level] ?? "Mahnung";
  pdf.setFont("helvetica", "bold").setFontSize(13).text(`${title} zu Rechnung ${inv.number ?? ""}`, 20, 85);
  pdf.setFont("helvetica", "normal").setFontSize(10);
  const intro =
    n.level === 1
      ? `sicher ist es Ihrer Aufmerksamkeit entgangen: Unsere Rechnung ${inv.number} vom ${de(inv.doc_date)} war am ${de(inv.due_date)} fällig. Bis heute konnten wir keinen vollständigen Zahlungseingang feststellen.`
      : `trotz unserer bisherigen Erinnerung ist unsere Rechnung ${inv.number} vom ${de(inv.doc_date)}, fällig am ${de(inv.due_date)}, weiterhin nicht vollständig beglichen.`;
  let y = 95;
  pdf.text("Sehr geehrte Damen und Herren,", 20, y);
  y += 8;
  const lines = pdf.splitTextToSize(intro, 170);
  pdf.text(lines, 20, y);
  y += lines.length * 5 + 6;
  const rows: [string, string][] = [
    ["Rechnungsbetrag", money(inv.total)],
    ["Bereits gezahlt", money(paid)],
    ["Offener Betrag", money(n.open_amount)],
  ];
  rows.forEach(([k, v], i) => {
    if (i === 2) pdf.setFont("helvetica", "bold");
    pdf.text(k, 20, y);
    pdf.text(v, 120, y, { align: "right" });
    y += 6;
  });
  pdf.setFont("helvetica", "normal");
  y += 4;
  const ask = pdf.splitTextToSize(
    `Bitte überweisen Sie den offenen Betrag bis spätestens ${de(n.new_due_date)} unter Angabe der Rechnungsnummer. Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.`,
    170,
  );
  pdf.text(ask, 20, y);
  y += ask.length * 5 + 8;
  pdf.text(["Mit freundlichen Grüßen", s(inv.company_snapshot, "name")], 20, y);
  footer(pdf, inv.company_snapshot);
  return pdf;
}
