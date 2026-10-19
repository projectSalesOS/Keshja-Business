import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/AppShell";
import { TariffComparison } from "@/components/TariffComparison";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/preise")({
  head: () => ({
    meta: [
      { title: "Free, Basic & Premium – KESHJA Business" },
      {
        name: "description",
        content:
          "Vergleiche die monatlichen KESHJA Business Tarife mit Buchungsrechten und KI-Belegscan-Kontingenten.",
      },
      { property: "og:title", content: "Tarife – KESHJA Business" },
      {
        property: "og:description",
        content:
          "Free, Basic und Premium: Preise, Kontingente und tatsächlich verfügbare Funktionen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <main className="business-ui mx-auto min-h-screen max-w-6xl space-y-8 px-5 py-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/">
          <Logo />
        </Link>
        <Button variant="outline" asChild>
          <Link to="/auth" search={{ mode: "login" }}>
            Anmelden
          </Link>
        </Button>
      </header>
      <section className="py-8">
        <h1 className="text-3xl font-semibold">Tarife für dein Business</h1>
        <p className="mb-8 mt-3 text-muted-foreground">
          Monatliche Preise · Freischaltung aktuell durch den Betreiber.
        </p>
        <TariffComparison publicPage />
        <p className="mt-7 text-sm text-muted-foreground">
          Es gibt noch keinen Checkout. Testzeiträume werden nur manuell eingerichtet.{" "}
          <Link to="/rechtliches" className="text-primary">
            Rechtliche Angaben und Kontakt sind noch offen.
          </Link>
        </p>
      </section>
    </main>
  ),
});
