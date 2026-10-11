import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { currency } from "@/lib/finance";
import { FIXED_COST_CATEGORIES } from "@/lib/mock-data";
import { useFixedCosts } from "@/hooks/useFixedCosts";

export const Route = createFileRoute("/_authenticated/fixkosten")({
  head: () => ({
    meta: [
      { title: "Fixkosten – KESHJA" },
      {
        name: "description",
        content:
          "Wiederkehrende Kosten wie Miete, Strom, Internet, Versicherungen, Streaming und Telefon übersichtlich verwalten.",
      },
      { property: "og:title", content: "Fixkosten – KESHJA" },
      {
        property: "og:description",
        content: "Alle monatlichen Fixkosten an einem Ort verwalten.",
      },
    ],
  }),
  component: FixkostenPage,
});

function FixkostenPage() {
  const { items, monthly, add: addFixedCost, remove } = useFixedCosts();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(FIXED_COST_CATEGORIES[0] as string);
  const [amount, setAmount] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!name.trim() || !Number.isFinite(value) || value <= 0) return;
    addFixedCost({
      name: name.trim(),
      category,
      amount: value,
      interval: "monatlich",
      dueDay: 1,
    });
    setName("");
    setAmount("");
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Fixkosten" description="Wiederkehrende Kosten im Überblick." />

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Summe pro Monat
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{currency(monthly)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{items.length} Positionen</p>
        </div>

        <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {items.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {f.category} · {f.interval} · fällig am {f.dueDay}.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">{currency(f.amount)}</span>
                <button
                  type="button"
                  aria-label={`${f.name} entfernen`}
                  onClick={() => remove(f.id)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form
          onSubmit={add}
          className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-card sm:grid-cols-[1fr_auto_auto_auto]"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bezeichnung"
            className={inputClass}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {FIXED_COST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Betrag"
            className={`${inputClass} sm:w-32`}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Hinzufügen
          </button>
        </form>
      </div>
    </AppShell>
  );
}