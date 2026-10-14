import { useMemo, useState } from "react";
import { AlertTriangle, Ban, Check, Download, FileText, Loader2, Pencil, Plus, Search, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Field, Modal, btnPrimary, btnSecondary, inputClass, type OrgContext } from "@/components/OrgGate";
import { useCustomers, type Customer } from "@/hooks/useBusiness";
import { useOrganization, type Organization } from "@/hooks/useOrganization";
import {
  useDocActions,
  useDocuments,
  useDunning,
  usePayments,
  type Doc,
  type DraftInput,
  type Dunning,
  type Payment,
} from "@/hooks/useDocuments";
import {
  DUNNING_LABEL,
  KIND_LABEL,
  STATUS_LABEL,
  TAX_RATES,
  addDays,
  computeTotals,
  displayStatus,
  filterDocs,
  lineTotal,
  missingForIssue,
  nextDunningLevel,
  openAmount,
  parseDecimal,
  validateItems,
  type DisplayStatus,
  type InvoiceFilter,
  type ItemInput,
} from "@/lib/documents";
import { parseAmount, todayIso } from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";
import type { PdfDoc } from "@/lib/documentPdf";

type Kind = "quote" | "invoice";

const STATUS_TONE: Record<DisplayStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-primary/10 text-primary",
  accepted: "bg-primary/15 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
  partial: "bg-accent text-accent-foreground",
  paid: "bg-primary/20 text-primary",
  overdue: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ s }: { s: DisplayStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[s]}`}>{STATUS_LABEL[s]}</span>;
}

function companySnap(o: Organization | null): Record<string, unknown> {
  if (!o) return {};
  const { name, legal_form, street, postal_code, city, country, email, phone, website, tax_number, vat_id, iban, bic, bank_name, small_business } = o;
  return { name, legal_form, street, postal_code, city, country, email, phone, website, tax_number, vat_id, iban, bic, bank_name, small_business };
}
function customerSnap(c: Customer | undefined): Record<string, unknown> | null {
  if (!c) return null;
  const { name, contact_person, street, postal_code, city, country, customer_number, vat_id } = c;
  return { name, contact_person, street, postal_code, city, country, customer_number, vat_id };
}

async function downloadDocPdf(d: Doc, org: Organization | null, customers: Customer[]) {
  const { buildDocumentPdf } = await import("@/lib/documentPdf");
  const isDraft = d.status === "draft";
  const pdfDoc: PdfDoc = {
    ...d,
    small_business: isDraft ? !!org?.small_business : d.small_business,
    company_snapshot: isDraft ? companySnap(org) : d.company_snapshot,
    customer_snapshot: isDraft ? customerSnap(customers.find((c) => c.id === d.customer_id)) : d.customer_snapshot,
    due_date: isDraft && d.kind === "invoice" ? addDays(d.doc_date, d.payment_days ?? org?.default_payment_days ?? 14) : d.due_date,
  };
  buildDocumentPdf(pdfDoc, d.items).save(`${KIND_LABEL[d.kind]}_${d.number ?? "Entwurf"}.pdf`);
}

export function DocumentsView({ kind, ctx, startNew = false }: { kind: Kind; ctx: OrgContext; startNew?: boolean }) {
  const { orgId } = ctx;
  const today = todayIso();
  const { data: docs = [], isLoading, error } = useDocuments(orgId);
  const { data: payments = [] } = usePayments(orgId);
  const { data: customers = [] } = useCustomers(orgId);
  const { data: orgState } = useOrganization();
  const org = orgState?.organization ?? null;
  const [filter, setFilter] = useState<InvoiceFilter>({ status: "all", customerId: "", from: "", to: "", search: "" });
  const [editing, setEditing] = useState<Doc | "new" | null>(startNew ? "new" : null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const paidBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) m.set(p.invoice_id, Math.round(((m.get(p.invoice_id) ?? 0) + p.amount) * 100) / 100);
    return m;
  }, [payments]);
  const nameOf = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);

  const rows = useMemo(
    () =>
      docs
        .filter((d) => (kind === "quote" ? d.kind === "quote" : d.kind !== "quote"))
        .map((d) => ({
          ...d,
          paid: paidBy.get(d.id) ?? 0,
          customerName: (d.customer_snapshot?.["name"] as string | undefined) ?? (d.customer_id ? nameOf.get(d.customer_id) ?? "" : ""),
        })),
    [docs, kind, paidBy, nameOf],
  );
  const list = filterDocs(rows, filter, today);
  const viewing = viewingId ? docs.find((d) => d.id === viewingId) ?? null : null;

  const statusOptions: DisplayStatus[] =
    kind === "quote"
      ? ["draft", "issued", "accepted", "rejected", "expired"]
      : ["draft", "issued", "partial", "paid", "overdue", "cancelled"];

  const sumOpen = kind === "invoice"
    ? rows.filter((r) => r.kind === "invoice" && r.status === "issued").reduce((s, r) => s + Math.max(0, openAmount(r.total, r.paid)), 0)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-56">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputClass} pl-10`} placeholder="Nummer oder Kunde" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
        </div>
        <button type="button" className={btnPrimary} onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> {kind === "quote" ? "Neues Angebot" : "Neue Rechnung"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select className={inputClass} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value as InvoiceFilter["status"] })} aria-label="Status">
          <option value="all">Alle Status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className={inputClass} value={filter.customerId} onChange={(e) => setFilter({ ...filter, customerId: e.target.value })} aria-label="Kunde">
          <option value="">Alle Kunden</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className={inputClass} value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} aria-label="Von" />
        <input type="date" className={inputClass} value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} aria-label="Bis" />
      </div>
      {kind === "invoice" && sumOpen > 0 ? (
        <p className="text-sm text-muted-foreground">Offene Forderungen: <span className="font-semibold text-foreground tabular-nums">{currency(sumOpen)}</span></p>
      ) : null}

      <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <li className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Wird geladen …</li>
        ) : error ? (
          <li className="px-5 py-6 text-sm text-destructive">Dokumente konnten nicht geladen werden.</li>
        ) : list.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 h-7 w-7 text-primary/60" />
            {rows.length === 0 ? (kind === "quote" ? "Noch keine Angebote erstellt." : "Noch keine Rechnungen erstellt.") : "Keine Treffer für diese Filter."}
          </li>
        ) : (
          list.map((d) => {
            const st = displayStatus(d, d.paid, today);
            return (
              <li key={d.id} className="border-b border-border last:border-0">
                <button type="button" onClick={() => setViewingId(d.id)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-accent/60">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {d.kind === "cancellation" ? "Storno " : ""}{d.number ?? "Entwurf"} · {d.customerName || "Ohne Kunde"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(d.doc_date)}
                      {d.kind === "invoice" && d.due_date ? ` · fällig ${formatDate(d.due_date)}` : ""}
                      {d.kind === "invoice" && d.paid > 0 && st !== "paid" ? ` · offen ${currency(openAmount(d.total, d.paid))}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{currency(d.total)}</span>
                    <StatusBadge s={st} />
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {editing ? (
        <DocumentEditor
          kind={kind}
          ctx={ctx}
          doc={editing === "new" ? null : editing}
          customers={customers.filter((c) => !c.archived_at || (editing !== "new" && c.id === editing.customer_id))}
          org={org}
          onClose={() => setEditing(null)}
          onSaved={(id) => { setEditing(null); setViewingId(id); }}
        />
      ) : null}

      {viewing ? (
        <DocumentDetail
          doc={viewing}
          docs={docs}
          ctx={ctx}
          org={org}
          customers={customers}
          payments={payments.filter((p) => p.invoice_id === viewing.id)}
          onClose={() => setViewingId(null)}
          onEdit={() => { setEditing(viewing); setViewingId(null); }}
          onOpen={(id) => setViewingId(id)}
        />
      ) : null}
    </div>
  );
}

// ---------------- Editor ----------------

type ItemDraft = { description: string; quantity: string; unit: string; unit_price: string; tax_rate: number };
const emptyItem = (sb: boolean): ItemDraft => ({ description: "", quantity: "1", unit: "", unit_price: "", tax_rate: sb ? 0 : 19 });
const de2 = (n: number) => String(n).replace(".", ",");

function DocumentEditor({
  kind, ctx, doc, customers, org, onClose, onSaved,
}: {
  kind: Kind; ctx: OrgContext; doc: Doc | null; customers: Customer[]; org: Organization | null;
  onClose: () => void; onSaved: (id: string) => void;
}) {
  const a = useDocActions(ctx.orgId);
  const sb = !!org?.small_business;
  const today = todayIso();
  const [customerId, setCustomerId] = useState(doc?.customer_id ?? "");
  const [docDate, setDocDate] = useState(doc?.doc_date ?? today);
  const [validUntil, setValidUntil] = useState(doc?.valid_until ?? (kind === "quote" ? addDays(today, 30) : ""));
  const [serviceDate, setServiceDate] = useState(doc?.service_date ?? (kind === "invoice" ? today : ""));
  const [servicePeriodEnd, setServicePeriodEnd] = useState(doc?.service_period_end ?? "");
  const [paymentDays, setPaymentDays] = useState(String(doc?.payment_days ?? org?.default_payment_days ?? 14));
  const [intro, setIntro] = useState(doc?.intro ?? (kind === "quote" ? "Vielen Dank für Ihre Anfrage. Gerne bieten wir Ihnen an:" : "Für unsere Leistungen erlauben wir uns zu berechnen:"));
  const [terms, setTerms] = useState(doc?.terms ?? "");
  const [items, setItems] = useState<ItemDraft[]>(
    doc?.items.length
      ? doc.items.map((i) => ({ description: i.description, quantity: de2(i.quantity), unit: i.unit ?? "", unit_price: de2(i.unit_price), tax_rate: sb ? 0 : i.tax_rate }))
      : [emptyItem(sb)],
  );
  const [err, setErr] = useState<string | null>(null);
  const busy = a.saveDraft.isPending || a.issue.isPending;

  const parsed: ItemInput[] = items.map((i) => ({
    description: i.description,
    quantity: parseDecimal(i.quantity) ?? NaN,
    unit: i.unit,
    unit_price: parseDecimal(i.unit_price, true) ?? NaN,
    tax_rate: sb ? 0 : i.tax_rate,
  }));
  const valid = parsed.filter((i) => Number.isFinite(i.quantity) && Number.isFinite(i.unit_price));
  const totals = computeTotals(valid, sb);
  const customer = customers.find((c) => c.id === customerId) ?? null;
  const missing = missingForIssue(kind, { customer, itemCount: items.filter((i) => i.description.trim()).length, serviceDate: serviceDate || null }, org ?? {});

  function build(): DraftInput | null {
    const e = validateItems(parsed);
    if (e) { setErr(e); return null; }
    const pd = kind === "invoice" ? Number(paymentDays) : null;
    if (kind === "invoice" && (!Number.isInteger(pd) || pd! < 0 || pd! > 365)) { setErr("Das Zahlungsziel muss zwischen 0 und 365 Tagen liegen."); return null; }
    if (kind === "quote" && validUntil && validUntil < docDate) { setErr("Die Gültigkeit endet vor dem Angebotsdatum."); return null; }
    if (kind === "invoice" && servicePeriodEnd && serviceDate && servicePeriodEnd < serviceDate) { setErr("Das Ende des Leistungszeitraums liegt vor dem Beginn."); return null; }
    setErr(null);
    return {
      kind,
      customer_id: customerId || null,
      doc_date: docDate,
      valid_until: kind === "quote" ? validUntil || null : null,
      service_date: kind === "invoice" ? serviceDate || null : null,
      service_period_end: kind === "invoice" ? servicePeriodEnd || null : null,
      payment_days: pd,
      intro: intro.trim() || null,
      terms: terms.trim() || null,
      items: parsed,
    };
  }

  async function save(andIssue: boolean) {
    const v = build();
    if (!v) return;
    try {
      const id = await a.saveDraft.mutateAsync({ id: doc?.id, v });
      if (andIssue) {
        const num = await a.issue.mutateAsync(id);
        toast.success(`${KIND_LABEL[kind]} ${num} ausgegeben.`);
      } else toast.success("Entwurf gespeichert.");
      onSaved(id);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const setItem = (idx: number, patch: Partial<ItemDraft>) => setItems((s) => s.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <Modal title={doc ? `${KIND_LABEL[kind]}sentwurf bearbeiten` : kind === "quote" ? "Neues Angebot" : "Neue Rechnung"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(false); }}>
        <Field label="Kunde *">
          <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">– Kunde wählen –</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === "quote" ? "Angebotsdatum" : "Rechnungsdatum"}>
            <input type="date" className={inputClass} value={docDate} onChange={(e) => setDocDate(e.target.value)} required />
          </Field>
          {kind === "quote" ? (
            <Field label="Gültig bis">
              <input type="date" className={inputClass} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
          ) : (
            <Field label="Zahlungsziel (Tage)">
              <input inputMode="numeric" className={inputClass} value={paymentDays} onChange={(e) => setPaymentDays(e.target.value)} />
            </Field>
          )}
        </div>
        {kind === "invoice" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Leistungsdatum / -beginn *">
              <input type="date" className={inputClass} value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
            </Field>
            <Field label="Leistungsende (optional)">
              <input type="date" className={inputClass} value={servicePeriodEnd} onChange={(e) => setServicePeriodEnd(e.target.value)} />
            </Field>
          </div>
        ) : null}
        <Field label="Einleitungstext">
          <textarea className={`${inputClass} min-h-16`} value={intro} onChange={(e) => setIntro(e.target.value)} />
        </Field>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Positionen</p>
          {items.map((it, idx) => (
            <div key={idx} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex gap-2">
                <input className={inputClass} placeholder="Bezeichnung" value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })} aria-label={`Bezeichnung Position ${idx + 1}`} />
                <button type="button" className="rounded-lg px-2 text-muted-foreground hover:bg-accent disabled:opacity-40" disabled={items.length === 1} onClick={() => setItems((s) => s.filter((_, i) => i !== idx))} aria-label="Position entfernen">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <input className={inputClass} inputMode="decimal" placeholder="Menge" value={it.quantity} onChange={(e) => setItem(idx, { quantity: e.target.value })} aria-label="Menge" />
                <input className={inputClass} placeholder="Einheit" value={it.unit} onChange={(e) => setItem(idx, { unit: e.target.value })} aria-label="Einheit" />
                <input className={inputClass} inputMode="decimal" placeholder="Preis €" value={it.unit_price} onChange={(e) => setItem(idx, { unit_price: e.target.value })} aria-label="Einzelpreis netto" />
                <select className={inputClass} value={sb ? 0 : it.tax_rate} disabled={sb} onChange={(e) => setItem(idx, { tax_rate: Number(e.target.value) })} aria-label="Steuersatz">
                  {TAX_RATES.map((r) => <option key={r} value={r}>{r} %</option>)}
                </select>
              </div>
              <p className="text-right text-xs text-muted-foreground tabular-nums">
                Summe: {Number.isFinite(parsed[idx]!.quantity) && Number.isFinite(parsed[idx]!.unit_price) ? currency(lineTotal(parsed[idx]!)) : "–"}
              </p>
            </div>
          ))}
          <button type="button" className={btnSecondary} onClick={() => setItems((s) => [...s, emptyItem(sb)])}>
            <Plus className="h-4 w-4" /> Position
          </button>
        </div>

        <dl className="space-y-1 rounded-xl bg-muted/50 p-3 text-sm tabular-nums">
          <div className="flex justify-between"><dt>Zwischensumme (netto)</dt><dd>{currency(totals.subtotal)}</dd></div>
          {totals.taxes.map((t) => (
            <div key={t.rate} className="flex justify-between text-muted-foreground"><dt>{t.rate} % USt. auf {currency(t.net)}</dt><dd>{currency(t.tax)}</dd></div>
          ))}
          <div className="flex justify-between font-semibold"><dt>Gesamt</dt><dd>{currency(totals.total)}</dd></div>
          {sb ? <p className="pt-1 text-xs text-muted-foreground">Kleinunternehmer: keine Umsatzsteuer (§ 19 UStG).</p> : null}
        </dl>

        <Field label={kind === "quote" ? "Angebotsbedingungen (optional)" : "Zusätzliche Hinweise (optional)"}>
          <textarea className={`${inputClass} min-h-16`} value={terms} onChange={(e) => setTerms(e.target.value)} />
        </Field>

        {missing.length ? (
          <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Für die Ausgabe fehlt noch: {missing.join(", ")}. Unternehmensdaten pflegst du in den Einstellungen. Als Entwurf speichern ist möglich.</span>
          </div>
        ) : null}
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Abbrechen</button>
          <button type="submit" className={btnSecondary} disabled={busy}>
            {a.saveDraft.isPending && !a.issue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Entwurf speichern
          </button>
          <button type="button" className={btnPrimary} disabled={busy || missing.length > 0} onClick={() => save(true)}>
            {a.issue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Speichern & ausgeben
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------- Detail ----------------

function DocumentDetail({
  doc: d, docs, ctx, org, customers, payments, onClose, onEdit, onOpen,
}: {
  doc: Doc; docs: Doc[]; ctx: OrgContext; org: Organization | null; customers: Customer[]; payments: Payment[];
  onClose: () => void; onEdit: () => void; onOpen: (id: string) => void;
}) {
  const a = useDocActions(ctx.orgId);
  const today = todayIso();
  const paid = Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  const st = displayStatus(d, paid, today);
  const open = openAmount(d.total, paid);
  const derivedInvoice = d.kind === "quote" ? docs.find((x) => x.source_quote_id === d.id) : undefined;
  const sourceQuote = d.source_quote_id ? docs.find((x) => x.id === d.source_quote_id) : undefined;
  const cancellation = d.kind === "invoice" ? docs.find((x) => x.cancels_document_id === d.id) : undefined;
  const cancelled = d.cancels_document_id ? docs.find((x) => x.id === d.cancels_document_id) : undefined;
  const cust = (d.customer_snapshot?.["name"] as string | undefined) ?? customers.find((c) => c.id === d.customer_id)?.name ?? "–";
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function run<T>(p: Promise<T>, ok: string) {
    try { await p; toast.success(ok); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Modal title={`${KIND_LABEL[d.kind]} ${d.number ?? "(Entwurf)"}`} onClose={onClose}>
      <div className="mb-3 flex items-center gap-2"><StatusBadge s={st} /></div>
      <dl className="divide-y divide-border text-sm">
        {([
          ["Kunde", cust],
          ["Datum", formatDate(d.doc_date)],
          d.kind === "quote" && d.valid_until ? ["Gültig bis", formatDate(d.valid_until)] : null,
          d.kind !== "quote" && d.service_date ? ["Leistung", d.service_period_end ? `${formatDate(d.service_date)} – ${formatDate(d.service_period_end)}` : formatDate(d.service_date)] : null,
          d.kind === "invoice" && d.due_date ? ["Fällig am", formatDate(d.due_date)] : null,
          ["Netto", currency(d.subtotal)],
          ["Umsatzsteuer", d.small_business ? "keine (§ 19 UStG)" : currency(d.tax_total)],
          ["Gesamt", currency(d.total)],
          d.kind === "invoice" && d.status !== "draft" ? ["Bezahlt", currency(paid)] : null,
          d.kind === "invoice" && d.status === "issued" ? [open < 0 ? "Überzahlung" : "Offen", currency(Math.abs(open))] : null,
        ].filter(Boolean) as [string, string][]).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right tabular-nums">{v}</dd></div>
        ))}
      </dl>
      {open < 0 && d.status === "issued" ? (
        <p className="mt-2 rounded-lg bg-accent px-3 py-2 text-xs">Es wurde mehr gezahlt als berechnet. Bitte den Betrag von {currency(-open)} prüfen und ggf. erstatten.</p>
      ) : null}

      <ul className="mt-3 space-y-1 text-sm">
        {d.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{String(i.quantity).replace(".", ",")}{i.unit ? ` ${i.unit}` : ""} × {i.description}</span>
            <span className="shrink-0 tabular-nums">{currency(lineTotal(i))}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {sourceQuote ? <LinkLine label="Aus Angebot" doc={sourceQuote} onOpen={onOpen} /> : null}
        {derivedInvoice ? <LinkLine label="Rechnung erstellt" doc={derivedInvoice} onOpen={onOpen} /> : null}
        {cancellation ? <LinkLine label="Storniert durch" doc={cancellation} onOpen={onOpen} /> : null}
        {cancelled ? <LinkLine label="Storniert Rechnung" doc={cancelled} onOpen={onOpen} /> : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} onClick={() => downloadDocPdf(d, org, customers).catch((e) => toast.error(`PDF konnte nicht erstellt werden: ${(e as Error).message}`))}>
          <Download className="h-4 w-4" /> PDF
        </button>
        {d.status === "draft" ? (
          <>
            <button type="button" className={btnPrimary} onClick={onEdit}><Pencil className="h-4 w-4" /> Bearbeiten</button>
            <button type="button" className={btnSecondary} disabled={a.deleteDraft.isPending}
              onClick={() => confirm("Entwurf wirklich löschen?") && run(a.deleteDraft.mutateAsync(d.id).then(onClose), "Entwurf gelöscht.")}>
              <Trash2 className="h-4 w-4" /> Löschen
            </button>
          </>
        ) : null}
        {d.kind === "quote" && d.status === "issued" ? (
          <>
            <button type="button" className={btnPrimary} disabled={a.setQuoteStatus.isPending} onClick={() => run(a.setQuoteStatus.mutateAsync({ id: d.id, status: "accepted" }), "Als angenommen markiert.")}>
              <Check className="h-4 w-4" /> Angenommen
            </button>
            <button type="button" className={btnSecondary} disabled={a.setQuoteStatus.isPending} onClick={() => run(a.setQuoteStatus.mutateAsync({ id: d.id, status: "rejected" }), "Als abgelehnt markiert.")}>
              <X className="h-4 w-4" /> Abgelehnt
            </button>
          </>
        ) : null}
        {d.kind === "quote" && (d.status === "accepted" || d.status === "rejected") && !derivedInvoice ? (
          <button type="button" className={btnSecondary} onClick={() => run(a.setQuoteStatus.mutateAsync({ id: d.id, status: "issued" }), "Status zurückgesetzt.")}>Status zurücksetzen</button>
        ) : null}
        {d.kind === "quote" && d.status === "accepted" && !derivedInvoice ? (
          <button type="button" className={btnPrimary} disabled={a.convert.isPending}
            onClick={async () => {
              try { const id = await a.convert.mutateAsync(d.id); toast.success("Rechnungsentwurf erstellt – zu finden unter Rechnungen."); onOpen(id); }
              catch (e) { toast.error((e as Error).message); }
            }}>
            {a.convert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} In Rechnung umwandeln
          </button>
        ) : null}
        {d.kind === "invoice" && d.status === "issued" && ctx.isAdmin && payments.length === 0 ? (
          <button type="button" className={btnSecondary} onClick={() => setCancelOpen((v) => !v)}><Ban className="h-4 w-4" /> Stornieren</button>
        ) : null}
      </div>

      {cancelOpen ? (
        <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Es wird eine Stornorechnung mit eigener Nummer erstellt. Die ursprüngliche Rechnung bleibt unverändert erhalten. Für eine Korrektur danach eine neue Rechnung ausstellen.</p>
          <input className={inputClass} placeholder="Grund (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" className={btnPrimary} disabled={a.cancel.isPending}
            onClick={async () => {
              try { const id = await a.cancel.mutateAsync({ id: d.id, reason }); toast.success("Stornorechnung erstellt."); setCancelOpen(false); onOpen(id); }
              catch (e) { toast.error((e as Error).message); }
            }}>
            {a.cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Storno erstellen
          </button>
        </div>
      ) : null}

      {d.kind === "invoice" && d.status !== "draft" ? <PaymentsSection invoice={d} ctx={ctx} payments={payments} open={open} /> : null}
      {d.kind === "invoice" && d.status !== "draft" ? <DunningSection invoice={d} ctx={ctx} paid={paid} /> : null}
    </Modal>
  );
}

function LinkLine({ label, doc, onOpen }: { label: string; doc: Doc; onOpen: (id: string) => void }) {
  return (
    <p>{label}: <button type="button" className="text-primary underline" onClick={() => onOpen(doc.id)}>{doc.number ?? "Entwurf"}</button></p>
  );
}

function PaymentsSection({ invoice, ctx, payments, open }: { invoice: Doc; ctx: OrgContext; payments: Payment[]; open: number }) {
  const a = useDocActions(ctx.orgId);
  const today = todayIso();
  const [form, setForm] = useState<{ id: string; isNew: boolean; amount: string; date: string; method: string; note: string } | null>(null);
  const canAdd = invoice.status === "issued";

  async function submit(): Promise<void> {
    if (!form) return;
    const amount = parseAmount(form.amount);
    if (amount === null) { toast.error("Bitte einen gültigen Betrag größer 0 angeben."); return; }
    if (!form.date || form.date > today) { toast.error("Das Zahlungsdatum darf nicht in der Zukunft liegen."); return; }
    const othersPaid = payments.filter((p) => p.id !== form.id).reduce((s, p) => s + p.amount, 0);
    const over = Math.round((othersPaid + amount - invoice.total) * 100) / 100;
    if (over > 0 && !confirm(`Damit wäre die Rechnung um ${currency(over)} überzahlt. Trotzdem speichern?`)) return;
    try {
      await a.savePayment.mutateAsync({ id: form.id, isNew: form.isNew, invoice_id: invoice.id, amount, payment_date: form.date, method: form.method.trim() || null, note: form.note.trim() || null });
      toast.success(form.isNew ? "Zahlung erfasst und als Einnahme gebucht." : "Zahlung korrigiert.");
      setForm(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="mt-6 border-t border-border pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Zahlungen</h3>
        {canAdd && !form ? (
          <button type="button" className="text-sm font-medium text-primary"
            onClick={() => setForm({ id: crypto.randomUUID(), isNew: true, amount: open > 0 ? de2(open) : "", date: today, method: "Überweisung", note: "" })}>
            + Zahlung erfassen
          </button>
        ) : null}
      </div>
      {payments.length === 0 ? <p className="text-xs text-muted-foreground">Noch keine Zahlung erfasst.</p> : (
        <ul className="divide-y divide-border text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <span>{formatDate(p.payment_date)}{p.method ? ` · ${p.method}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
              <span className="flex items-center gap-1">
                <span className="tabular-nums">{currency(p.amount)}</span>
                {canAdd ? (
                  <button type="button" className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Zahlung bearbeiten"
                    onClick={() => setForm({ id: p.id, isNew: false, amount: de2(p.amount), date: p.payment_date, method: p.method ?? "", note: p.note ?? "" })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {ctx.isAdmin ? (
                  <button type="button" className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Zahlung löschen"
                    onClick={async () => {
                      if (!confirm("Zahlung und die zugehörige Einnahme löschen?")) return;
                      try { await a.deletePayment.mutateAsync(p.id); toast.success("Zahlung und Einnahme entfernt."); } catch (e) { toast.error((e as Error).message); }
                    }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {form ? (
        <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Betrag (€)"><input className={inputClass} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Zahlungsdatum"><input type="date" className={inputClass} value={form.date} max={today} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Zahlungsart"><input className={inputClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} /></Field>
            <Field label="Notiz"><input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setForm(null)}>Abbrechen</button>
            <button type="button" className={btnPrimary} disabled={a.savePayment.isPending} onClick={submit}>
              {a.savePayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Speichern
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DunningSection({ invoice, ctx, paid }: { invoice: Doc; ctx: OrgContext; paid: number }) {
  const a = useDocActions(ctx.orgId);
  const { data: all = [] } = useDunning(ctx.orgId);
  const notices = all.filter((n) => n.invoice_id === invoice.id);
  const today = todayIso();
  const next = nextDunningLevel(invoice, paid, notices.map((n) => n.level), today);
  const [due, setDue] = useState(addDays(today, 10));

  async function pdf(n: Dunning) {
    try {
      const { buildDunningPdf } = await import("@/lib/documentPdf");
      buildDunningPdf(invoice, n, paid).save(`${DUNNING_LABEL[n.level]}_${invoice.number}.pdf`.replace(/\s/g, "_"));
    } catch (e) {
      toast.error(`PDF konnte nicht erstellt werden: ${(e as Error).message}`);
    }
  }

  if (!notices.length && !next) return null;
  return (
    <section className="mt-6 border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-semibold">Mahnwesen</h3>
      {notices.length ? (
        <ul className="divide-y divide-border text-sm">
          {notices.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {DUNNING_LABEL[n.level]} · {formatDate(n.notice_date)} · offen {currency(n.open_amount)} · Frist {formatDate(n.new_due_date)}
                <span className="block text-xs text-muted-foreground">{n.sent_at ? `Versendet am ${formatDate(n.sent_at.slice(0, 10))}` : "Noch nicht versendet"}</span>
              </span>
              <span className="flex gap-1">
                <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-accent" aria-label="PDF" onClick={() => pdf(n)}><Download className="h-4 w-4" /></button>
                <button type="button" className="rounded px-2 py-1 text-xs text-primary hover:bg-accent" onClick={() => a.markSent.mutateAsync({ id: n.id, sent: !n.sent_at }).catch((e) => toast.error((e as Error).message))}>
                  {n.sent_at ? "Versand zurücknehmen" : "Als versendet markieren"}
                </button>
                {ctx.isAdmin && !n.sent_at ? (
                  <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-accent" aria-label="Mahnung löschen"
                    onClick={() => a.deleteDunning.mutateAsync(n.id).then(() => toast.success("Mahnung gelöscht."), (e) => toast.error((e as Error).message))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {next ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Neue Zahlungsfrist"><input type="date" className={inputClass} value={due} min={addDays(today, 1)} onChange={(e) => setDue(e.target.value)} /></Field>
          <button type="button" className={btnPrimary} disabled={a.createDunning.isPending}
            onClick={() => a.createDunning.mutateAsync({ invoice_id: invoice.id, level: next, new_due_date: due }).then(() => toast.success(`${DUNNING_LABEL[next]} vorbereitet.`), (e) => toast.error((e as Error).message))}>
            {a.createDunning.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {DUNNING_LABEL[next]} erstellen
          </button>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">Mahnungen werden nur vorbereitet; der Versand erfolgt durch dich. Es werden keine Gebühren oder Zinsen berechnet.</p>
    </section>
  );
}
