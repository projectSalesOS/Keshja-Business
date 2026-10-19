import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, publicLegalOptions } from "@/components/LegalDocument";
import { legalHead } from "@/lib/legal";
export const Route = createFileRoute("/datenschutz")({
 loader: ({ context }) => context.queryClient.fetchQuery(publicLegalOptions()),
 head: () => legalHead("Datenschutzerklärung", "KESHJA Business: Datenschutzentwurf zu Cloud, KI, E-Mail und Zahlungen."),
 component: () => <LegalDocument kind="privacy" />,
});
