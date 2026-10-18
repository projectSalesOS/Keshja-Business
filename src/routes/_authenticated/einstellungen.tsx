import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Logo, PageHeader } from "@/components/AppShell";
import { AccountCard } from "@/components/AccountCard";
import { OrganizationCard } from "@/components/OrganizationCard";

export const Route = createFileRoute("/_authenticated/einstellungen")({
  head: () => ({
    meta: [
      { title: "Einstellungen – KESHJA Business" },
      {
        name: "description",
        content: "Unternehmen, Profil und Darstellung in KESHJA Business verwalten.",
      },
      { property: "og:title", content: "Einstellungen – KESHJA Business" },
      { property: "og:description", content: "Unternehmens- und Kontoeinstellungen von KESHJA Business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EinstellungenPage,
});

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function EinstellungenPage() {
  const [dark, setDark] = useState(false);
  const [aiComments, setAiComments] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleClass =
    "h-5 w-9 appearance-none rounded-full bg-muted transition-colors checked:bg-primary";

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Einstellungen" description="Grundlegende Optionen für KESHJA." />

        <div className="grid gap-4 lg:grid-cols-2">
          <OrganizationCard />
          <AccountCard />
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-card">
          <Row title="Dark Mode" description="Dunkle Darstellung aktivieren">
            <label className="flex h-11 w-11 shrink-0 items-center justify-center"><input
              aria-label="Dark Mode"
              type="checkbox"
              checked={dark}
              onChange={(e) => setDark(e.target.checked)}
              className={toggleClass}
            /></label>
          </Row>
          <Row title="KI-Kommentare" description="Zusammenfassungen in Berichten und Dashboard">
            <label className="flex h-11 w-11 shrink-0 items-center justify-center"><input
              aria-label="KI-Kommentare"
              type="checkbox"
              checked={aiComments}
              onChange={(e) => setAiComments(e.target.checked)}
              className={toggleClass}
            /></label>
          </Row>
          <Row title="Währung" description="Anzeigewährung der Auswertungen">
            <span className="text-sm font-medium">EUR (€)</span>
          </Row>
          <Row title="Sprache" description="Oberflächensprache">
            <span className="text-sm font-medium">Deutsch</span>
          </Row>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-card">
          <Logo />
          <span className="text-xs text-muted-foreground">Version 1.0</span>
        </div>
      </div>
    </AppShell>
  );
}