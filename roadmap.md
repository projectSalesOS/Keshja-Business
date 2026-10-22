# Keshja Business – Roadmap

## OCR-Umsatzsteuer-Aufteilung (22.10.2026)
- [x] Gemeldete 11,26 € reproduziert: 5,39 € als Netto führt zu 6,41 € Brutto; OCR-Spalten bisher ohne Steuergruppenmarker. Unvollständige Aufteilungen verwenden erkanntes Brutto, vollständige Widersprüche bleiben sichtbar; gedruckte A/B-Gruppen mit Pfand/Rabatten werden gegengeprüft, ohne Brutto zu überschreiben. Korrekturaktion berechnet Netto/Steuer explizit aus Brutto. Originalfoto/OCR-Antwort fehlt, daher konkrete ursprüngliche Erkennungsursache nicht abschließend bewiesen.
- [x] 54 Tests bestanden; angemeldet falsche Aufteilung serverseitig zurückgewiesen, Warnung/Korrektur/Speichern/Neuladen mit temporärem separatem Testbeleg geprüft und Testbeleg entfernt. Ergebnis 9,93 € netto + 1,24 € Steuer = 11,17 € brutto, keine Laufzeitfehler, Build OK; kein neuer echter OCR-Aufruf und keine Änderung vorhandener Geschäftsdaten.

## Rechtsfelder konkret befüllen (19.10.2026)
- [x] Bestehende Betreiberangaben erhalten; zehn thematische Entwürfe und öffentlicher Prüfstand über das autorisierte Betreiberformular auditiert gespeichert. Tatsächliche Tarifpreise aus zentraler Datenquelle und amtliche Rechtsquellen geprüft.
- [x] Speicherung/Neuladen und öffentliche Übernahme auf Impressum, Datenschutz, AGB, Vertragsinformationen und Prüfstand mit echtem Betreiberkonto sowie anonymem Browser geprüft; 21 Tests bestanden, Build OK. Falsche 19-%-Preishinweise und unbelegte monatliche Kündigungszusage korrigiert; keine Zahlungs-/Steuerkonfiguration oder Kundengeschäftsdaten geändert.
- [x] Persönliche Bestätigungen und rechtliche Freigabepunkte im öffentlichen Prüfstand konkret benannt; Warnungen erhalten, optionale persönliche Angaben nicht erfunden.
- [ ] Rechtliche Veröffentlichung wartet auf persönliche Bestätigung von Betreiberangaben/§19-Voraussetzungen/Support/Kündigungsweg und Frist sowie geprüfte B2B-Abgrenzung, Vertragsannahme/Bestätigung, Zahlungsanbieter-Steuerbehandlung, Haftung, Dienstleisterverträge/Regionen/Transfers, Löschkonzept und Kunden-AVV.

## Unternehmensdaten & Rechtliches (19.10.2026)
- [x] Zentrale persistente Betreiberangaben, auditiertes Speichern nur durch Plattformbetreiber, öffentliche Positivliste ohne interne Steuernummer; additive Migrationen 0012–0014.
- [x] Impressum, Datenschutz, B2B-AGB und Vertrags-/Widerrufsinformationen als gekennzeichnete Entwürfe; gemeinsame Fußzeile und Hinweise bei Registrierung/Checkout. Zentrale Tarifpreise auch im Buchungsbereich.
- [x] 21 Tests bestanden; echte Betreiber-Speicherung/Neuladen und anonyme Übernahme auf vier Dokumentseiten geprüft, interne Steuernummer ausgeschlossen, Testangaben entfernt. Öffentliche Rechtsseiten und Registrierung mobil/Desktop erreichbar, Formulare befüllt, keine Laufzeitfehler, Build OK. Anonyme Schreibfunktion verweigert; direkte Kundenschreibrechte entzogen. Details: docs/legal-implementation.md.
- [ ] Individuelle Rechtsfreigabe und reale Betreiber-/Vertragsangaben: wartet auf Anbieteridentität, Anschrift, Kontakt, Dienstleister-/Kunden-AVV, Datenregionen/Fristen, Steuer-/Vertrags-/Kündigungsbedingungen und B2B-Abgrenzung. Vollständige Neuregistrierung/Mailzustellung in diesem Durchgang nicht verifiziert.

## Tarife, Landingpage und Betreiberverwaltung (19.10.2026)
- [x] Zentrale Tarife (Free 0 €, Basic 9,90 €, Premium 19,90 €), Abonnements und protokollierte manuelle Freischaltungen; additive Migrationen 0007/0008. Free-Startwerte: 50 aktive reine Handbuchungen, 3 OCR/UTC-Kalendermonat; Angebote/Rechnungen zunächst in allen Tarifen.
- [x] Atomare Buchungs-/OCR-Limits, wiederholbare Scan-IDs, sichere Erstattungen, Tarifrechte und Mandanten-/Betreiberschutz; Sprache/Logo/erweiterte Reportfilter Premium, bestehende Daten und Standardberichte erhalten.
- [x] Öffentliche Landingpage unter /, Tarifvergleich /preise, persönliche Tarifseite /tarif, angemeldeter Bereich /dashboard, bestehende übrige URLs erhalten; /rechtliches benennt echte Lücken.
- [x] Betreiberbereich /admin samt Regeln, Abonnements, Nutzern, Nutzung und Audit; kontrolliertes Ersteinrichtungsskript und docs/tariffs-operations.md, keine dauerhafte Betreiberfreigabe automatisch gesetzt.
- [x] 101 Vitest-Tests, 12 zurückgerollte Datenbanktests, 28 echte API-Integrationstests einschließlich paralleler letzter Buchungs-/OCR-Slots, 10 direkte unberechtigte API-Aufrufe; echte Admin-UI-Freischaltung, simulierte Sprachbuchung mit Bestätigung/Speicherung/Rücklesen, Premium-Filter und PDF-Download. Öffentliche Seiten 320/411 px und Desktop, zehn angemeldete Seiten mobil, kein Überlauf/Laufzeitfehler, Build OK. Temporäre Organisationen/Freigaben entfernt. Kein echter kostenpflichtiger KI-Aufruf, kein echter Mikrofontest, keine neue Registrierung/Passwortanmeldung, kein neuer echter E-Mail-Versand oder Rechnungsausgabe-/Zahlungs-End-to-End-Test; bestehende Tests für deren Logik bestanden.
- [ ] Dauerhafte Betreiberfreigabe: wartet auf explizit bestätigtes Betreiberkonto durch den Projektinhaber.
- [ ] Rechtliche Veröffentlichungsvoraussetzungen: wartet auf Impressum/Anschrift, freigegebene Datenschutzerklärung, öffentlichen Kontaktweg und Umsatzsteuerbehandlung der Preise.

## Menüführung (19.10.2026)
- [x] Bisherige Seitenleiste und untere Navigation durch einen Menü-Button und linkes Seitenmenü auf allen Bildschirmgrößen ersetzt; sieben vorhandene Hauptziele, Unterbereiche, Profil und Abmelden erhalten.
- [x] Mit echtem Konto geprüft: sieben Zielwechsel, aktive Markierung und Neuladen, Belege-/Berichte-Unterbereiche, X/Overlay/Escape und scrollbares Menü bei 320/411/768/1280 px sowie kurzem Querformat. Keine Überbreite oder Laufzeitfehler; 89 bestehende Tests bestanden, Build OK. Keine Daten-, Berechtigungs- oder Geschäftslogikänderungen.

- [x] Dashboard-Reihenfolge: Kennzahlen → drei Schnellzugriffe → Liniendiagramm → Balkendiagramm → Ausgabenübersicht → Letzte Buchungen. Nur Anordnung verschoben, keine Funktionen oder Inhalte geändert; 89 Tests bestanden, drei Aktionen navigieren weiterhin korrekt, beide Diagramme mit denselben Daten, 320/411/1280 px ohne Überbreite, Abstände 12 px mobil / 16 px Desktop, Build OK, keine Laufzeitfehler.


- [x] Dashboard nach neuer Vorlage: funktionaler Kopfbereich, breite Sprachaktion, Farbstreifen, zentraler Gewinn, nebeneinanderliegende Kennzahlen, getrennte Diagramme, kompakte Aktionen und fünfteilige Mobilnavigation mit vollständigem Mehr-Menü. 27 Tests bestanden; echte Daten und beide Diagrammreihen für Monat/Vormonat/6 Monate/leeren Zeitraum abgeglichen; 320/411/1280 px ohne Überbreite; drei Aktionen, Kopf-Zeitraum und offene Rechnungen sowie Mehr-Menü geprüft; simulierte Sprachbuchung bestätigt, gespeichert, zurückgelesen und Testbuchung gelöscht. Build OK, keine Laufzeitfehler. Abweichungen: Sprachbons existieren nicht, bestehende Sprachbuchung ehrlich benannt; Browser-Datumsfelder statt identischer Referenzsteuerung; vorhandene Kategorien/letzte Buchungen/offene Rechnungen bleiben unter den Schnellaktionen erhalten. Echte Audioerkennung bleibt geräteabhängig ungeprüft.

- [x] Dashboard: kompakte Kennzahlen ohne Minidiagramme, separates gruppiertes Sechsmonats-Balkendiagramm mit derselben gefilterten Datenreihe wie der Linienverlauf, kräftigere bestehende Marken-/Kennzahlenfarben. 23 Tests bestanden; beide Diagramme und Beträge mit echten Kontodaten für Monat, Vormonat, sechs Monate und leeren Zeitraum abgeglichen; drei bestehende Aktionen geöffnet; 320/411/1280 px geprüft, mobile Kennzahlen ca. 120 px hoch, keine Überbreite oder Laufzeitfehler. Andere Seiten, Navigation und Geschäftslogik unverändert.

- [x] Dashboard nach Referenz: ruhige Glasflächen, Gewinnverlauf, Einnahmen-/Ausgaben-Minigrafiken, reale Ausgabenkategorien, synchronisierte Zeitraumfilter und drei bestehende Schnellaktionen. 36 Tests bestanden; echte Kontodaten für Monat/Vormonat/6 Monate/leeren Zeitraum abgeglichen, drei Aktionen geöffnet, 320/411/1280 px ohne Überbreite, simulierte Spracherkennung mit Bestätigung gespeichert/zurückgelesen und Testbuchung entfernt; Build OK, keine Laufzeitfehler. Sprachgesteuerte Belegerstellung existiert nicht: bestehende Spracheingabe erstellt bestätigte Buchungen; Belege bleiben foto-/uploadbasiert. Echte Mikrofonaufnahme weiter geräteabhängig offen.

- [x] Premium-Fintech-UI: neutrales Designsystem, gezielte Markenverläufe, lesbare horizontal scrollbare Mobilnavigation, kompakte Kennzahlen, gemeinsame Formulare und semantische Berichtskarten. Zehn angemeldete Seiten bei 320/411/1280 px und fünf Erfassungsdialoge ohne Überbreite geprüft; vier Schnellaktionen, Anmeldeseiten und dunkle Darstellung geprüft, keine Laufzeitfehler, 78 bestehende Tests bestanden. Keine Daten oder Geschäftslogik geändert; reale Mikrofonaufnahme, E-Mail und PDF-Inhalte nicht erneut getestet.

- [x] Globales Design vereinheitlicht: Soft-Pastell-Farben, dezente Glasflächen, gemeinsame Konturen und Kontrollzustände; neun Bereiche und drei Erfassungsdialoge bei 1280/411 px ohne Überbreite geprüft, Dunkelmodus kontrolliert, keine Laufzeitfehler, 42 bestehende Finanz-/Dokumenttests bestanden. Funktionen, Daten und Navigation unverändert.

- [x] Etappe 1: Organisationen, Mitglieder, Rollen (Inhaber/Admin/Mitarbeiter), RLS, Unternehmensdaten in Einstellungen
- [x] Etappe 1b: Nummernkreise (automatisch, AN-/RE-Jahr-laufende Nr.)
- [x] Etappe 2: Kunden, Finanzen (Einnahmen/Ausgaben, wiederkehrend – Fixkosten übernehmen), Belege (Upload, privater Speicher, KI-Scan aus bestehendem Kassenbon-Scan)
- [x] Etappe 3: Angebote, Rechnungen, Storno, Zahlungen, Mahnwesen, PDF
- [x] Etappe 4: Dashboard, Auswertungen, Liquiditätsvorschau, Bericht (PDF) + CSV
- [x] Haushalts-Funktion aus der Oberfläche entfernt (Tabellen stillgelegt, Daten behalten)
- [x] Design-Update: zentrale Violett-Pink-Farben und sechs pastellfarbene Dashboard-Akzentstreifen, ohne Funktions- oder Layoutumbau

## Vereinfachung (Okt 2026)
- [x] Dashboard-Optimierung: direkter Sprachstart über vorhandene Erkennung, Gewinnfarben und vier Schnellaktionen; 29 Tests bestanden, Layout 320/411/1280 px ohne Überbreite, vier Erfassungsansichten geöffnet, simulierte Spracherkennung mit Bestätigung gespeichert/zurückgelesen/Testbuchung gelöscht; Freigabefehler und nicht unterstützter Browser geprüft. Echte Mikrofonerkennung bleibt geräteabhängig offen (siehe unten).
- [x] Gezielte Verbesserungen: KPI-Farben/Konturen, Navigation, Profilbegrüßung und Sechsmonatsdiagramm (Desktop/Mobil geprüft)
- [x] Bestätigte Sprachbuchung ohne zusätzlichen kostenpflichtigen Dienst (Parser und bestätigtes Speichern mit simulierter Erkennung geprüft)
- [x] OCR: korrigierbare Netto-/Steuer-/Bruttobeträge mit mehreren Steuersätzen, Speicherung und Tests (echter OCR-Aufruf mit synthetischem 7-/19-%-Beleg)
- [ ] Echte Mikrofonerkennung auf dem Nutzergerät prüfen (im Browser-Test nur simulierte Spracherkennung verfügbar)
- [x] Dashboard 3 Kennzahlen + Schnellaktionen, abgerundete Akzentbalken
- [x] Navigation 6 Bereiche, Liquidität entfernt
- [x] Berichte Monat/Quartal/Jahr/frei, PDF+CSV
- [x] Firmenlogo (Upload, PDFs)
- [x] E-Mail-Versand mit PDF-Anhang (Code fertig)
- [x] E-Mail-Dienst (Resend) verbunden; eigene Absenderdomain in Resend noch offen
- [x] Futuristic-Premium-Fintech-Design nach Referenzbild: Lavendel-Weiß-Verlauf, Glasflächen, Violett-Magenta-Akzente (2026-10-18)

## Dashboard-Optimierung (19.10.2026)
- [x] Datenschutzhinweis unter Sprachbuchung entfernt
- [x] KPI-Kacheln verlinkt auf gefilterte Buchungsübersicht (typ+monat)
- [x] Standard-Zeitraum „Monat" bestätigt; alle Kennzahlen synchron
- [x] Diagrammzeitraum entkoppelt (6M/12M/Jahr/Quartal), Linien- und Balkendiagramm synchron, 0-€-Monate, Zukunft als Lücke
- [x] Geprüft: 89 Tests, tsgo, Playwright Mobil/Desktop, Filterübernahme, kein Overflow

## PDF-Bericht optimiert (19.10.2026)
- [x] Firmenkopf: Logo links, Name/Adresse/Kontakt/Steuerdaten daneben, Zeitraum + Erstellungsdatum
- [x] Umsatzsteuerübersicht: USt aus Rechnungen (Stornos abgezogen), Vorsteuer aus Beleg-Aufschlüsselung, Zahllast/Erstattung, Hinweise bei fehlenden Daten, §19-Hinweis
- [x] Fußzeile mit Trennlinie und Seitenzahlen; „Saldo" bleibt Saldo
- [x] Geprüft: 89 Tests, tsgo, PDF-Download mit echtem Konto, Layout/Seitenumbruch per Rendering

## Tarifumschalter & Registrierungs-Benachrichtigung (19.10.2026)
- [x] Getrennte Monats-/Jahrespreise in der Datenbank (Basic 12,90/118,80 €, Premium 19,90/202,80 €, Free 0 €), altes Preisfeld als veraltet markiert
- [x] Umschalter jährlich/monatlich auf Landingpage und Preisseite (Standard jährlich, Effektivpreis + Jahresbetrag, Hinweis inkl. 19 % USt.)
- [x] Adminbereich pflegt beide Preise auditiert
- [x] Zahlungsintervall wird zur Registrierung weitergereicht und dort angezeigt
- [x] Betreiber-E-Mail bei Neuregistrierung (duplikatgeschützt, blockiert Registrierung nie); OPERATOR_NOTIFICATION_EMAIL hinterlegt
- [ ] RESEND_FROM_EMAIL mit verifizierter Absenderdomain (sonst Zustellung nur an Resend-Kontoinhaber)
- [ ] Impressum/Datenschutz/Kontakt/USt-Angabe weiterhin offen

## Stripe-Abonnements Testmodus (19.10.2026)
- [x] Eingebaute Stripe-Integration aktiviert; Produkte keshja_basic/keshja_premium mit je monatlichem und jährlichem Preis (12,90/118,80/19,90/202,80 EUR, Steuercode SaaS) angelegt.
- [x] Serverseitiger Checkout (nur Inhaber/Admin, Preis-IDs aus tariff_plans, managed payments, keine Browser-Preise), Embedded Checkout auf /tarif mit Intervall-Umschalter, Kundenportal für Online-Abos.
- [x] Webhook /api/public/payments/webhook mit Signaturprüfung, Idempotenz (stripe_events), Status-Sync in subscriptions (source 'provider'), Schutz manueller Freischaltungen, Audit-Einträge.
- [x] Getestet: echte Testzahlung 4242 bis checkout=success, signierte Simulation aktivieren/kündigen, Duplikat-Zustellung, ungültige Signaturen 400, 106 Unit-Tests, Typsicherheit. Live-Zahlungen warten auf ausdrückliche Freigabe und Stripe-Go-Live.
