import { Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getPublicLegal } from "@/lib/legal.functions";
import { LEGAL_FIELDS, missingLegalFields, type LegalKey } from "@/lib/legal";
import { Logo } from "./AppShell";
import { TariffComparison } from "./TariffComparison";
export const publicLegalOptions = () => queryOptions({ queryKey: ["public-legal"], queryFn: () => getPublicLegal(), staleTime: 0 });
export type LegalDocumentKind = "imprint" | "privacy" | "terms" | "contract" | "status";
const titles = { imprint: "Impressum", privacy: "Datenschutzerklärung", terms: "AGB für Geschäftskunden", contract: "Preis-, Vertrags- und Kündigungsinformationen", status: "Rechtliche Angaben & Kontakt" };
function Section({ title, children }: { title: string; children: ReactNode }) {
 return <section className="space-y-3 border-t border-border pt-6"><h2 className="text-lg font-semibold">{title}</h2>{children}</section>;
}
export function LegalDocument({ kind }: { kind: LegalDocumentKind }) {
 const { data } = useSuspenseQuery(publicLegalOptions());
 const d = data.details;
 const value = (key: LegalKey) => d[key]?.trim() || `Noch offen: ${LEGAL_FIELDS.find(([k]) => k === key)?.[1] ?? key}`;
 const supplied = (key: LegalKey) => <p className="whitespace-pre-wrap break-words">{value(key)}</p>;
 const missing = missingLegalFields(d);
 return <main className="business-ui mx-auto min-h-screen max-w-4xl space-y-7 px-5 py-8 text-sm leading-relaxed">
 <Link to="/" aria-label="KESHJA Business Startseite"><Logo /></Link>
 <h1 className="break-words pt-5 text-2xl font-semibold [hyphens:auto] sm:text-3xl">{titles[kind]}</h1>
 <Section title={kind === "privacy" ? "Verantwortlicher und Kontakt" : "Anbieter"}>
 <p className="font-medium">{value("company_name")} · {value("legal_form")}</p>
 <p>Betreiber / Vertretungsberechtigte: {value("operator_name")}</p>
 <p>{value("street")}<br />{value("postal_code")} {value("city")}<br />{value("country")}</p>
 <p className="break-words">E-Mail: {value("email")}</p>
 {d.phone && <p>Telefon: {d.phone}</p>}{d.website && <p className="break-words">Website: {d.website}</p>}
 </Section>
 {kind === "imprint" && <>
 <Section title="Register, Umsatzsteuer und besondere Pflichtangaben">
 <p>Registergericht: {d.register_court || "Nicht angegeben – Eintragung prüfen."}</p>
 <p>Registernummer: {d.register_number || "Nicht angegeben – falls eingetragen ergänzen."}</p>
 <p>Umsatzsteuer-ID: {d.vat_id || "Nicht angegeben – falls vorhanden ergänzen."}</p>
 <p>{d.supervisory_info || "Zulassungs-, Aufsichts- und Berufsangaben sind nicht bestätigt; falls einschlägig ergänzen."}</p>
 <p>Die interne Steuernummer wird nicht veröffentlicht.</p>
 </Section>
 <Section title="Ergänzende Anbieterangaben">{d.imprint_extra ? supplied("imprint_extra") : <p>Einzelfallabhängige Pflichten, insbesondere § 5 DDG und gegebenenfalls redaktionelle Verantwortlichkeit nach § 18 MStV, müssen vor Freigabe geprüft werden.</p>}</Section>
 </>}
 {kind === "privacy" && <>
 <Section title="1. Zwecke, Datenarten und Rechtsgrundlagen">
 <p>Verarbeitet werden Konto- und Kontaktdaten, Organisationszugehörigkeit und Rollen sowie eingegebene Kunden-, Buchungs-, Beleg-, Angebots-, Rechnungs- und Zahlungsdaten. Anmeldung, E-Mail-Bestätigung und Passwortwiederherstellung nutzen den konfigurierten Authentifizierungsdienst.</p>
 <p>Eigene Konto- und Vertragsdaten werden auf Art. 6 Abs. 1 lit. b DSGVO gestützt, soweit die betroffene Person Vertragspartei ist. Bei Beschäftigtenkonten sind Art. 6 Abs. 1 lit. f DSGVO und die Interessen an Bereitstellung, Berechtigungssteuerung und Missbrauchsschutz individuell abzuwägen. Gesetzlich vorgeschriebene eigene Nachweise beruhen auf Art. 6 Abs. 1 lit. c DSGVO, soweit die konkrete Pflicht besteht.</p>
 <p>Für personenbezogene Geschäftsdaten der Kunden müssen Verantwortlichkeit, Weisungen und Auftragsverarbeitung nach Art. 28 DSGVO vertraglich geklärt werden. Kunden bleiben für Rechtsgrundlage und Rechtmäßigkeit ihrer Eingaben verantwortlich. Ein abgeschlossener Kunden-AVV wird nicht behauptet.</p>
 </Section>
 <Section title="2. Hosting und Anmeldung – Lovable Cloud / Supabase">
 <p>Konten, Geschäftsdaten, Tarife, Nutzungsreservierungen und Änderungsprotokolle werden über Lovable Cloud mit Supabase verarbeitet. Organisationsdaten sind über Mitgliedschaftsberechtigungen getrennt zugänglich. Firmenlogos liegen in zugriffsgeschütztem Speicher. Die Anmeldung verwendet browserseitigen Sitzungsspeicher; Zahlungsfunktionen können weitere technisch erforderliche Speicherung einsetzen.</p>
 <p>Juristische Vertragspartner, Regionen, Unterauftragnehmer, Protokolle, Drittlandtransfers und tatsächliche Löschfristen müssen anhand aktiver Verträge bestätigt werden. Zertifizierungen und weitergehende Sicherheitsgarantien werden nicht zugesagt.</p>
 </Section>
 <Section title="3. E-Mail – Resend und Authentifizierungsdienst">
 <p>Dokumentversand übermittelt Empfängeradresse, Betreff, Nachricht, optional eine Antwortadresse und PDF-Anhang an Resend über den Lovable-Gateway. Registrierungen können eine Betreiberbenachrichtigung mit Registrierungsdaten auslösen. Bestätigungs- und Passwortnachrichten laufen über den Authentifizierungsdienst; dessen tatsächlicher Versanddienst und Aufbewahrung sind gesondert zu bestätigen.</p>
 </Section>
 <Section title="4. Belegscan, KI und Sprachbuchung">
 <p>Beim KI-Belegscan werden Bild und Ausleseanweisung an das Lovable AI Gateway übermittelt. Aktuell konfigurierte Modellkennung: openai/gpt-5.4-mini. Tatsächlicher Modellanbieter, Verarbeitungsorte, Aufbewahrung und weitere Nutzung müssen bestätigt werden; eine Nichtverwendung zu Trainingszwecken wird nicht unterstellt.</p>
 <p>Die App speichert das Scanbild nicht als dauerhafte OCR-Bilddatei. Bildhash, Reservierungsstatus und normalisiertes Ergebnis können in der Nutzungsverarbeitung verbleiben; gespeicherte Belege enthalten erkannte Daten. Ergebnisse sind vor Speicherung zu prüfen. Keine automatisierte rechtlich erhebliche Entscheidung über betroffene Personen ist eingerichtet.</p>
 <p>Premium-Sprachbuchung verwendet Browser-Spracherkennung. Audio kann je nach Browser und Einstellungen an den Browseranbieter übertragen werden. Dafür wird kein eigener kostenpflichtiger Transkriptionsdienst verwendet. Mikrofonfreigabe und Hinweise des Browsers sind zu beachten.</p>
 </Section>
 <Section title="5. Stripe / verwaltete Zahlungen">
 <p>Übertragen werden insbesondere Kontaktdaten, Kunden-/Organisationszuordnung, Tarif und Zahlungsrhythmus. Zahlungsdaten verarbeitet das eingebettete Stripe-Formular, nicht die Geschäftstabellen der App. Verifizierte Zahlungsereignisse aktualisieren Kunden-/Abonnementreferenzen, Status und Laufzeit. Die Verwaltung kann das Stripe-Kundenportal öffnen.</p>
 <p>Aktuell ist Testbetrieb eingerichtet. Für Livebetrieb sind tatsächliche Vertragspartei, Steuerabwicklung, Anbieterrollen und Datenübermittlungen zu klären. Zahlungsanbieter können je Vorgang eigenständig verantwortlich oder Auftragsverarbeiter sein; pauschale Rollen werden nicht behauptet.</p>
 </Section>
 <Section title="6. Weitere Empfänger, Datenstandorte und Drittlandübermittlungen">
 <p>Die Oberfläche lädt Schriftarten über Google Fonts / Google-Server und Bildassets über die konfigurierte Asset-Auslieferung; dabei werden Verbindungsdaten übermittelt. Rechtsgrundlage und Drittlandübermittlung externer Abrufe sind zu prüfen. Rein lokale Schriftauslieferung wird nicht behauptet. Eine vom Betreiber konfigurierte Werbeanalyse ist nicht eingerichtet; Hosting- und Zahlungsanbieter können eigene technische Verarbeitung vornehmen.</p>
 {supplied("provider_details")}
 </Section>
 <Section title="7. Speicherdauer und Auftragsverarbeitung">{supplied("retention")}{supplied("processing_agreements")}<p>Tarifende löscht Geschäftsdaten nicht automatisch. Fristen für eigene Vertrags-/Buchungsnachweise, Kundeninhalte, Protokolle und Sicherungskopien sind getrennt festzulegen. Gesetzliche Aufbewahrungspflichten müssen konkret benannt werden.</p></Section>
 <Section title="8. Betroffenenrechte und Kontakt">
 <p>Bei Vorliegen der gesetzlichen Voraussetzungen bestehen Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung und Datenübertragbarkeit (Art. 15–20 DSGVO). Bei berechtigten Interessen besteht ein Widerspruchsrecht nach Art. 21 DSGVO. Erteilte Einwilligungen können mit Wirkung für die Zukunft widerrufen werden. Es besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde (Art. 77 DSGVO).</p>
 <p>Kontakt: {d.privacy_contact || value("email")}. Zuständige Aufsichtsbehörde nach Festlegung des Betreibersitzes ergänzen.</p>
 <p>Erforderliche Konto- und Vertragsdaten sind für Nutzung und Abwicklung nötig. Daten stammen überwiegend aus Nutzerangaben, KI-Ergebnissen und Zahlungsbestätigungen. Für indirekt betroffene Kundenkontakte sind zusätzlich Informationspflichten nach Art. 14 DSGVO zu prüfen.</p>
 {d.privacy_extra && supplied("privacy_extra")}
 </Section>
 </>}
 {kind === "terms" && <>
 <Section title="1. Geltung und Leistungsgegenstand"><p>Dieser Entwurf betrifft Unternehmer (§ 14 BGB), die KESHJA BUSINESS für berufliche oder gewerbliche Tätigkeit nutzen. Maßgeblich ist der tatsächliche Vertragszweck, nicht allein eine Formularbestätigung. Die App unterstützt Kundenverwaltung, Buchungen, Belege, Angebote, Rechnungen und Auswertungen; sie ersetzt keine Steuer-, Rechts- oder Buchhaltungsberatung. Nutzer prüfen Eingaben und KI-Ergebnisse.</p>{supplied("consumer_policy")}{supplied("service_terms")}</Section>
 <Section title="2. Konto und Daten"><p>Zugangsdaten sind vertraulich zu behandeln. Inhaber/Admins verwalten Unternehmensmitgliedschaften; Plattformrechte entstehen daraus nicht. Nutzer dürfen nur rechtmäßig verarbeitbare Daten einstellen. Verantwortlichkeiten und erforderliche Auftragsverarbeitung sind vor Nutzung verbindlich zu regeln.</p>{supplied("processing_agreements")}</Section>
 <Section title="3. Vertrag, Preise und Laufzeit">{supplied("contract_formation")}<p>Registrierung bestellt kein kostenpflichtiges Abonnement. Basic/Premium werden gesondert bestellt oder manuell freigeschaltet. Aktuelle Preise und Kontingente stammen aus der zentralen Tarifverwaltung; maßgebliche Bestelldaten müssen vor Abschluss feststehen. Änderungen der Anzeige ändern bereits vereinbarte Preise nicht automatisch.</p><p>Monatliche bzw. jährliche Abrechnung folgt der Auswahl; der Jahresbetrag ist im Voraus zahlbar. Abonnements können sich im vereinbarten Rhythmus verlängern. Manuelle Freischaltungen gelten bis zum hinterlegten Ablauf; keine automatische kostenpflichtige Testphase.</p>{supplied("tax_info")}<Link to="/vertragsinformationen" className="text-primary">Aktuelle Preis- und Vertragsinformationen</Link></Section>
 <Section title="4. Kündigung und Tarifende"><p>Inhaber/Admins erreichen das Kundenportal über „Tarif & Nutzung → Abonnement verwalten oder kündigen“. Kündigung erhält Rechte bis zum Ende des gültigen bezahlten Zeitraums. Danach gelten Free-Rechte; Daten werden nicht automatisch gelöscht. Kündigungsfrist und Alternative bei Portalproblemen sind festzulegen.</p>{supplied("cancellation_terms")}</Section>
 <Section title="5. Leistungsstörungen, Gewährleistung und Haftung">{supplied("liability_terms")}<p>Keine erfundenen Haftungsausschlüsse, Verfügbarkeitsgarantien, Supportfristen oder Vertragsstrafen. Zwingende Rechte bleiben unberührt. B2B-Klauseln sind insbesondere nach §§ 307, 310 BGB zu prüfen.</p></Section>
 <Section title="6. Weitere Vertragsregeln"><p>Vertragssprache, Rechtswahl, zulässiger Gerichtsstand und Änderungen bestehender Verträge sind individuell zu prüfen. Eine Veröffentlichung dieses Entwurfs ändert abgeschlossene Verträge nicht allein.</p>{d.terms_extra && supplied("terms_extra")}</Section>
 </>}
 {kind === "contract" && <>
  <Section title="Aktuelle Tarife und Preise"><TariffComparison /><p>Aktuelle zentrale Preise und Kontingente. Der Anbieter unterliegt der regulären Umsatzsteuer. Brutto-/Nettodarstellung sowie Vertragspartner und Steuerabwicklung des Zahlungsdienstes sind vor Freigabe zu prüfen. Bei Abweichungen von abschließenden Bestelldaten vor Bestellung Klärung verlangen.</p>{supplied("tax_info")}</Section>
 <Section title="Vertrag und Zahlung"><p>Free ist ohne Zahlungsdaten kostenlos. Monatliche Zahlung bezieht sich auf den Monat; jährliche Zahlung auf den Jahresgesamtbetrag im Voraus. Jahrespreis ÷ 12 ist ein Vergleichswert, keine monatliche Abbuchung.</p>{supplied("contract_formation")}<p>Die Zahlungsintegration läuft aktuell im Testmodus – keine Freigabe echter Zahlungen. Vertragsbestätigung, Korrekturmöglichkeiten und Zahlungsbedingungen des tatsächlichen Dienstes sind vor Livebetrieb abzugleichen.</p></Section>
 <Section title="Laufzeit, Verlängerung und Kündigung"><p>Abonnements verlängern sich im vereinbarten Rhythmus. Inhaber/Admins erreichen die Verwaltung unter „Tarif & Nutzung → Abonnement verwalten oder kündigen“. Kündigung erhält Rechte bis Ende des gültigen bezahlten Zeitraums, danach gelten Free-Rechte. Manuelle Freischaltungen werden nicht durch Zahlungsereignisse überschrieben.</p>{supplied("cancellation_terms")}</Section>
 <Section title="Widerruf und B2B-Abgrenzung"><p>Bei einem tatsächlich ausschließlich unternehmerischen Vertrag besteht grundsätzlich kein gesetzliches Verbraucher-Widerrufsrecht nach §§ 312g, 355 BGB. Die Bezeichnung „B2B“ allein schließt Verbraucherrechte nicht aus.</p><p>Wenn Verbraucher zugelassen werden oder als Verbraucher kontrahieren, müssen Fernabsatzinformationen, Widerrufsbelehrung mit Musterformular, Bestellpflichten und gegebenenfalls Kündigungsschaltfläche (§§ 312i, 312j, 312k BGB) gesondert umgesetzt werden. Keine fertige Verbraucherbelehrung wird vorgetäuscht; Verbraucherfreigabe erst nach Klärung.</p>{supplied("consumer_policy")}</Section>
 </>}
 {kind === "status" && <>
 <Section title="Noch fehlende Pflichtangaben"><ul className="list-disc space-y-2 pl-5">{missing.map(([key, label]) => <li key={key}>{label}</li>)}</ul>{!missing.length && <p>Keine leeren Basisfelder; keine rechtliche Vollständigkeitsbestätigung.</p>}</Section>
 </>}
  </main>;
}
