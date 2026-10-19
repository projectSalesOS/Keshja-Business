import { useState } from "react";
import { Check, Minus, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePlans } from "@/hooks/useTariff";
import { formatCents, monthlyPriceCents, type BillingInterval } from "@/lib/tariffs";
import { Button } from "@/components/ui/button";

export function TariffComparison({ publicPage = false }: { publicPage?: boolean }) {
  const q = usePlans();
  const [interval, setInterval] = useState<BillingInterval>("annual");
  if (q.isPending) return <p className="text-muted-foreground">Tarife werden geladen …</p>;
  if (q.error)
    return (
      <p role="alert" className="text-destructive">
        Tarife konnten nicht geladen werden.
      </p>
    );
  return (
    <div>
      <div
        role="group"
        aria-label="Zahlungsintervall"
        className="mb-6 inline-flex rounded-full border border-border bg-card p-1"
      >
        {(
          [
            ["annual", "Jährliche Zahlung"],
            ["monthly", "Monatliche Zahlung"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={interval === value}
            onClick={() => setInterval(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              interval === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {q.data.map((p) => (
          <article
            key={p.id}
            className={`glass-tile rounded-lg border p-6 ${p.id === "premium" ? "border-primary/40" : "border-border"}`}
          >
            <h3 className="text-xl font-semibold">{p.name}</h3>
            <p className="mb-1 mt-5 text-3xl font-semibold">
              {formatCents(monthlyPriceCents(p, interval))}
              <span className="ml-2 text-sm font-normal text-muted-foreground">/ Monat</span>
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              {p.id === "free"
                ? "Dauerhaft kostenlos."
                : interval === "annual"
                  ? `${formatCents(p.price_cents_annual)} pro Jahr, jährlich im Voraus zahlbar.`
                  : "Monatlich zahlbar."}
            </p>
            <ul className="space-y-3 text-sm">
              {[
                [
                  `${p.manual_limit ?? "Unbegrenzte"} manuelle Buchungen${p.manual_limit === null ? "" : " insgesamt"}`,
                  true,
                ],
                [`${p.ocr_limit} KI-Belegscans / Monat`, p.ocr_limit > 0],
                ["Angebote & Rechnungen", p.documents],
                ["Kundenverwaltung, Standardberichte & PDF", true],
                ["Sprachbuchung", p.voice],
                ["Firmenlogo auf Dokumenten", p.logo],
                ["Erweiterte Kategorie-/Kundenauswertung", p.advanced_reports],
              ].map(([text, available]) => (
                <li
                  key={String(text)}
                  className={`flex items-start gap-2 ${available ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {available ? (
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                  ) : (
                    <Minus size={16} className="mt-0.5 shrink-0" />
                  )}
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            {publicPage ? (
              <Button asChild className="mt-6 w-full">
                <Link to="/auth" search={{ mode: "register", interval }}>
                  Kostenlos starten <ArrowRight size={16} />
                </Link>
              </Button>
            ) : (
              <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
                Freischaltung durch den Betreiber. Keine Onlinezahlung verfügbar.
              </p>
            )}
          </article>
        ))}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Alle Preise inklusive 19 % Umsatzsteuer.
      </p>
    </div>
  );
}
