import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { DocumentsView } from "@/components/DocumentsView";

export const Route = createFileRoute("/_authenticated/angebote")({
  head: () => ({
    meta: [
      { title: "Angebote – Keshja Business" },
      { name: "description", content: "Angebote erstellen, ausgeben, als PDF herunterladen und in Rechnungen umwandeln." },
      { property: "og:title", content: "Angebote – Keshja Business" },
      { property: "og:description", content: "Angebotsverwaltung für dein Unternehmen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Angebote" description="Angebote erstellen, ausgeben und bei Annahme in eine Rechnung umwandeln." />
        <OrgGate>{(ctx) => <DocumentsView kind="quote" ctx={ctx} />}</OrgGate>
      </div>
    </AppShell>
  ),
});
