import { Link } from "@tanstack/react-router";
import { legalLinks } from "@/lib/legal";
export function LegalLinks() {
  return <nav aria-label="Rechtliche Dokumente" className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground">
    {legalLinks.map(([to, label]) => <Link key={to} to={to} className="hover:text-primary">{label}</Link>)}
  </nav>;
}
export function LegalFooter() {
  return <footer className="business-ui border-t border-border px-5 pb-24 pt-6 sm:px-8">
    <div className="mx-auto max-w-6xl space-y-3"><LegalLinks /><p className="text-xs text-muted-foreground">KESHJA BUSINESS · Geschäftskundenangebot</p></div>
  </footer>;
}
export function ContractNotice({ registration = false }: { registration?: boolean }) {
  return <aside className="space-y-3 border-y border-border py-4 text-xs leading-relaxed text-muted-foreground">
    <p>{registration ? "Die Registrierung startet ein kostenloses Konto und bestellt kein kostenpflichtiges Abonnement. Das Angebot richtet sich an Unternehmer (§ 14 BGB) für ihre berufliche oder gewerbliche Tätigkeit." : "Kostenpflichtige Tarife verlängern sich im gewählten Zahlungsrhythmus. Die abschließenden Bestelldaten zeigt das Zahlungsformular. Kündigung und Abonnementverwaltung: Tarif & Nutzung → Abonnement verwalten oder kündigen."}</p>
    <LegalLinks />
  </aside>;
}