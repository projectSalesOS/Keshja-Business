import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, FileText, Camera, Wallet, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/AppShell";
import { TariffComparison } from "@/components/TariffComparison";
import { Button } from "@/components/ui/button";
import logo from "@/assets/keshja-business-logo.png.asset.json";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KESHJA Business – Super. Easy. Business." },
      {
        name: "description",
        content:
          "Geschäftsfinanzen, Belege, Angebote und Rechnungen für Selbstständige und kleine Unternehmen. Free, Basic und Premium im Vergleich.",
      },
      { property: "og:title", content: "KESHJA Business – Super. Easy. Business." },
      {
        property: "og:description",
        content: "Deine Buchungen, Belege und Rechnungen an einem Ort. Kostenlos starten.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});
function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);
  return (
    <div className="business-ui min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <Link to="/" aria-label="KESHJA Business Startseite">
          <Logo />
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <a href="#funktionen" className="hidden text-muted-foreground sm:block">
            Funktionen
          </a>
          <Link to="/preise" className="text-muted-foreground">
            Tarife
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/auth" search={{ mode: "login" }}>
              Login
            </Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/auth" search={{ mode: "register" }}>
              Registrieren
            </Link>
          </Button>
        </nav>
      </header>
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-12 pt-9 text-center sm:pb-16 sm:pt-14">
          <img
            src={logo.url}
            alt="KESHJA"
            className="mx-auto mb-5 h-24 w-24 object-contain sm:h-32 sm:w-32"
          />
          <p className="mb-3 text-sm font-medium text-primary">KESHJA BUSINESS</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
            Super. Easy. Business.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Dein Unternehmen. Deine Zahlen. Alles im Blick.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Buchungen, Belege, Angebote und Rechnungen an einem Ort – für Selbstständige und kleine
            Unternehmen.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth" search={{ mode: "register" }}>
                Kostenlos starten <ArrowRight size={18} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/preise">Tarife vergleichen</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free ohne Zahlungsdaten. Bezahlte Tarife aktuell im Zahlungstest oder per manueller Freischaltung.
          </p>
        </section>
        <section id="funktionen" className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 className="mb-8 text-2xl font-semibold">Mehr Klarheit im Geschäftsalltag</h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  Icon: Wallet,
                  title: "Finanzen im Überblick",
                  text: "Einnahmen und Ausgaben erfassen, wiederkehrende Kosten buchen und echte Geschäftszahlen auswerten.",
                },
                {
                  Icon: Camera,
                  title: "Belege statt Papierchaos",
                  text: "Kassenbons fotografieren, mit KI auslesen und die erkannten Beträge vor dem Speichern prüfen.",
                },
                {
                  Icon: FileText,
                  title: "Vom Angebot zur Rechnung",
                  text: "Kunden verwalten, Angebote und Rechnungen erstellen, PDFs exportieren und Zahlungen zuordnen.",
                },
              ].map(({ Icon, title, text }) => (
                <div key={title}>
                  <Icon size={26} className="mb-4 text-primary" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="text-3xl font-semibold">Dein passender Tarif</h2>
          <p className="mb-7 mt-3 text-sm text-muted-foreground">
            Jährlich oder monatlich zahlbar. Ein gemeinsames Kontingent für dein Unternehmen.
          </p>
          <TariffComparison publicPage />
        </section>
        <section className="border-y border-border">
          <div className="mx-auto max-w-3xl px-5 py-12">
            <h2 className="mb-6 text-2xl font-semibold">Häufige Fragen</h2>
            {[
              [
                "Kann ich kostenlos starten?",
                "Ja. Free enthält ein begrenztes Buchungs- und Scan-Kontingent, Kundenverwaltung und Standardberichte. Die aktuellen Limits stehen im Tarifvergleich.",
              ],
              [
                "Wie erhalte ich Basic oder Premium?",
                "Inhaber und Admins können unter Tarif & Nutzung einen Testcheckout starten. Zusätzlich kann der Betreiber Tarife manuell freischalten. Echte Zahlungen sind noch nicht freigegeben.",
              ],
              [
                "Was passiert nach Ablauf einer Freischaltung?",
                "Es gelten wieder die Free-Rechte. Bestehende Daten bleiben erhalten; neue Vorgänge unterliegen den aktuellen Limits. Eine Kündigung erhält den noch gültigen bezahlten Zeitraum.",
              ],
              [
                "Was zählt als KI-Belegscan?",
                "Vor jeder KI-Analyse wird ein Scan reserviert. Erfolgreiche Aufrufe werden bestätigt. Bei unklarem Ausgang bleibt die Reservierung bestehen, damit bereits ausgeführte Aufrufe nicht kostenlos wiederholt werden.",
              ],
              [
                "Wie funktioniert die Sprachbuchung?",
                "Premium nutzt die Spracherkennung deines Browsers. Erkannte Buchungsdaten werden vor dem Speichern geprüft und bestätigt. Browserunterstützung und Mikrofonfreigabe sind erforderlich.",
              ],
            ].map(([q, a]) => (
              <details key={q} className="border-b border-border py-4">
                <summary className="cursor-pointer font-medium">{q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-12 text-center">
          <Check className="mx-auto mb-3 text-primary" />
          <h2 className="text-2xl font-semibold">Zeit für dein Business.</h2>
          <Button className="mt-5" size="lg" asChild>
            <Link to="/auth" search={{ mode: "register" }}>
              Konto erstellen <ArrowRight size={18} />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-7 text-sm">
          <Logo />
          <div className="flex flex-wrap gap-5 text-muted-foreground">
            <Link to="/preise">Tarife</Link>
            <Link to="/rechtliches">Rechtliches & Kontakt · Prüfstand</Link>
            <Link to="/auth" search={{ mode: "login" }}>
              Anmelden
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
