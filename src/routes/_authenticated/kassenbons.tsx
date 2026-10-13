import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Loader2, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, OrgGate, btnPrimary, btnSecondary, inputClass } from "@/components/OrgGate";
import { useCustomers, useTransactions } from "@/hooks/useBusiness";
import { parseAmount } from "@/lib/business";
import { TransactionForm } from "@/components/TransactionForm";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ReceiptCapture } from "@/components/ReceiptCapture";
import { RECEIPTS_QUERY_KEY, useReceipts } from "@/hooks/useReceipts";
import { currency, formatDate } from "@/lib/finance";
import { colorToken } from "@/lib/categories";
import { type Receipt } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/kassenbons")({
  validateSearch: (search: Record<string, unknown>): { capture?: "1" } =>
    search["capture"] === "1" ? { capture: "1" } : {},
  head: () => ({
    meta: [
      { title: "Belege – Keshja Business" },
      {
        name: "description",
        content:
          "Belege fotografieren, per KI auslesen, prüfen, Kunden zuordnen und als Ausgabe buchen.",
      },
      { property: "og:title", content: "Belege – Keshja Business" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content: "Alle erfassten Kassenbons mit Geschäft, Datum, Uhrzeit und Gesamtsumme.",
      },
    ],
  }),
  component: KassenbonsPage,
});

function KassenbonsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Belege"
          description="Fotografieren oder hochladen – die KI liest die Daten aus, du prüfst und ordnest zu."
        />
        <OrgGate>{({ orgId }) => <ReceiptsView orgId={orgId} />}</OrgGate>
      </div>
    </AppShell>
  );
}

function ReceiptsView({ orgId }: { orgId: string }) {
  const { capture } = Route.useSearch();
  const receipts = useReceipts(orgId);
  const { data: tx = [] } = useTransactions(orgId);
  const bookedBy = useMemo(
    () => new Map(tx.filter((t) => t.receipt_id).map((t) => [t.receipt_id!, t])),
    [tx],
  );
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Receipt | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? receipts.filter(
          (r) =>
            r.store.toLowerCase().includes(q) ||
            r.date.includes(q) ||
            r.items.some(
              (i) =>
                i.name.toLowerCase().includes(q) ||
                i.bereich.toLowerCase().includes(q) ||
                i.kategorie.toLowerCase().includes(q),
            ),
        )
      : receipts;
    return list.slice(0, 60);
  }, [query, receipts]);

  return (
    <>
      <div className="space-y-6">
        <ReceiptCapture autoStart={capture === "1"} organizationId={orgId} />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Geschäft, Produkt oder Kategorie suchen"
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {results.map((r) => (
            <li key={r.id} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => setActive(r)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/60"
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {r.store}
                    {r.needsReview ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                        Prüfen
                      </span>
                    ) : null}
                    {bookedBy.has(r.id) ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                        Gebucht
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.date)} · {r.time} Uhr
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">{currency(r.total)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            </li>
          ))}
          {results.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              Keine Belege gefunden.
            </li>
          ) : null}
        </ul>
      </div>

      {active ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-6">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-6 shadow-elevated sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{active.store}</h2>
                <p className="text-xs text-muted-foreground">
                  {formatDate(active.date)} · {active.time} Uhr
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Schließen"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="mt-5 divide-y divide-border">
              {active.items.map((item, i) => (
                <li key={`${item.name}-${i}`} className="flex items-start justify-between gap-4 py-3">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: colorToken(item.bereich) }}
                    />
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.bereich} · {item.kategorie}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm tabular-nums">{currency(item.price)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-medium">Gesamtsumme</span>
              <span className="text-lg font-semibold tabular-nums">{currency(active.total)}</span>
            </div>

            <ReceiptBusinessPanel
              key={active.id}
              orgId={orgId}
              receipt={active}
              booked={bookedBy.has(active.id)}
              linkedReceipts={new Set(bookedBy.keys())}
              onUpdated={(patch) => setActive({ ...active, ...patch })}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function ReceiptBusinessPanel({
  orgId,
  receipt,
  booked,
  linkedReceipts,
  onUpdated,
}: {
  orgId: string;
  receipt: Receipt;
  booked: boolean;
  linkedReceipts: Set<string>;
  onUpdated: (patch: Partial<Receipt>) => void;
}) {
  const qc = useQueryClient();
  const { data: customers = [] } = useCustomers(orgId);
  const [merchant, setMerchant] = useState(receipt.store);
  const [date, setDate] = useState(receipt.date);
  const [total, setTotal] = useState(String(receipt.total).replace(".", ","));
  const [customerId, setCustomerId] = useState(receipt.customerId ?? "");
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState(false);

  async function saveCorrections() {
    const value = parseAmount(total);
    if (!merchant.trim()) return toast.error("Bitte einen Händler bzw. Aussteller angeben.");
    if (!date) return toast.error("Bitte ein Datum angeben.");
    if (value === null) return toast.error("Bitte einen gültigen Betrag eingeben.");
    setSaving(true);
    const { error } = await supabase
      .from("receipts")
      .update({
        merchant: merchant.trim(),
        date,
        total: value,
        customer_id: customerId || null,
        needs_review: false,
      })
      .eq("id", receipt.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: RECEIPTS_QUERY_KEY });
    onUpdated({ store: merchant.trim(), date, total: value, customerId: customerId || null, needsReview: false });
    toast.success("Beleg gespeichert.");
  }

  return (
    <div className="mt-5 space-y-3 border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Erkannte Daten prüfen und zuordnen
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Händler / Aussteller">
            <input className={inputClass} value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </Field>
        </div>
        <Field label="Datum">
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Betrag (€)">
          <input className={inputClass} inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Kunde (optional)">
            <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Kein Kunde</option>
              {customers
                .filter((c) => !c.archived_at || c.id === customerId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} disabled={saving} onClick={saveCorrections}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Korrekturen speichern
        </button>
        {booked ? (
          <span className="self-center text-xs text-muted-foreground">
            Bereits als Buchung erfasst (siehe Finanzen).
          </span>
        ) : (
          <button type="button" className={btnPrimary} onClick={() => setBooking(true)}>
            Als Ausgabe buchen
          </button>
        )}
      </div>
      {booking ? (
        <TransactionForm
          orgId={orgId}
          tx={null}
          linkedReceipts={linkedReceipts}
          preset={{
            type: "expense",
            amount: parseAmount(total) ?? receipt.total,
            booking_date: date,
            description: merchant.trim(),
            customer_id: customerId || null,
            receipt_id: receipt.id,
            status: "bezahlt",
          }}
          onClose={() => setBooking(false)}
        />
      ) : null}
    </div>
  );
}