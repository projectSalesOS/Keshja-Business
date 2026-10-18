# Keshja Business – Roadmap

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
