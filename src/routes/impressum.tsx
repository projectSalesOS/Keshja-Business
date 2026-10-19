import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, publicLegalOptions } from "@/components/LegalDocument";
import { legalHead } from "@/lib/legal";
export const Route = createFileRoute("/impressum")({
 loader: ({ context }) => context.queryClient.fetchQuery(publicLegalOptions()),
 head: () => legalHead("Impressum", "KESHJA Business: Zentrale Anbieter- und Kontaktangaben mit gekennzeichnetem Prüfstand."),
 component: () => <LegalDocument kind="imprint" />,
});
