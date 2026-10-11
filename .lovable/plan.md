# Finaler Umsetzungsplan: Rohzeilen-OCR, zentrale Normalisierung, Trace, Regression

## Ausgangsbefund (durch Codeprüfung bestätigt)

- `analyzeReceipt` sendet das Bild bei jedem Lauf erneut ans Modell – ohne `temperature`, ohne Bild-Hash, ohne Speicherung der Rohantwort. Zwei Läufe sind heute nicht vergleichbar.
- Das Modell liefert bereits **gebuchte** Endpositionen. Ob ein „Preisvorteil" Positionsrabatt, Belegrabatt oder bereits eingerechnet ist, entscheidet es pro Lauf neu.
- `foldDiscounts` hängt jede negative Zeile an die zuletzt eingefügte Produktposition mit Preis > 0 – ohne Bezug zur Zeilenreihenfolge des Bons.
- `findSuspects` markiert bei ungeklärter Differenz die zwei teuersten Positionen und schlägt teils Preise vor, die nicht auf dem Bon stehen.
- `useReceipts` enthält mit `foldDiscountItems` eine zweite, abweichende Rabattlogik auf bereits gespeicherten Daten.
- Datenverlust beim Laden: `quantity`, `original_price`, `discount`, `kind` liegen in der Datenbank, kommen aber nicht ins Anwendungsmodell. `original_price` wird beim Speichern als `originalPrice ?? price` geschrieben, also auch ohne Rabatt gefüllt. Rabattart und Rabattzuordnung existieren nirgends.
- In der Datenbank liegen zwei Lidl-Bons vom 01.08.2026 über je 44,55 € (Doppelerfassung aus den Testläufen) mit abweichenden Positionspreisen, z. B. „Trauben Kerne" 3,94 € gegenüber 3,79 €.

---

## 1. Geänderte Dateien

| Datei | Änderung |
| --- | --- |
| `src/lib/receipts.functions.ts` | Prompt und Response-Schema auf reine Rohzeilen-Transkription; `temperature: 0`; `analyzeReceipt` ruft nur noch `normalize()` auf; neue Funktion `compareReceiptRuns`; `saveReceipt` schreibt die neuen Felder |
| `src/lib/receipt-schema.ts` | `foldDiscounts` und `dropDoubleCountedDiscount` entfallen (Logik wandert in den Normalizer); bleibt Zod-Schema, `receiptTotals`, `normalizeCategories` |
| `src/lib/receipt-check.ts` | arbeitet auf dem Trace; Klassifikation vor Preisvorschlag; keine willkürlichen Vorschläge mehr |
| `src/hooks/useReceipts.ts` | `foldDiscountItems` entfällt; Select um `original_price, discount, discount_kind` erweitert; Felder werden durchgereicht |
| `src/components/ReceiptCapture.tsx` | Anzeige von Menge, Originalpreis, Rabatt, Rabattart je Position; einklappbarer Bereich „Verarbeitung anzeigen" |
| `src/lib/receipt-math.test.ts` | bleibt inhaltlich unverändert, nur Importe angepasst |

## 2. Neue Dateien

| Datei | Zweck |
| --- | --- |
| `src/lib/receipt-lines.ts` | Rohzeilen-Schema `RawLine { index, text, amount, quantity, unitPrice }` plus Header (Händler, Datum, Uhrzeit, Zahlbetrag) |
| `src/lib/receipt-normalizer.ts` | **die eine** zentrale Normalisierung: `classifyLines`, `assignDiscounts`, `splitDeposits`, `computeTotals`, `normalize` |
| `src/lib/receipt-trace.ts` | Trace-Typen und `diffTraces(traces)` für den Run-Vergleich |
| `src/routes/debug.ocr.tsx` | nicht verlinkte Debug-Seite: ein Bild, drei Läufe, Diff-Tabelle |
| `src/lib/fixtures/receipts/*.ts` | Rohzeilen-Fixtures der 20 Testfälle inkl. Lidl 01.08.2026 |
| `src/lib/receipt-normalizer.test.ts` | deterministische Tests über die Fixtures |

## 3. Datenbankfelder

`receipts` (bestehend: `goods_total`, `deposit_total`, `discount_total`) – neu:
- `trace jsonb null` – Stufenzusammenfassung, keine Bilddaten
- `image_sha256 text null` – ordnet Läufe demselben Foto zu, **ohne** je ein altes Ergebnis wiederzuverwenden
- `model text null`

`receipt_items` (bestehend: `quantity`, `price`, `original_price`, `discount`, `kind`) – neu bzw. geändert:
- `discount_kind text null` – `position` | `beleg` | `treue`
- `line_type text not null default 'product'` – `product` | `deposit`
- `original_price` künftig `null`, wenn kein tatsächlicher Rabatt existiert

Keine EANs, keine Produktidentitäten, keine zusätzlichen Tabellen.

## 4. Entfernte bzw. zusammengeführte Funktionen

- `foldDiscounts` (receipt-schema) → geht auf in `normalize()`
- `dropDoubleCountedDiscount` → wird Regel 3.1 der Aggregatprüfung im Normalizer
- `foldDiscountItems` (useReceipts) → ersatzlos entfernt
- `findSuspects`-Fallback „zwei teuerste Positionen markieren" → ersetzt durch `unklar` ohne Preisvorschlag

Danach existiert genau **eine** Stelle für Rabatt- und Pfandlogik: `src/lib/receipt-normalizer.ts`.

## 5. Zentrale Normalisierung

`normalize(rawLines, header) → { receipt, trace, check }`, reine Funktion, ohne Netzwerk, ohne `Date.now()`, ohne Zufall.

1. `classifyLines` – geordnete, deterministische Regelliste je Zeile:
   `product | product_discount | receipt_discount | aggregate_info | deposit | deposit_return | subtotal | total | payment | tax_block | loyalty_info | ignore`
2. `assignDiscounts` – ein `product_discount` gehört immer zur nächstliegenden **vorangehenden** `product`-Zeile nach Zeilenindex, nie nach Preis. Ohne Vorgänger: `unassigned_discount`, im Trace dokumentiert, niemals still verrechnet.
3. `splitDeposits` – `deposit` und `deposit_return` bleiben eigene Belegkomponenten mit Vorzeichen.
4. `computeTotals` – `goodsTotal`, `depositTotal`, `receiptDiscount`, `expectedTotal`.
5. Kategorisierung erst danach über das bestehende `normalizeCategories`.

Vertrag: `normalize(x)` zweimal aufgerufen liefert byte-gleiches JSON; ein Test erzwingt das.

## 6. Trennung Rabatt / Pfand

`WARENWERT + PFAND − NICHT BEREITS EINGERECHNETER BELEGRABATT = ZAHLBETRAG`

- Produktpreis ist der effektive Preis der Produktzeile.
- Ein Positionsrabatt wird nur separat gespeichert, wenn er eindeutig zugeordnet ist; dann `original_price = price + discount`, sonst `original_price = null`.
- Pfandzeilen können nie zu Rabatten werden und Rabattzeilen nie zu Pfand: die Klassifikation ist exklusiv, und `assignDiscounts` überspringt Zeilen mit `kind = deposit`.
- Leergutrückgabe ist negatives Pfand, keine Produktposition.
- Negative Beträge werden nie als Produktposition gespeichert.

## 7. Aggregierte Vorteilszeilen und Lidl-Referenzfall

`aggregate_info` (Gesamter Preisvorteil, Sie sparen, Lidl Plus, Coupon, Treuerabatt, Aktionsvorteil) ist ein **Kontrollwert**, kein Abzug. Regel in dieser Reihenfolge:

1. Geht `Warenwert + Pfand = Zahlbetrag` innerhalb der Toleranz → Vorteil ist bereits eingerechnet, Belegrabatt 0.
2. Geht `Warenwert + Pfand − Vorteil = Zahlbetrag` → Vorteil noch nicht eingerechnet, als Belegrabatt buchen.
3. Sonst: kein Betrag erfunden, kein Abzug, Trace-Eintrag `aggregate_unresolved`, Prüfstatus `nicht eindeutig zuordenbarer Rabatt`.

Der Kontrollwert wird nie als Summe der Positionsrabatte interpretiert; er wird lediglich dagegen **verglichen**, und eine Abweichung erzeugt einen Hinweis, keinen Abzug.

**Lidl 01.08.2026** wird als Fixture mit den tatsächlichen Rohzeilen modelliert – alle Produktzeilen mit ihren gedruckten Preisen, die Pfandzeile 0,25 €, die Positionsvorteile, „Mit Lidl Plus 0,80" und „Gesamter Preisvorteil 3,38" als `aggregate_info`. Der Test prüft die Kette Rohzeilen → Klassifikation → Zuordnung → Summen und erwartet: Warenwert 44,30 €, Pfand 0,25 €, Belegrabatt 0,00 €, Zahlbetrag 44,55 €, `status = ok`, keine Pfandwarnung, keine Preisvorschläge, `suspects` leer. Kein hinterlegter Zielwert, sondern das Rechenergebnis der Kette.

## 8. Schutz gegen Doppelrabattierung

- Ein Rabattbetrag wird höchstens einmal wirksam: entweder als Positionsrabatt (Preis bereits reduziert) oder als Belegrabatt, nie beides.
- Jeder Rabatt trägt im Trace `alreadyIncludedInItemPrice`; nur `false` fließt in `receiptDiscount` ein.
- Aggregatzeilen sind per Klassifikation nie abzugsfähig, außer über Regel 7.2.
- Ein Test je Fall 8 und 9 der Testliste sichert das ab.

## 9. Schutz gegen Pfand als Kategorie-Ausgabe

- `kind = deposit` erhält fest `Pfand / Pfand` und wird in `goodsTotal` nie mitgezählt.
- Auswertungen und Diagramme filtern Positionen mit `kind = deposit` bereits beim Laden aus; das bleibt so und wird durch einen Test abgesichert.

## 10. Trace und OCR-Wiederholbarkeit

Trace-Stufen: `rawLines → classifiedLines → mergedItems → deposits → goodsTotal → positionDiscounts → receiptDiscount → paymentTotal → check`.

Je Rabatt: `sourceLine`, `amount`, `kind`, `assignedToItem`, `alreadyIncludedInItemPrice`, `appliedToTotals`. Keine Bilddaten, zunächst nur für Debugging und Prüfung.

Wiederholbarkeit:
- `compareReceiptRuns({ imageDataUrl, runs: 1..3 })` liefert n Traces desselben Bildes.
- `diffTraces(traces)` vergleicht Produktzeilen, Preise, Mengen, Positionsrabatte, Pfand, Belegrabatt, Warenwert, Zahlbetrag, Differenz und deren Klassifikation.
- `/debug/ocr` zeigt Run 1 bis 3 nebeneinander mit farbig markierten Abweichungen.
- `temperature: 0` im Gateway-Request.
- Ein Testfall ruft `normalize()` mit identischen Rohzeilen mehrfach auf und erwartet identische Ergebnisse; die OCR selbst darf variieren.

## 11. Migrationen

### 11.0 Vorab: bekannte Test-Duplikation entfernen

In der Datenbank liegen zwei Lidl-Bons vom 01.08.2026 über je 44,55 €, entstanden durch unsere Testläufe:
- `7ecb0762-885d-442f-94f2-e9aedab0bcec`, erfasst am 08.08.2026 15:17, Warenwert 47,47 €
- `bd858514-a135-47f3-a081-e4a2852cb559`, erfasst am 08.08.2026 16:25, Warenwert 47,27 €

Vor der Schema-Migration wird **genau ein** Datensatz entfernt: der ältere Lauf `7ecb0762-…` samt seiner Positionen. `bd858514-…` bleibt als Referenzdatensatz erhalten. Die Löschung erfolgt ausschließlich über diese eine ID; keine weiteren Bons oder Finanzdaten sind betroffen.

### 11.1 Schema, additiv
1. `ALTER TABLE receipts ADD COLUMN trace jsonb, image_sha256 text, model text`
2. `ALTER TABLE receipt_items ADD COLUMN discount_kind text, line_type text NOT NULL DEFAULT 'product'`

### 11.2 Datenübernahme, ausschließlich eindeutige Fälle
3. `UPDATE receipt_items SET line_type = 'deposit' WHERE kind = 'deposit'`
4. `UPDATE receipt_items SET original_price = NULL WHERE discount = 0 OR original_price = price`
5. `UPDATE receipt_items SET discount_kind = 'position' WHERE discount > 0`
6. Rekonstruktion je Bon: `goods_total` = Summe der Produktpositionen, `deposit_total` = Summe der Pfandpositionen; `discount_total` bleibt unverändert.

### 11.3 Historische negative Positionen
Es wird niemals aufgrund einer unsicheren Annahme entschieden, ob eine negative Altposition Rabatt oder Pfand war:
- eindeutig als Pfand erkennbar (Pfand-, Leergut-, Einweg-, Mehrwegbezeichnung) → `line_type = 'deposit'`
- eindeutig einem unmittelbar vorangehenden Produkt zuordenbare Rabattposition → als Positionsrabatt übernehmen
- alles Übrige → **unverändert lassen**, nicht umklassifizieren, nicht löschen

Nicht eindeutig rekonstruierbare Positionen erscheinen im Migrationsbericht unter „manuelle Prüfung erforderlich" mit Bon-ID, Zeilenname und Betrag. Der Bericht wird als Abfrageergebnis ausgegeben, nicht als Datenänderung.

Abgesehen von der in 11.0 benannten Test-Duplikation bleiben alle historischen Bons vollständig erhalten.

## 12. Plausibilitätsprüfung

Klassifikation in fester Reihenfolge: `rundungsdifferenz`, `doppelrabatt`, `nicht-eindeutiger-rabatt`, `fehlendes-pfand`, `doppelte-position`, `ziffernverwechslung`, `fehlende-position`, `unklar`.

Ein Preisvorschlag erscheint nur, wenn genau **ein** Kandidat die Differenz exakt erklärt. Bei mehreren gleichwertigen Kandidaten werden die Zeilen markiert, aber kein Preis vorgeschlagen. Ohne erklärbare Ursache lautet die Meldung „Differenz ungeklärt" mit Verweis auf den Trace.

## 13. Regressionstests

`src/lib/receipt-normalizer.test.ts`, je Fall ein Rohzeilen-Fixture mit erwarteten Endwerten:
1 ohne Pfand und Rabatt · 2 einfaches Pfand · 3 mehrere Pfandzeilen · 4 Leergutrückgabe · 5 Positionsrabatt · 6 mehrere Positionsrabatte · 7 aggregierter Belegrabatt · 8 bereits rabattierte Produktpreise · 9 Lidl-Doppelrabattfall · 10 Mehrfachmenge · 11 Gewichtsware · 12 fehlende Position · 13 doppelte Position · 14 Rundungsdifferenz · 15 Treue-/Lidl-Plus-Rabatt · 16 Coupons am Bonende · 17 MwSt.-Block · 18 Zwischensumme · 19 Gegeben/Rückgeld · 20 Punkte-/Treueinformationen.

Dazu: Determinismus-Test (Abschnitt 10), Persistenz-Roundtrip-Test (speichern → laden → alle Felder vorhanden), und die neun bestehenden Tests in `receipt-math.test.ts` bleiben grün.

## 14. Umsetzungsreihenfolge

0. Entfernen der Test-Duplikation `7ecb0762-…` (Abschnitt 11.0)
1. `receipt-lines.ts` und Prompt auf reine Transkription, `temperature: 0`
2. `receipt-normalizer.ts` inklusive Trace, `receipt-trace.ts`
3. `receipt-check.ts` auf Trace umstellen, Heuristik entschärfen
4. Migration aus Abschnitt 11
5. `saveReceipt`, `useReceipts`, Prüfdialog auf die neuen Felder
6. Fixtures und Tests aus Abschnitt 13
7. `/debug/ocr` und `compareReceiptRuns`

---

## Was sich NICHT ändert

- Erkennung von Händler, Datum und Uhrzeit
- Erkennung normaler Produktzeilen
- Kategorien und Unterkategorien sowie deren Farbzuordnung
- Dashboard, Auswertungen, Diagramme, KPI-Karten, Navigation, Logo, Slogan
- Fixkosten und PDF-Export
- Die bestehenden mathematischen Tests
- Keine Designänderungen außer der zusätzlichen Detailanzeige im Prüfdialog
- Keine automatische Wiederverwendung eines früheren Ergebnisses bei identischem Bild

## Offene Punkte

Keine. Die Lidl-Duplikation ist in Abschnitt 11.0 geklärt.