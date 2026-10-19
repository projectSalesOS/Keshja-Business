import { z } from "zod";

export const LEGAL_FIELDS = [
  ["company_name", "Unternehmensname", true],
  ["legal_form", "Rechtsform", true],
  ["operator_name", "Vollständiger Betreibername / Vertretungsberechtigte", true],
  ["street", "Straße und Hausnummer (ladungsfähig)", true],
  ["postal_code", "Postleitzahl", true],
  ["city", "Ort", true],
  ["country", "Land", true],
  ["email", "Öffentliche Kontakt-E-Mail", true],
  ["phone", "Telefon", false],
  ["website", "Website (https://…)", false],
  ["register_court", "Registergericht (falls eingetragen)", false],
  ["register_number", "Registernummer (falls eingetragen)", false],
  ["vat_id", "Umsatzsteuer-ID (falls vorhanden)", false],
  ["tax_number", "Steuernummer (nur intern, nicht öffentlich)", false],
  ["supervisory_info", "Zulassung / Aufsicht / Berufsangaben (falls erforderlich)", false],
  ["privacy_contact", "Datenschutzkontakt / Datenschutzbeauftragter (falls erforderlich)", false],
  ["provider_details", "Dienstleister: juristische Namen, Rollen, Datenstandorte und Drittlandgarantien", true],
  ["retention", "Speicherfristen / Löschkonzept je Datenart", true],
  ["processing_agreements", "Auftragsverarbeitung: bestätigte Verträge und Bezugsmöglichkeit des Kunden-AVV", true],
  ["tax_info", "Bestätigte Umsatzsteuerbehandlung und Rechnungsstellung", true],
  ["contract_formation", "Vertragsschluss / Vertragsbestätigung / Vertragssprache / Speicherung", true],
  ["cancellation_terms", "Kündigung: Frist, Wirksamkeit und Alternative zum Kundenportal", true],
  ["service_terms", "Leistungsumfang, Support, Verfügbarkeit und Wartung (nur vereinbarte Zusagen)", true],
  ["liability_terms", "Individuell geprüfte Haftungs- und Gewährleistungsregelungen", true],
  ["consumer_policy", "B2B-Abgrenzung / Umgang mit Verbraucheranmeldungen", true],
  ["imprint_extra", "Ergänzende Anbieterangaben", false],
  ["privacy_extra", "Ergänzende Datenschutzhinweise", false],
  ["terms_extra", "Ergänzende Vertragsbedingungen", false],
  ["review_notes", "Öffentlicher Prüfstand / noch offene rechtliche Punkte", false],
] as const;
export type LegalKey = typeof LEGAL_FIELDS[number][0];
export type LegalDetails = Partial<Record<LegalKey, string>>;
const shape = Object.fromEntries(LEGAL_FIELDS.map(([key]) => [key, z.string().trim().max(10000).optional()]));
export const legalDetailsSchema = z.object(shape).strict().superRefine((data, ctx) => {
  if (data["email"] && !z.string().email().safeParse(data["email"]).success)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Gültige Kontakt-E-Mail angeben." });
  if (data["website"] && !/^https?:\/\/[^\s]+$/.test(data["website"]))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["website"], message: "Website mit https:// oder http:// angeben." });
});
export function missingLegalFields(details: LegalDetails) {
  return LEGAL_FIELDS.filter(([key, , required]) => required && !details[key]?.trim());
}
export type LegalData = { details: LegalDetails; updated_at: string | null };
export const legalLinks = [
  ["/impressum", "Impressum"], ["/datenschutz", "Datenschutz"], ["/agb", "AGB (B2B)"],
  ["/vertragsinformationen", "Vertrag & Kündigung"], ["/rechtliches", "Prüfstand & Kontakt"],
] as const;
export function legalHead(title: string, description: string) {
  return { meta: [ { title: `${title} – KESHJA Business` }, { name: "description", content: description },
    { property: "og:title", content: `${title} – KESHJA Business` }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" } ] };
}