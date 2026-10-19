import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, publicLegalOptions } from "@/components/LegalDocument";
export const Route = createFileRoute("/rechtliches")({
  loader: ({ context }) => context.queryClient.fetchQuery(publicLegalOptions()),
  head: () => ({
    meta: [
      { title: "Offene rechtliche Angaben – KESHJA Business" },
      {
        name: "description",
        content:
          "Status der noch ausstehenden Betreiber-, Kontakt- und Datenschutzhinweise für KESHJA Business.",
      },
      { property: "og:title", content: "Rechtliche Angaben – KESHJA Business" },
      {
        property: "og:description",
        content: "Betreiberangaben, Kontakt und Rechtstexte sind noch nicht hinterlegt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <LegalDocument kind="status" />,
});
