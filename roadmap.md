# Keshja Business – Roadmap

## Menüführung (19.10.2026)
- [ ] Bisherige Seitenleiste und untere Navigation durch einen Menü-Button und linkes Seitenmenü auf allen Bildschirmgrößen ersetzen; vorhandene Ziele, Profil und Abmelden erhalten.
- [ ] Öffnen/Schließen, Zielwechsel, aktive Markierung, Neuladen und kleine Smartphone-/Desktop-Darstellung mit echtem Konto prüfen.

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
