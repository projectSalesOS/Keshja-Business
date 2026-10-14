import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SectionTabs } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { DocumentsView } from "@/components/DocumentsView";

export const Route = createFileRoute("/_authenticated/rechnungen")({
  validateSearch: (search: Record<string, unknown>): { neu?: "1" } => (search["neu"] === "1" ? { neu: "1" } : {}),
  head: () => ({
    meta: [
      { title: "Rechnungen – Keshja Business" },
      { name: "description", content: "Rechnungen schreiben, Zahlungen erfassen, Mahnungen vorbereiten und stornieren." },
      { property: "og:title", content: "Rechnungen – Keshja Business" },
      { property: "og:description", content: "Rechnungen, Zahlungen und Mahnwesen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function Page() {
    const { neu } = Route.useSearch();
    return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Angebote & Rechnungen" description="Rechnungen schreiben, versenden und Zahlungen erfassen." />
        <SectionTabs tabs={[{ to: "/rechnungen", label: "Rechnungen" }, { to: "/angebote", label: "Angebote" }]} />
        <OrgGate>{(ctx) => <DocumentsView kind="invoice" ctx={ctx} startNew={neu === "1"} />}</OrgGate>
      </div>
    </AppShell>
  );
  },
});
