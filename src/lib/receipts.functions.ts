import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReceiptCheck } from "./receipt-check";
import { rawReceiptSchema, type RawReceipt } from "./receipt-lines";
import { foldDiscounts, normalize } from "./receipt-normalizer";
import {
  CATEGORY_TREE_PROMPT,
  normalizeCategories,
  parsedReceiptSchema,
  receiptTotals,
  type ParsedReceipt,
} from "./receipt-schema";
import type { ReceiptTrace } from "./receipt-trace";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MODEL = "openai/gpt-5.4-mini";

function validateImageInput(input: { imageDataUrl: string }) {
  const url = input?.imageDataUrl;
  if (typeof url !== "string" || !/^data:image\/(png|jpe?g|webp|heic|heif);base64,/i.test(url)) {
    throw new Error("Bitte ein gültiges Foto (JPG, PNG oder WEBP) auswählen.");
  }
  const bytes = Math.floor(((url.length - url.indexOf(",") - 1) * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    throw new Error("Das Foto ist zu groß. Bitte ein kleineres Bild verwenden (max. 8 MB).");
  }
  return { imageDataUrl: url };
}

/** Stabile Prüfsumme des Fotos, um Wiederholungsläufe vergleichen zu können. */
async function sha256(dataUrl: string): Promise<string> {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SYSTEM_PROMPT = `Du bist ein OCR-Transkriptionsdienst für deutsche Kassenbons.
Deine EINZIGE Aufgabe ist das wortgetreue Abschreiben der Bonzeilen. Du rechnest NICHTS.

Absolute Regeln:
- Gib jede gedruckte Zeile mit Betrag als eigene Zeile zurück, in exakt der Reihenfolge des Bons ("index" ab 0).
- "text" ist der Zeilentext wie gedruckt (ohne Betrag), "amount" der Betrag der Zeile MIT Vorzeichen
  (Rabatte, Gutschriften und Leergut negativ, wie auf dem Bon gedruckt).
- Verrechne NIEMALS etwas: keine Rabatte in Produktpreise einrechnen, keine Zeilen zusammenfassen,
  keine Zeilen weglassen, keine Summen bilden, keine Beträge korrigieren.
- Gib auch Zwischensumme, Summe, MwSt.-Zeilen, Zahlungsarten, Rückgeld, Punkte- und Treuehinweise
  sowie Zeilen wie "Gesamter Preisvorteil" oder "Sie sparen" mit zurück. Sie werden nachgelagert klassifiziert.
- Bei Mengen ("3 x 1,29") oder Gewicht ("0,842 kg x 2,99 EUR/kg") ist "amount" die Zeilensumme,
  "quantity" die Menge bzw. das Gewicht und "unitPrice" der Stück-/Kilopreis.
- "total" ist ausschließlich der auf dem Bon ausgewiesene Zahlbetrag.
- Kategorien nur für echte Warenzeilen setzen, sonst null. Nur diese Werte sind erlaubt:
${CATEGORY_TREE_PROMPT}
  Erfinde niemals neue Kategorien. Ist die Unterkategorie unklar, nutze die "Sonstige"-Unterkategorie
  der passenden Hauptkategorie. Passt gar nichts: "Geschenke & Sonstiges" / "Sonstiges".
- Datum immer als JJJJ-MM-TT, Uhrzeit als HH:MM oder null.
- Erfinde keine Zeilen. Nicht lesbare Zeilen weglassen.
- Ist das Bild kein lesbarer Kassenbon, setze readable=false und lines auf eine leere Liste.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readable", "merchant", "date", "time", "total", "lines"],
  properties: {
    readable: { type: "boolean" },
    merchant: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    time: { type: ["string", "null"] },
    total: { type: ["number", "null"] },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "text", "amount", "quantity", "unit_price", "category", "subcategory"],
        properties: {
          index: { type: "number" },
          text: { type: "string" },
          amount: { type: ["number", "null"] },
          quantity: { type: ["number", "null"] },
          unit_price: { type: ["number", "null"] },
          category: { type: ["string", "null"] },
          subcategory: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

export type AnalyzeResult = {
  receipt: ParsedReceipt;
  warnings: string[];
  check: ReceiptCheck;
  trace: ReceiptTrace;
  imageSha256: string;
  model: string;
};

async function transcribe(imageDataUrl: string, apiKey: string): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: MODEL,
        // Determinismus: keine Kreativität, feste Startbedingungen.
        temperature: 0,
        top_p: 1,
        seed: 7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Transkribiere diesen Kassenbon Zeile für Zeile." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "kassenbon_rohzeilen", strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
    });
  } catch (error) {
    console.error("AI gateway network error", error);
    throw new Error("Netzwerkfehler bei der KI-Analyse. Bitte erneut versuchen.");
  }

  if (response.status === 429) {
    throw new Error("Zu viele Anfragen. Bitte kurz warten und erneut versuchen.");
  }
  if (response.status === 402) {
    throw new Error("Das KI-Guthaben ist aufgebraucht. Bitte Credits aufladen.");
  }
  if (!response.ok) {
    console.error("AI gateway error", response.status, await response.text());
    throw new Error("Die KI-Analyse ist fehlgeschlagen. Bitte erneut versuchen.");
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Die KI hat keine Daten geliefert. Bitte erneut versuchen.");

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("Die KI-Antwort war unvollständig. Bitte erneut versuchen.");
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const analyzeReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateImageInput)
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Die KI-Analyse ist derzeit nicht konfiguriert.");

    const raw = await transcribe(data.imageDataUrl, apiKey);

    if (raw["readable"] === false) {
      throw new Error(
        "Der Kassenbon konnte nicht gelesen werden – vermutlich unscharf, abgeschnitten oder zu dunkel. Bitte neu fotografieren.",
      );
    }

    const rawLines = Array.isArray(raw["lines"]) ? (raw["lines"] as Record<string, unknown>[]) : [];
    if (rawLines.length === 0) {
      throw new Error(
        "Es konnten keine Zeilen erkannt werden. Bitte den Bon vollständig und scharf fotografieren.",
      );
    }

    const warnings: string[] = [];
    const lines = rawLines.map((line, position) => ({
      index: typeof line["index"] === "number" ? Math.max(0, Math.trunc(line["index"])) : position,
      text: String(line["text"] ?? "Unbekannte Zeile").slice(0, 160) || "Unbekannte Zeile",
      amount: typeof line["amount"] === "number" ? round2(line["amount"]) : null,
      quantity: typeof line["quantity"] === "number" ? line["quantity"] : null,
      unitPrice: typeof line["unit_price"] === "number" ? round2(line["unit_price"]) : null,
      category: typeof line["category"] === "string" ? line["category"] : null,
      subcategory: typeof line["subcategory"] === "string" ? line["subcategory"] : null,
    }));

    const dateRaw = typeof raw["date"] === "string" ? raw["date"] : "";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)
      ? dateRaw
      : new Date().toISOString().slice(0, 10);
    if (date !== dateRaw) warnings.push("Das Datum war nicht lesbar – heutiges Datum eingesetzt.");

    const merchantRaw = typeof raw["merchant"] === "string" ? raw["merchant"].trim() : "";
    if (!merchantRaw) warnings.push("Der Händler war nicht lesbar. Bitte ergänzen.");

    const timeRaw = typeof raw["time"] === "string" ? raw["time"] : null;
    let total = typeof raw["total"] === "number" ? round2(raw["total"]) : 0;
    if (total <= 0) {
      total = 0;
      warnings.push("Der Zahlbetrag war nicht eindeutig lesbar. Bitte prüfen.");
    }

    const parsedRaw = rawReceiptSchema.safeParse({
      merchant: merchantRaw || "Unbekannter Händler",
      date,
      time: timeRaw && /^\d{2}:\d{2}$/.test(timeRaw) ? timeRaw : null,
      total,
      lines,
    } satisfies RawReceipt);

    if (!parsedRaw.success) {
      console.error("AI output validation failed", parsedRaw.error.issues);
      throw new Error("Die KI-Daten waren unvollständig. Bitte erneut versuchen.");
    }

    // Ab hier entscheidet ausschließlich die deterministische Normalisierung.
    const { receipt, trace, check } = normalize(parsedRaw.data);
    if (receipt.items.length === 0) {
      throw new Error(
        "Es konnten keine Positionen erkannt werden. Bitte den Bon vollständig und scharf fotografieren.",
      );
    }
    warnings.push(...trace.notes);

    const imageSha256 = await sha256(data.imageDataUrl);
    return {
      receipt: { ...receipt, trace, imageSha256, model: MODEL },
      warnings,
      check,
      trace,
      imageSha256,
      model: MODEL,
    };
  });

export const saveReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const wrapper = (raw ?? {}) as { organizationId?: unknown; receipt?: unknown };
    const organizationId =
      typeof wrapper.organizationId === "string" && /^[0-9a-f-]{36}$/i.test(wrapper.organizationId)
        ? wrapper.organizationId
        : null;
    if (!organizationId) throw new Error("Bitte zuerst ein Unternehmen anlegen oder beitreten.");
    const input = wrapper.receipt;
    const parsed = parsedReceiptSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message ?? "Die Daten sind unvollständig und wurden nicht gespeichert.",
      );
    }
    return { ...foldDiscounts(normalizeCategories(parsed.data)), organizationId };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const totals = receiptTotals(data);
    const trace = (data.trace ?? null) as ReceiptTrace | null;

    // Belege gehören dem Unternehmen; die Datenbank prüft die Mitgliedschaft (RLS).
    // Ein gespeicherter Beleg erzeugt bewusst keine Buchung – das geschieht nur manuell.
    const { data: receipt, error } = await context.supabase
      .from("receipts")
      .insert({
        user_id: context.userId,
        organization_id: data.organizationId,
        merchant: data.merchant,
        date: data.date,
        time: data.time,
        total: data.total,
        discount_total: data.discountTotal,
        goods_total: totals.goodsTotal,
        deposit_total: totals.depositTotal,
        trace: trace ? JSON.parse(JSON.stringify(trace)) : null,
        image_sha256: data.imageSha256 ?? null,
        model: data.model ?? null,
      })
      .select("id")
      .single();

    if (error || !receipt) {
      console.error("saveReceipt insert failed", error);
      throw new Error("Der Kassenbon konnte nicht gespeichert werden. Bitte erneut versuchen.");
    }

    const { error: itemsError } = await context.supabase.from("receipt_items").insert(
      data.items.map((item, index) => ({
        receipt_id: receipt.id,
        name: item.name,
        quantity: item.quantity ?? 1,
        price: item.price,
        original_price: item.originalPrice ?? item.price,
        discount: item.discount ?? 0,
        discount_kind: item.discount > 0 ? (item.discountKind ?? "position") : null,
        line_type:
          item.kind === "deposit"
            ? item.price < 0
              ? "deposit_return"
              : "deposit"
            : trace?.mergedItems.find((m) => m.index === index)
              ? "product"
              : "product",
        category: item.category,
        subcategory: item.subcategory,
        kind: item.kind,
      })),
    );

    if (itemsError) {
      console.error("saveReceipt items insert failed", itemsError);
      await context.supabase.from("receipts").delete().eq("id", receipt.id);
      throw new Error("Die Positionen konnten nicht gespeichert werden. Bitte erneut versuchen.");
    }

    return { id: receipt.id };
  });