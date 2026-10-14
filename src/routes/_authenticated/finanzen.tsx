import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, SectionTabs } from "@/components/AppShell";
import { OrgGate, btnPrimary, inputClass } from "@/components/OrgGate";
import { useCustomers, useDeleteTransaction, useTransactions, type Transaction } from "@/hooks/useBusiness";
import { TransactionForm } from "@/components/TransactionForm";
import { useFixedCosts } from "@/hooks/useFixedCosts";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TX_STATUS_LABEL,
  categoriesFor,
  filterTransactions,
  totals,
  type TxFilter,
} from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finanzen")({
  validateSearch: (search: Record<string, unknown>): { neu?: "1" } => (search["neu"] === "1" ? { neu: "1" } : {}),
  head: () => ({
    meta: [
      { title: "Einnahmen & Ausgaben – Keshja Business" },
      { name: "description", content: "Geschäftliche Einnahmen und Ausgaben erfassen und filtern." },
      { property: "og:title", content: "Einnahmen & Ausgaben – Keshja Business" },
      { property: "og:description", content: "Einnahmen und Ausgaben deines Unternehmens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Einnahmen & Ausgaben" description="Alle Buchungen erfassen, suchen und filtern." />
        <SectionTabs tabs={[{ to: "/finanzen", label: "Buchungen" }, { to: "/kassenbons", label: "Belege" }, { to: "/auswertungen", label: "Berichte" }]} />
        <OrgGate>{({ orgId, isAdmin }) => <FinanceView orgId={orgId} isAdmin={isAdmin} />}</OrgGate>
      </div>
    </AppShell>
  ),
});

const DEFAULT_FILTER: TxFilter = {
  type: "all",
  status: "all",
  month: "",
  category: "",
  search: "",
  sort: "date_desc",
};

function FinanceView({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const { data = [], isLoading, error } = useTransactions(orgId);
  const { data: customers = [] } = useCustomers(orgId);
  const del = useDeleteTransaction(orgId);
  const fixed = useFixedCosts(orgId);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [editing, setEditing] = useState<Transaction | "new" | null>(Route.useSearch().neu === "1" ? "new" : null);

  const list = useMemo(() => filterTransactions(data, filter), [data, filter]);
  const sums = totals(list);
  const customerName = new Map(customers.map((c) => [c.id, c.name]));
  const cats = filter.type === "all" ? [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] : categoriesFor(filter.type);
  const upd = <K extends keyof TxFilter>(k: K, v: TxFilter[K]) => setFilter((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {fixed.items.length > 0 ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={fixed.bookDue.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
            onClick={async () => {
              try {
                const n = await fixed.bookDue.mutateAsync();
                toast.success(n > 0 ? `${n} wiederkehrende Ausgabe(n) gebucht.` : "Alle fälligen Fixkosten sind bereits gebucht.");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {fixed.bookDue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Fällige Fixkosten buchen
          </button>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Einnahmen", sums.income],
          ["Ausgaben", sums.expense],
          ["Saldo", sums.balance],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-base font-semibold tabular-nums sm:text-xl">{currency(value as number)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select className={inputClass} value={filter.type} onChange={(e) => upd("type", e.target.value as TxFilter["type"])}>
          <option value="all">Alle Arten</option>
          <option value="income">Einnahmen</option>
          <option value="expense">Ausgaben</option>
        </select>
        <select className={inputClass} value={filter.status} onChange={(e) => upd("status", e.target.value as TxFilter["status"])}>
          <option value="all">Alle Status</option>
          <option value="offen">Offen</option>
          <option value="bezahlt">Bezahlt</option>
        </select>
        <select className={inputClass} value={filter.category} onChange={(e) => upd("category", e.target.value)}>
          <option value="">Alle Kategorien</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input type="month" className={inputClass} value={filter.month} onChange={(e) => upd("month", e.target.value)} aria-label="Monat" />
        <select className={inputClass} value={filter.sort} onChange={(e) => upd("sort", e.target.value as TxFilter["sort"])}>
          <option value="date_desc">Neueste zuerst</option>
          <option value="date_asc">Älteste zuerst</option>
          <option value="amount_desc">Betrag absteigend</option>
          <option value="amount_asc">Betrag aufsteigend</option>
        </select>
        <button type="button" className={btnPrimary} onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Neue Buchung
        </button>
      </div>
      <input className={inputClass} placeholder="Beschreibung oder Kategorie suchen" value={filter.search} onChange={(e) => upd("search", e.target.value)} />

      <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <li className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Buchungen werden geladen …
          </li>
        ) : error ? (
          <li className="px-5 py-6 text-sm text-destructive">Buchungen konnten nicht geladen werden.</li>
        ) : list.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">
            {data.length ? "Keine Buchungen für diese Filter." : "Noch keine Buchungen erfasst."}
          </li>
        ) : (
          list.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.description || t.category}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(t.booking_date)} · {t.category}
                  {t.customer_id ? ` · ${customerName.get(t.customer_id) ?? "Kunde"}` : ""}
                  {t.receipt_id ? " · Beleg" : ""}
                  {t.recurring_expense_id ? " · wiederkehrend" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${t.status === "offen" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}
                >
                  {TX_STATUS_LABEL[t.status]}
                </span>
                <span className={`text-sm font-semibold tabular-nums ${t.type === "income" ? "text-primary" : ""}`}>
                  {t.type === "income" ? "+" : "−"}
                  {currency(t.amount)}
                </span>
                <button type="button" aria-label="Bearbeiten" onClick={() => setEditing(t)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                  <Pencil className="h-4 w-4" />
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    aria-label="Löschen"
                    onClick={async () => {
                      if (!confirm("Buchung wirklich löschen?")) return;
                      try {
                        await del.mutateAsync(t.id);
                        toast.success("Buchung gelöscht.");
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
        <TransactionForm
          orgId={orgId}
          tx={editing === "new" ? null : editing}
          linkedReceipts={new Set(data.filter((t) => t.receipt_id).map((t) => t.receipt_id!))}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

