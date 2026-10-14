import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SectionTabs } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { DocumentsView } from "@/components/DocumentsView";

export const Route = createFileRoute("/_authenticated/angebote")({
  validateSearch: (search: Record<string, unknown>): { neu?: "1" } => (search["neu"] === "1" ? { neu: "1" } : {}),
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
  component: function Page() {
    const { neu } = Route.useSearch();
    return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Angebote & Rechnungen" description="Angebote erstellen, versenden und in Rechnungen umwandeln." />
        <SectionTabs tabs={[{ to: "/rechnungen", label: "Rechnungen" }, { to: "/angebote", label: "Angebote" }]} />
        <OrgGate>{(ctx) => <DocumentsView kind="quote" ctx={ctx} startNew={neu === "1"} />}</OrgGate>
      </div>
    </AppShell>
  );
  },
});
