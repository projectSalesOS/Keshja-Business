import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarCheck, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Field, Modal, OrgGate, btnPrimary, btnSecondary, inputClass } from "@/components/OrgGate";
import { useFixedCosts, type RecurringExpense, type RecurringInput } from "@/hooks/useFixedCosts";
import { EXPENSE_CATEGORIES, INTERVALS, parseAmount, todayIso, type RecurringInterval } from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/fixkosten")({
  head: () => ({
    meta: [
      { title: "Wiederkehrende Ausgaben – Keshja Business" },
      { name: "description", content: "Wiederkehrende Geschäftsausgaben verwalten und fällige Beträge kontrolliert buchen." },
      { property: "og:title", content: "Wiederkehrende Ausgaben – Keshja Business" },
      { property: "og:description", content: "Miete, Software, Versicherungen und weitere regelmäßige Kosten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Wiederkehrende Ausgaben" description="Regelmäßige Geschäftsausgaben im Überblick." />
        <OrgGate>{({ orgId, isAdmin }) => <RecurringView orgId={orgId} isAdmin={isAdmin} />}</OrgGate>
      </div>
    </AppShell>
  ),
});

function RecurringView({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const { items, monthly, isLoading, error, save, remove, bookDue } = useFixedCosts(orgId);
  const [editing, setEditing] = useState<RecurringExpense | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monatliche Belastung (aktiv)</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{currency(monthly)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{items.length} Positionen</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            disabled={bookDue.isPending || items.length === 0}
            onClick={async () => {
              try {
                const n = await bookDue.mutateAsync();
                toast.success(n ? `${n} fällige Ausgabe(n) als offene Buchung angelegt.` : "Keine neuen fälligen Ausgaben – alles bereits gebucht.");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {bookDue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
            Fällige buchen
          </button>
          <button type="button" className={btnPrimary} onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Neu
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        „Fällige buchen“ legt für jeden Termin bis heute genau eine offene Ausgabe unter Finanzen an. Bereits gebuchte Termine werden nie doppelt erzeugt.
      </p>

      <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <li className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Wird geladen …
          </li>
        ) : error ? (
          <li className="px-5 py-6 text-sm text-destructive">Daten konnten nicht geladen werden.</li>
        ) : items.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">Noch keine wiederkehrenden Ausgaben.</li>
        ) : (
          items.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{f.name}</span>
                  {!f.active ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Pausiert</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {f.category} · {f.interval} · ab {formatDate(f.startDate)}
                  {f.endDate ? ` bis ${formatDate(f.endDate)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">{currency(f.amount)}</span>
                <button type="button" aria-label={`${f.name} bearbeiten`} onClick={() => setEditing(f)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                  <Pencil className="h-4 w-4" />
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    aria-label={`${f.name} löschen`}
                    onClick={async () => {
                      if (!confirm("Wiederkehrende Ausgabe löschen? Bereits erzeugte Buchungen bleiben erhalten.")) return;
                      try {
                        await remove.mutateAsync(f.id);
                        toast.success("Gelöscht.");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>

      {editing ? (
        <RecurringForm
          item={editing === "new" ? null : editing}
          busy={save.isPending}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            try {
              await save.mutateAsync({ id: editing === "new" ? undefined : editing.id, values });
              toast.success("Gespeichert.");
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

function RecurringForm({
  item,
  busy,
  onClose,
  onSubmit,
}: {
  item: RecurringExpense | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: RecurringInput) => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [category, setCategory] = useState(item?.category ?? EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(item ? String(item.amount).replace(".", ",") : "");
  const [interval, setInterval] = useState<RecurringInterval>(item?.interval ?? "monatlich");
  const [startDate, setStartDate] = useState(item?.startDate ?? todayIso());
  const [endDate, setEndDate] = useState(item?.endDate ?? "");
  const [active, setActive] = useState(item?.active ?? true);
  const [err, setErr] = useState<string | null>(null);
  const cats: string[] = [...EXPENSE_CATEGORIES];
  if (category && !cats.includes(category)) cats.push(category);

  return (
    <Modal title={item ? "Wiederkehrende Ausgabe bearbeiten" : "Neue wiederkehrende Ausgabe"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const value = parseAmount(amount);
          if (!name.trim()) return setErr("Bitte eine Bezeichnung angeben.");
          if (value === null) return setErr("Bitte einen gültigen Betrag größer 0 eingeben.");
          if (!startDate) return setErr("Bitte ein Startdatum angeben.");
          if (endDate && endDate < startDate) return setErr("Das Enddatum liegt vor dem Startdatum.");
          setErr(null);
          onSubmit({
            name: name.trim(),
            description: description.trim() || null,
            category,
            amount: value,
            interval,
            startDate,
            endDate: endDate || null,
            active,
          });
        }}
      >
        <Field label="Bezeichnung *">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Büromiete" />
        </Field>
        <Field label="Beschreibung">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Betrag (€) *">
            <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Intervall">
            <select className={inputClass} value={interval} onChange={(e) => setInterval(e.target.value as RecurringInterval)}>
              {INTERVALS.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Kategorie">
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Startdatum (erste Fälligkeit) *">
            <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Enddatum (optional)">
            <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Aktiv
        </label>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Abbrechen</button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Speichern
          </button>
        </div>
      </form>
    </Modal>
  );
}
