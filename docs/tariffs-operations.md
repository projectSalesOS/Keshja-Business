# Tarife und Betreiberzugang

## Einrichtung

Es wurde **kein dauerhaftes Betreiberkonto automatisch ausgewählt oder freigeschaltet**. Unternehmens-Inhaber/Admins sind keine Plattformbetreiber.

Der Projektinhaber bestätigt zuerst die UUID eines existierenden, E-Mail-bestätigten Betreiberkontos. Anschließend kann eine vertrauenswürdige administrative Cloud-Datenänderung einen Eintrag in `public.platform_operators` setzen und ihn in `public.subscription_audit` protokollieren. Kein Browser-Formular oder öffentliches Bootstrap-Endpunkt existiert. Alternativ steht `scripts/setup-operator.ts` für eine bereits sicher konfigurierte, vertrauenswürdige Serverumgebung bereit. Cloud-Service-Schlüssel sind für Nutzer nicht abrufbar; niemals zum Einfügen oder Offenlegen auffordern. Die erste Einrichtung verweigert weitere Aufrufe, wenn bereits ein Betreiber existiert.

Nach dieser expliziten Ersteinrichtung: `/admin`. Alle Betreiber-RPCs prüfen `private.is_platform_operator()` anhand `auth.uid()`; Tarif-/Abonnementtabellen besitzen keine nutzerseitigen Schreibpolicies. Ein UI-Menüeintrag ist keine Autorisierungsgrenze.

## Zentrale Regeln

`tariff_plans` ist die maßgebliche Konfiguration für Anzeige und Datenbankdurchsetzung. Startwerte: Free 0 €/Monat, 50 aktive reine Handbuchungen insgesamt, 3 Scans/Kalendermonat UTC; Basic 9,90 €, unbegrenzte Handbuchungen, 20 Scans; Premium 19,90 €, unbegrenzte Handbuchungen, 150 Scans. Free-Limits wurden mangels Vorgabe als konfigurierbare Startwerte gewählt. Angebote/Rechnungen sind anfänglich in allen Tarifen aktiv, um bestehende Abläufe zu erhalten. Standardberichte/PDF bleiben verfügbar; bestehende Kategorie-/Kundenfilter bilden die Premium-Erweiterung. Kein Umsatzsteuerstatus der Verkaufspreise wird behauptet.

Bestehende und neue Organisationen erhalten Free. Keine Daten werden gelöscht; bereits über dem Limit liegende Bestände bleiben lesbar/bearbeitbar, nur neue reine Handbuchungen werden begrenzt. Beleggebundene, Zahlungs- und Fixkostenbuchungen sind ausgenommen. Löschen einer Handbuchung gibt einen Platz frei. Ein Umhängen auf eine fremde Organisation oder Fälschen einer Fixkostenverknüpfung wird abgewiesen. Organisationzeilensperren serialisieren Limit-Prüfung und Einfügen.

`subscriptions`: eine Zeile je Organisation, Plan/Status, Beginn/Ende, optionale Verlängerung, Quelle, externe Referenzen, einmalige Trial-Kennung. `subscription_audit`: Zeitpunkt, Akteur, Grund, Vorher/Nachher. `platform_operators`: geschützte Betreiberzuordnung. `ocr_usage`: Request-UUID, Organisation/Nutzer, UTC-Kalendermonat, Bildhash, Zustand, Ergebnis und Erstattungsgrund. OCR-Bilder werden weiterhin nicht dauerhaft gespeichert; nur das normalisierte Ergebnis für sichere Wiederholung.

## Zustände und spätere Zahlungsintegration

- `free`: Free-Rechte.
- `active` / `trialing`: gewählter Tarif ausschließlich ab Beginn und vor Ablauf.
- `canceled`: gewählter Tarif bis zum unveränderten Ende des bezahlten Zeitraums; keine vorzeitige Kürzung durch Kündigung.
- `past_due` / `expired`: Free-Rechte, Daten bleiben erhalten.
- Zukünftiger Beginn / fehlendes oder abgelaufenes Ende: Free-Rechte.
- Testphase: ausdrücklich manuell, einmal je Organisation; kein automatischer Start.

Später: verifizierte Zahlung → `active` mit providerdefiniertem Zeitraum; fehlgeschlagene Zahlung → `past_due`; Kündigung → `canceled` ohne Zeitraumkürzung; Ablauf → effektiv Free (optional persistiert `expired`); bestätigte vollständige Erstattung → ausdrücklich `expired` statt als Kündigung verkleidet, Teil-Erstattung verändert Rechte nicht automatisch. Ein zukünftiger Provider darf `source='manual'` nie automatisch überschreiben. Vor erster Zahlungsintegration müssen Signaturprüfung, gespeicherte eindeutige Event-ID und atomare/idempotente Eventverarbeitung ergänzt werden. Noch kein Checkout, Webhook oder Payment-Ledger vorhanden.

## OCR

Vor KI-Aufruf: authentifizierte Mitgliedschaft, serverseitige Service-RPC `reserve_ocr`, Organisationzeilensperre und zentraler Tarif. Gleiche Request-ID mit gleichem Bild liefert vorhandenes Ergebnis oder meldet eine bereits bearbeitete/ungeklärte Anfrage; sie startet keine zweite KI-Ausführung. Abweichendes Bild/Nutzer/Organisation wird abgewiesen. `reserved` und `confirmed` zählen beide. KI-Erfolg wird vor Normalisierung bestätigt; unlesbare/ungültige Ergebnisse zählen deshalb korrekt als ausgeführte Scans. Nur SDK-Fehler mit `outcome='not_started'` werden automatisch erstattet. Timeouts/unklarer Ausgang bleiben reserviert. Betreiber können ungeklärte Reservierungen nur nach dokumentierter Prüfung erstatten, mit Audit und einmaligem Zustandswechsel.

Browser-Speech-API und lokale Auswertungen können nicht vor unabhängiger Eigenimplementierung außerhalb der App geschützt werden. Die bereitgestellte Spracherkennung prüft Premium vor Start; als Sprache gekennzeichnete Buchungen werden zusätzlich im DB-Trigger geprüft. Premium-Reports haben einen geschützten Server-Endpunkt. Rohdaten bleiben zwecks bestehender Kernfunktionen für Mitglieder lesbar; dies ist kein DRM.

## Veröffentlichung und offene Punkte

Impressum, freigegebene Datenschutzerklärung, Betreiberanschrift, öffentliche Kontaktadresse und Umsatzsteuerbehandlung der Preise fehlen. `/rechtliches` benennt diese Lücken; keine erfundenen Rechtstexte. Vor Veröffentlichung ergänzen. Zahlungen bleiben vollständig ausgenommen. Die SDK-Anbindung behält `openai/gpt-5.4-mini` bei.
