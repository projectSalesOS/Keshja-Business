# Unternehmensdaten und Rechtliches

## Zugriff und Datenquelle
- Betreiberverwaltung `/admin` → „Unternehmensdaten & Rechtliches“.
- Plattformbetreiberangaben sind von Kundenorganisationen getrennt. Bestehende Firmenangaben der Kunden bleiben unverändert.
- Auditiertes Speichern über `operator_save_legal_settings`; Prüfung durch `private.is_platform_operator`. Keine direkten Schreibrechte für Kunden oder anonyme Nutzer.
- Öffentliche Projektion schließt interne Steuernummer aus. Rechtsseiten laden beim Öffnen/Neuladen aus derselben Quelle. Unvollständige Angaben können gespeichert werden, bleiben als fehlend markiert.

## Seiten und Änderungen
Neue öffentliche Seiten: `/impressum`, `/datenschutz`, `/agb`, `/vertragsinformationen`; bestehendes `/rechtliches` zeigt Kontakt und offenen Prüfstand.
Gemeinsame Fußzeile auf allen Seiten; Hinweise bei Registrierung und vor eingebettetem Checkout. Keine angebliche Zustimmung zu ungeprüften AGB. Registrierung bleibt kostenlos und bestellt kein Abo.
Dateien: `src/lib/legal.ts`, `legal.functions.ts`, `legal.test.ts`; `src/components/LegalDocument.tsx`, `LegalLinks.tsx`, `LegalSettingsEditor.tsx`; vier neue Rechtsrouten; Anpassungen an rechtliches, root, admin, auth, index, preise, tarif und TariffComparison; AGENTS und Roadmap.
Migrationen: `0012_platform_legal_settings.sql`, `0013_legal_public_projection.sql`, ergänzende Projektion `0014_legal_disclosure_allowlist.sql`.
Tarifbuchungsanzeige verwendet jetzt ebenfalls zentrale Tarifpreise statt fest codierter Beträge. Keine Änderung von Zahlungsrechten oder Live-Aktivierung.

## Prüfstand
Entwürfe, keine individuelle Rechtsfreigabe. Fehlende Angaben: tatsächlicher Anbieter/Vertreter, Anschrift, Kontakt, Rechtsform, ggf. Register/USt-ID/Berufsangaben; Dienstleisterverträge und Rollen, Datenregionen, Drittlandgarantien, Speicher-/Löschfristen, Kunden-AVV, Umsatzsteuer/Vertragspartner der Zahlungsintegration, Vertragsschluss/-bestätigung, Kündigungsfrist/Ersatzkontakt, Leistungs-/Supportzusagen und Haftung, verbindliche B2B-Abgrenzung. Kein Verbraucher-Widerrufsformular vor Klärung der Zielgruppe.
Grundlagen: § 5 DDG; Art. 13/14/28 DSGVO; §§ 307/310 BGB; bei Verbraucherzulassung §§ 312i/312j/312k/312g/355 BGB. Anbieterrollen/Verträge nicht aus Softwarebibliotheken ableiten.

## Tatsächlich ausgeführte Tests
- 21 Vitest-Tests: vier neue Validierungs-/Pflichtfeldtests und 17 Tariftests bestanden.
- Playwright: alle fünf Rechtsseiten, Preise und Registrierung erreichbar; Rechtslinks vorhanden. Echte Betreibersitzung: synthetische Angaben speichern → neu laden → auf vier öffentlichen Seiten zurücklesen. Interne Steuernummer dort nicht sichtbar. Testangaben anschließend entfernt; nur Auditspur verbleibt.
- Mobile 411 × 708: Rechtsseiten und Registrierung ohne Überbreite, Formulare befüllt; Betreiber-Menü erreichbar; keine Browser-Laufzeitfehler.
- Bestehende Registrierung: Formular und Hinweise geprüft, nicht erneut abgesendet; keine Bestätigungsmail-Zustellung oder vollständige Neuregistrierung in diesem Durchgang verifiziert.
- Keine echten Geschäftsdaten verändert, keine echten Zahlungen ausgelöst, keine Dienstleister-Verträge als abgeschlossen bestätigt.