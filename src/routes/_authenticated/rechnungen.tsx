import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { OrgGate } from "@/components/OrgGate";
import { DocumentsView } from "@/components/DocumentsView";

export const Route = createFileRoute("/_authenticated/rechnungen")({
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
  component: () => (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Rechnungen" description="Rechnungen, Zahlungseingänge, Mahnungen und Stornos." />
        <OrgGate>{(ctx) => <DocumentsView kind="invoice" ctx={ctx} />}</OrgGate>
      </div>
    </AppShell>
  ),
});
