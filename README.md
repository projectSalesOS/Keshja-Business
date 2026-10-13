# Keshja Business

# KESHJA – KI-Finanzassistent

## Projektvision

Entwickle eine moderne, hochwertige SaaS-Webanwendung mit dem Namen KESHJA.

KESHJA ist ein KI-gestütztes Haushaltsbuch und persönlicher Finanzassistent.

Die Anwendung soll dem Nutzer helfen, sämtliche Ausgaben automatisch über fotografierte Kassenbons zu erfassen, intelligent zu kategorisieren und grafisch auszuwerten.

Das Ziel ist maximale Einfachheit.

Der Nutzer soll möglichst keine Daten manuell eingeben müssen.

Die gesamte Anwendung soll modern, minimalistisch, professionell und vertrauenswürdig wirken.

Keine verspielten Elemente.

Keine unnötigen Funktionen.

Mobile First.

Responsive.

Clean UI.

---

# Technologien

React

TypeScript

TailwindCSS

Supabase

OpenAI API (später)

Recharts

PDF-Export

---

# Seiten

Erstelle ausschließlich folgende Bereiche.

Dashboard

Kassenbons

Fixkosten

Auswertungen

Einstellungen

Keine weiteren Seiten.

---

# Dashboard

Das Dashboard ist die Startseite.

Oben befinden sich vier KPI-Karten.

• Gesamtausgaben Woche

• Gesamtausgaben Monat

• Lebensmittel Monat

• Fixkosten Monat

Darunter:

Kreisdiagramm

Balkendiagramm

Liniendiagramm

Alle Diagramme müssen zwischen

• Kategorien

und

• Unterkategorien

umschaltbar sein.

Unter den Diagrammen:

Letzte Kassenbons

KI-Zusammenfassung

Großer Button:

"Kassenbon fotografieren"

---

# Kategorien

Nutze folgende Hierarchie.

Bereich

↓

Kategorie

↓

Produkt

Beispiel:

Lebensmittel

↓

Milchprodukte

↓

Gouda

---

## Lebensmittel

Fleischprodukte

Milchprodukte

Grundnahrungsmittel

Obst

Gemüse

Tiefkühl

Süßigkeiten

Gewürze & Backen

---

## Getränke

Wasser

Softdrinks

Säfte

Kaffee

Tee

Bier

Wein

Spirituosen

Energy Drinks

---

## Drogerie

Körperpflege

Hygiene

Kosmetik

---

## Haushalt

Waschmittel

Reiniger

Küchenpapier

Müllbeutel

Batterien

Glühbirnen

Alufolie

Frischhaltefolie

---

## Haustiere

Tierfutter

Katzenstreu

Spielzeug

Zubehör

---

## Baby & Kinder

Windeln

Babynahrung

Kleidung

Spielzeug

---

## Gesundheit

Medikamente

Vitamine

Apotheke

Pflaster

---

## Auto & Mobilität

Kraftstoff

Parken

Werkstatt

Waschanlage

---

## Restaurant & Außer Haus

Restaurant

Fast Food

Lieferdienst

Café

Bäckerei

---

## Freizeit

Bücher

Spiele

Sport

Hobby

---

## Sonstiges

Bürobedarf

Geschenke

Dekoration

Unbekannt

---

# Kassenbons

Der Benutzer kann

Kassenbon fotografieren

Kassenbon hochladen

Kassenbons ansehen

Kassenbons durchsuchen

Kassenbons öffnen

Jeder Bon zeigt:

Geschäft

Datum

Uhrzeit

Gesamtsumme

Beim Öffnen:

Alle Produkte

Preis

Kategorie

Unterkategorie

---

# KI

Die OpenAI API soll später vorbereitet werden.

Workflow:

Foto

↓

OCR

↓

OpenAI analysiert

↓

Produkte erkennen

↓

Kategorie bestimmen

↓

Unterkategorie bestimmen

↓

In Supabase speichern

↓

Dashboard aktualisieren

Für Version 1 reichen Testdaten.

---

# Fixkosten

Verwaltung wiederkehrender Kosten.

Miete

Strom

Internet

Versicherungen

Streaming

Telefon

Sonstige

---

# Auswertungen

Unterstütze:

Heute

Woche

Monat

Quartal

Jahr

Alle Diagramme müssen zwischen

Kategorien

Unterkategorien

umschaltbar sein.

Verwende dieselbe Datenbasis wie das Dashboard.

---

# PDF-Berichte

Erstelle professionelle PDF-Berichte.

Zeiträume:

Heute

Woche

Monat

Quartal

Jahr

Der Bericht enthält:

Management-Zusammenfassung

Gesamtausgaben

Anzahl Kassenbons

Durchschnittlicher Einkaufswert

Größte Kategorie

Größte Unterkategorie

Teuerster Einkauf

Günstigster Einkauf

Diagramme

Kategorien

Unterkategorien

KI-Zusammenfassung

Optional:

Schalter

"KI-Kommentar hinzufügen"

Wenn deaktiviert:

Nur Zahlen.

Wenn aktiviert:

Zusätzliche KI-Analyse.

---

# Einstellungen

Einfache Einstellungen.

Noch keine komplexen Funktionen.

---

# Design

Sehr modern.

Minimalistisch.

Professionelles SaaS-Design.

Viel Weißraum.

Große Karten.

Abgerundete Ecken.

Dezente Schatten.

Professionelle Typografie.

Ruhige Farbpalette.

Hochwertige Icons.

Dark Mode vorbereiten.

---

# Logo

Verwende das vorhandene KESHJA-Logo.

Zeige das Logo

Header

Menü

Login

Browser-Favicon

---

# Architektur

Clean Code.

Keine doppelten Berechnungen.

Komponenten wiederverwenden.

Keine unnötigen Bibliotheken.

Keine Overengineering-Lösungen.

Mobile First.

Responsive.

Hohe Performance.

---

# WICHTIG

Entwickle ausschließlich die beschriebenen Funktionen.

Keine zusätzlichen Features.

Keine Gamification.

Keine Werbung.

Keine unnötigen Menüs.

Das Produkt soll wie eine professionelle kommerzielle SaaS-Anwendung wirken.

Das Ziel ist, dass KESHJA bereits in Version 1 produktionsreif aussieht und anschließend Schritt für Schritt um die OpenAI-Kassenbonanalyse erweitert werden kann.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f06a486-4d6b-47d0-b4d2-cc52681be797).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
