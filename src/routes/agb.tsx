import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, publicLegalOptions } from "@/components/LegalDocument";
import { legalHead } from "@/lib/legal";
export const Route = createFileRoute("/agb")({
 loader: ({ context }) => context.queryClient.fetchQuery(publicLegalOptions()),
 head: () => legalHead("AGB für Geschäftskunden", "KESHJA Business: Individuell zu prüfende B2B-Vertragsbedingungen."),
 component: () => <LegalDocument kind="terms" />,
});
