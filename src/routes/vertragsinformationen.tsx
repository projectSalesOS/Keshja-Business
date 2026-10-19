import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, publicLegalOptions } from "@/components/LegalDocument";
import { legalHead } from "@/lib/legal";
export const Route = createFileRoute("/vertragsinformationen")({
 loader: ({ context }) => context.queryClient.fetchQuery(publicLegalOptions()),
 head: () => legalHead("Preis-, Vertrags- und Kündigungsinformationen", "KESHJA Business: Aktuelle Tarife, Laufzeiten, Kündigung und Widerrufsabgrenzung."),
 component: () => <LegalDocument kind="contract" />,
});
