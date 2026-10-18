import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Loader2, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Field, Modal, OrgGate, btnPrimary, btnSecondary, inputClass } from "@/components/OrgGate";
import { useCustomers, useSaveCustomer, useTransactions, type Customer } from "@/hooks/useBusiness";
import {
  EMPTY_CUSTOMER,
  cleanCustomer,
  totals,
  validateCustomer,
  type CustomerInput,
} from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/kunden")({
  head: () => ({
    meta: [
      { title: "Kunden – Keshja Business" },
      { name: "description", content: "Kunden anlegen, bearbeiten, anzeigen und archivieren." },
      { property: "og:title", content: "Kunden – Keshja Business" },
      { property: "og:description", content: "Kundenverwaltung für dein Unternehmen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Kunden" description="Kundenstamm deines Unternehmens." />
        <OrgGate>{({ orgId }) => <CustomersView orgId={orgId} />}</OrgGate>
      </div>
    </AppShell>
  ),
});

function toInput(c: Customer): CustomerInput {
  return {
    name: c.name,
    contact_person: c.contact_person ?? "",
    street: c.street ?? "",
    postal_code: c.postal_code ?? "",
    city: c.city ?? "",
    country: c.country ?? "DE",
    email: c.email ?? "",
    phone: c.phone ?? "",
    customer_number: c.customer_number ?? "",
    vat_id: c.vat_id ?? "",
    notes: c.notes ?? "",
  };
}

function CustomersView({ orgId }: { orgId: string }) {
  const { data = [], isLoading, error } = useCustomers(orgId);
  const save = useSaveCustomer(orgId);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; values: CustomerInput } | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter(
      (c) =>
        (showArchived ? c.archived_at : !c.archived_at) &&
        (!q ||
          [c.name, c.contact_person, c.email, c.city, c.customer_number]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q))),
    );
  }, [data, search, showArchived]);

  async function setArchived(c: Customer, archived: boolean) {
    try {
      await save.mutateAsync({
        id: c.id,
        values: { archived_at: archived ? new Date().toISOString() : null },
      });
      toast.success(archived ? "Kunde archiviert." : "Kunde wiederhergestellt.");
      setViewing(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${inputClass} pl-10`}
            placeholder="Name, E-Mail, Ort oder Kundennummer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className={btnSecondary} onClick={() => setShowArchived((v) => !v)}>
          <Archive className="h-4 w-4" /> {showArchived ? "Aktive anzeigen" : "Archiv anzeigen"}
        </button>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setEditing({ values: { ...EMPTY_CUSTOMER } })}
        >
          <Plus className="h-4 w-4" /> Neuer Kunde
        </button>
      </div>

      <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <li className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Kunden werden geladen …
          </li>
        ) : error ? (
          <li className="px-5 py-6 text-sm text-destructive">Kunden konnten nicht geladen werden.</li>
        ) : list.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">
            {showArchived ? "Keine archivierten Kunden." : "Noch keine Kunden angelegt."}
          </li>
        ) : (
          list.map((c) => (
            <li key={c.id} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => setViewing(c)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-accent/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.customer_number && `Nr. ${c.customer_number}`, c.contact_person, c.city]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{c.email}</span>
              </button>
            </li>
          ))
        )}
      </ul>

      {viewing ? (
        <CustomerDetail
          orgId={orgId}
          customer={viewing}
          busy={save.isPending}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing({ id: viewing.id, values: toInput(viewing) });
            setViewing(null);
          }}
          onArchive={(a) => setArchived(viewing, a)}
        />
      ) : null}

      {editing ? (
        <CustomerForm
          initial={editing.values}
          title={editing.id ? "Kunde bearbeiten" : "Neuer Kunde"}
          busy={save.isPending}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            try {
              await save.mutateAsync({ id: editing.id, values: cleanCustomer(values) });
              toast.success(editing.id ? "Kunde gespeichert." : "Kunde angelegt.");
              setEditing(null);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function CustomerDetail({
  orgId,
  customer: c,
  busy,
  onClose,
  onEdit,
  onArchive,
}: {
  orgId: string;
  customer: Customer;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onArchive: (archived: boolean) => void;
}) {
  const { data: tx = [] } = useTransactions(orgId);
  const own = tx.filter((t) => t.customer_id === c.id);
  const sums = totals(own);
  const rows: [string, string | null][] = [
    ["Kundennummer", c.customer_number],
    ["Ansprechpartner", c.contact_person],
    ["Anschrift", [c.street, [c.postal_code, c.city].filter(Boolean).join(" "), c.country].filter(Boolean).join(", ")],
    ["E-Mail", c.email],
    ["Telefon", c.phone],
    ["USt-IdNr.", c.vat_id],
    ["Notizen", c.notes],
  ];
  return (
    <Modal title={c.name} onClose={onClose}>
      {c.archived_at ? (
        <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Archiviert am {formatDate(c.archived_at.slice(0, 10))}
        </p>
      ) : null}
      <dl className="divide-y divide-border text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="whitespace-pre-wrap text-right">{v || "—"}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-muted-foreground">Einnahmen / Ausgaben</dt>
          <dd className="text-right tabular-nums">
            {currency(sums.income)} / {currency(sums.expense)} ({own.length} Buchungen)
          </dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Bearbeiten
        </button>
        <button
          type="button"
          className={btnSecondary}
          disabled={busy}
          onClick={() => onArchive(!c.archived_at)}
        >
          {c.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {c.archived_at ? "Wiederherstellen" : "Archivieren"}
        </button>
      </div>
    </Modal>
  );
}

function CustomerForm({
  initial,
  title,
  busy,
  onClose,
  onSubmit,
}: {
  initial: CustomerInput;
  title: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: CustomerInput) => void;
}) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof CustomerInput) => (e: { target: { value: string } }) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const msg = validateCustomer(v);
          setErr(msg);
          if (!msg) onSubmit(v);
        }}
      >
        <Field label="Name / Firmenname *">
          <input className={inputClass} value={v.name} onChange={set("name")} autoFocus />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ansprechpartner">
            <input className={inputClass} value={v.contact_person} onChange={set("contact_person")} />
          </Field>
          <Field label="Kundennummer (optional)">
            <input className={inputClass} value={v.customer_number} onChange={set("customer_number")} />
          </Field>
        </div>
        <Field label="Straße und Hausnummer">
          <input className={inputClass} value={v.street} onChange={set("street")} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="PLZ">
            <input className={inputClass} value={v.postal_code} onChange={set("postal_code")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ort">
              <input className={inputClass} value={v.city} onChange={set("city")} />
            </Field>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-Mail">
            <input type="email" className={inputClass} value={v.email} onChange={set("email")} />
          </Field>
          <Field label="Telefon">
            <input className={inputClass} value={v.phone} onChange={set("phone")} />
          </Field>
          <Field label="Land">
            <input className={inputClass} value={v.country} onChange={set("country")} />
          </Field>
          <Field label="USt-IdNr.">
            <input className={inputClass} value={v.vat_id} onChange={set("vat_id")} />
          </Field>
        </div>
        <Field label="Notizen">
          <textarea className={`${inputClass} min-h-20`} value={v.notes} onChange={set("notes")} />
        </Field>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Speichern
          </button>
        </div>
      </form>
    </Modal>
  );
}
