import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ReceiptCapture } from "@/components/ReceiptCapture";
import { useReceipts } from "@/hooks/useReceipts";
import { currency, formatDate } from "@/lib/finance";
import { colorToken } from "@/lib/categories";
import { type Receipt } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/kassenbons")({
  validateSearch: (search: Record<string, unknown>): { capture?: "1" } =>
    search["capture"] === "1" ? { capture: "1" } : {},
  head: () => ({
    meta: [
      { title: "Kassenbons – KESHJA" },
      {
        name: "description",
        content:
          "Kassenbons fotografieren, hochladen, durchsuchen und alle Positionen mit Kategorie und Unterkategorie einsehen.",
      },
      { property: "og:title", content: "Kassenbons – KESHJA" },
      {
        property: "og:description",
        content: "Alle erfassten Kassenbons mit Geschäft, Datum, Uhrzeit und Gesamtsumme.",
      },
    ],
  }),
  component: KassenbonsPage,
});

function KassenbonsPage() {
  const { capture } = Route.useSearch();
  const receipts = useReceipts();
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
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Kassenbons"
          description="Fotografieren, hochladen und durchsuchen – ohne manuelle Eingabe."
        />

        <ReceiptCapture autoStart={capture === "1"} />

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
              Keine Kassenbons gefunden.
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
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}