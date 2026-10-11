export type Bereich = { name: string; kategorien: string[] };

/**
 * Praxisorientierte Haushalts-Taxonomie von KESHJA.
 * Diese Liste ist die einzige Quelle der Wahrheit – die KI darf nichts erfinden.
 */
export const BEREICHE: Bereich[] = [
  {
    name: "Lebensmittel",
    kategorien: [
      "Fleisch & Wurst",
      "Fisch",
      "Milchprodukte",
      "Eier",
      "Obst",
      "Gemüse",
      "Brot & Backwaren",
      "Grundnahrungsmittel",
      "Tiefkühl",
      "Süßigkeiten",
      "Snacks",
      "Gewürze & Saucen",
      "Konserven",
      "Fertiggerichte",
      "Sonstiges Lebensmittel",
    ],
  },
  {
    name: "Getränke",
    kategorien: [
      "Wasser",
      "Softdrinks",
      "Säfte",
      "Eistee",
      "Kaffee & Tee",
      "Energy Drinks",
      "Sonstige Getränke",
    ],
  },
  {
    name: "Alkohol",
    kategorien: ["Bier", "Wein & Sekt", "Spirituosen", "Cocktails & Mischgetränke", "Sonstiger Alkohol"],
  },
  {
    name: "Drogerie & Körperpflege",
    kategorien: [
      "Shampoo & Haarpflege",
      "Duschgel & Körperpflege",
      "Zahnpflege",
      "Rasur",
      "Kosmetik",
      "Hygiene",
      "Waschmittel",
      "Reinigungsmittel",
      "Papierwaren",
      "Sonstige Drogerie",
    ],
  },
  {
    name: "Gesundheit",
    kategorien: [
      "Medikamente",
      "Apotheke",
      "Vitamine & Nahrungsergänzung",
      "Erste Hilfe",
      "Medizinische Produkte",
      "Sonstige Gesundheit",
    ],
  },
  {
    name: "Haushalt",
    kategorien: [
      "Küchenbedarf",
      "Haushaltsartikel",
      "Müll & Entsorgung",
      "Batterien",
      "Beleuchtung",
      "Sonstiger Haushalt",
    ],
  },
  {
    name: "Baby & Kinder",
    kategorien: [
      "Windeln",
      "Babynahrung",
      "Pflege",
      "Kinderkleidung",
      "Spielzeug",
      "Schulbedarf",
      "Sonstiges Baby & Kinder",
    ],
  },
  {
    name: "Haustiere",
    kategorien: [
      "Tierfutter",
      "Snacks & Leckerlis",
      "Katzenstreu",
      "Tierpflege",
      "Zubehör",
      "Tierarzt",
      "Sonstiges Haustier",
    ],
  },
  {
    name: "Restaurant & Außer Haus",
    kategorien: [
      "Restaurant",
      "Café",
      "Fast Food",
      "Bäckerei",
      "Lieferdienst",
      "Imbiss",
      "Sonstiges Außer Haus",
    ],
  },
  {
    name: "Mobilität",
    kategorien: [
      "Kraftstoff",
      "Laden & Strom",
      "ÖPNV",
      "Parken",
      "Maut",
      "Waschanlage",
      "Werkstatt",
      "Ersatzteile",
      "Sonstige Mobilität",
    ],
  },
  {
    name: "Freizeit & Unterhaltung",
    kategorien: [
      "Bücher",
      "Spiele",
      "Streaming",
      "Kino",
      "Sport",
      "Hobbys",
      "Veranstaltungen",
      "Musik",
      "Sonstige Freizeit",
    ],
  },
  {
    name: "Kleidung",
    kategorien: ["Kleidung", "Schuhe", "Accessoires", "Sonstige Kleidung"],
  },
  {
    name: "Wohnen & Garten",
    kategorien: [
      "Möbel",
      "Dekoration",
      "Garten",
      "Pflanzen",
      "Baumarkt",
      "Werkzeug",
      "Renovierung",
      "Sonstiges Wohnen",
    ],
  },
  {
    name: "Elektronik",
    kategorien: [
      "Computer & Zubehör",
      "Handy & Zubehör",
      "Haushaltsgeräte",
      "Unterhaltungselektronik",
      "Kabel & Ladegeräte",
      "Sonstige Elektronik",
    ],
  },
  {
    name: "Büro & Bildung",
    kategorien: ["Schreibwaren", "Bücher & Lernmaterial", "Bürobedarf", "Schule", "Sonstige Bildung"],
  },
  {
    name: "Tabakwaren",
    kategorien: [
      "Zigaretten",
      "Tabak",
      "Zigarren & Zigarillos",
      "Pfeifentabak",
      "E-Zigaretten & Vapes",
      "Sonstige Tabakwaren",
    ],
  },
  {
    name: "Dienstleistungen",
    kategorien: ["Friseur", "Reinigung", "Reparaturen", "Handwerker", "Sonstige Dienstleistungen"],
  },
  {
    name: "Geschenke & Sonstiges",
    kategorien: ["Geschenke", "Spenden", "Sonstiges"],
  },
];

export const BEREICH_NAMEN = BEREICHE.map((b) => b.name);

/**
 * Fixed color concept – one hue per main category, used everywhere
 * (charts, tables, lists, PDF reports).
 */
export type CategoryColor = { token: string; hex: string };

export const BEREICH_COLORS: Record<string, CategoryColor> = {
  Lebensmittel: { token: "var(--cat-lebensmittel)", hex: "#2E9E4F" },
  Getränke: { token: "var(--cat-getraenke)", hex: "#00A6C4" },
  Alkohol: { token: "var(--cat-alkohol)", hex: "#8C1D40" },
  "Drogerie & Körperpflege": { token: "var(--cat-drogerie)", hex: "#E0459B" },
  Gesundheit: { token: "var(--cat-gesundheit)", hex: "#D62828" },
  Haushalt: { token: "var(--cat-haushalt)", hex: "#E8871E" },
  "Baby & Kinder": { token: "var(--cat-baby)", hex: "#17BEBB" },
  Haustiere: { token: "var(--cat-haustiere)", hex: "#8B5A2B" },
  "Restaurant & Außer Haus": { token: "var(--cat-restaurant)", hex: "#EBC017" },
  Mobilität: { token: "var(--cat-mobilitaet)", hex: "#2563C9" },
  "Freizeit & Unterhaltung": { token: "var(--cat-freizeit)", hex: "#8046D6" },
  Kleidung: { token: "var(--cat-kleidung)", hex: "#F2704F" },
  "Wohnen & Garten": { token: "var(--cat-wohnen)", hex: "#6B8E23" },
  Elektronik: { token: "var(--cat-elektronik)", hex: "#3E4C99" },
  "Büro & Bildung": { token: "var(--cat-buero)", hex: "#0F766E" },
  Tabakwaren: { token: "var(--cat-tabak)", hex: "#464F63" },
  Dienstleistungen: { token: "var(--cat-dienstleistungen)", hex: "#B45309" },
  "Geschenke & Sonstiges": { token: "var(--cat-sonstiges)", hex: "#7A8794" },
};

export const FALLBACK_BEREICH = "Geschenke & Sonstiges";
export const FALLBACK_KATEGORIE = "Sonstiges";

const FALLBACK: CategoryColor = BEREICH_COLORS[FALLBACK_BEREICH]!;

export const KATEGORIE_TO_BEREICH: Record<string, string> = Object.fromEntries(
  BEREICHE.flatMap((b) => b.kategorien.map((k) => [k, b.name] as const)),
);

/**
 * Alte Kategorien/Unterkategorien aus früheren Versionen von KESHJA.
 * Gespeicherte Kassenbons bleiben dadurch korrekt zugeordnet.
 */
export const LEGACY_SUBCATEGORY_MAP: Record<string, { bereich: string; kategorie: string }> = {
  Fleischprodukte: { bereich: "Lebensmittel", kategorie: "Fleisch & Wurst" },
  Backwaren: { bereich: "Lebensmittel", kategorie: "Brot & Backwaren" },
  Gewürze: { bereich: "Lebensmittel", kategorie: "Gewürze & Saucen" },
  Reiniger: { bereich: "Drogerie & Körperpflege", kategorie: "Reinigungsmittel" },
  Küchenpapier: { bereich: "Drogerie & Körperpflege", kategorie: "Papierwaren" },
  Shampoo: { bereich: "Drogerie & Körperpflege", kategorie: "Shampoo & Haarpflege" },
  Duschgel: { bereich: "Drogerie & Körperpflege", kategorie: "Duschgel & Körperpflege" },
  Zahnpasta: { bereich: "Drogerie & Körperpflege", kategorie: "Zahnpflege" },
  Müllbeutel: { bereich: "Haushalt", kategorie: "Müll & Entsorgung" },
  Pflaster: { bereich: "Gesundheit", kategorie: "Erste Hilfe" },
  Vitamine: { bereich: "Gesundheit", kategorie: "Vitamine & Nahrungsergänzung" },
  Arztkosten: { bereich: "Gesundheit", kategorie: "Sonstige Gesundheit" },
  Hobby: { bereich: "Freizeit & Unterhaltung", kategorie: "Hobbys" },
  Bürobedarf: { bereich: "Büro & Bildung", kategorie: "Bürobedarf" },
  Dekoration: { bereich: "Wohnen & Garten", kategorie: "Dekoration" },
  Unbekannt: { bereich: FALLBACK_BEREICH, kategorie: FALLBACK_KATEGORIE },
};

/** Alte Hauptkategorien → neue Hauptkategorien. */
export const LEGACY_BEREICH_MAP: Record<string, string> = {
  "Drogerie & Pflege": "Drogerie & Körperpflege",
  Freizeit: "Freizeit & Unterhaltung",
  Sonstiges: "Geschenke & Sonstiges",
};

/** Color for a main category or a subcategory (inherits its main category hue). */
export function categoryColor(name: string): CategoryColor {
  const mapped = LEGACY_BEREICH_MAP[name] ?? name;
  return BEREICH_COLORS[mapped] ?? BEREICH_COLORS[KATEGORIE_TO_BEREICH[name] ?? ""] ?? FALLBACK;
}

export const colorToken = (name: string) => categoryColor(name).token;
export const colorHex = (name: string) => categoryColor(name).hex;

/** RGB triple for jsPDF table styling. */
export function colorRgb(name: string): [number, number, number] {
  const hex = colorHex(name).slice(1);
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}
