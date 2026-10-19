import { supabase } from "@/integrations/supabase/client";

export const LOGO_BUCKET = "org-logos";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export type PdfLogo = { dataUrl: string; width: number; height: number };

/** Prüft eine Logodatei vor dem Hochladen; gibt eine Fehlermeldung oder null zurück. */
export function validateLogoFile(f: { type: string; size: number }): string | null {
  if (!LOGO_TYPES[f.type]) return "Bitte ein Logo als PNG, JPG oder WEBP auswählen.";
  if (f.size > LOGO_MAX_BYTES) return "Das Logo ist zu groß (max. 2 MB).";
  if (f.size === 0) return "Die Datei ist leer.";
  return null;
}

function readImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Das Bild konnte nicht gelesen werden."));
    img.src = url;
  });
}

/** Lädt das Logo (nur für Mitglieder des Unternehmens lesbar) und wandelt es in PNG für das PDF um. */
export async function loadPdfLogo(path: string | null | undefined): Promise<PdfLogo | null> {
  if (!path) return null;
  const orgId=path.split("/")[0];
  if(!orgId) return null;
  const feature=await supabase.rpc("tariff_feature",{_org:orgId,_feature:"logo"});
  if(feature.error) throw new Error("Logo-Tarifprüfung fehlgeschlagen.");
  if(!feature.data) return null;
  const { data, error } = await supabase.storage.from(LOGO_BUCKET).download(path);
  if (error || !data) throw new Error("Firmenlogo konnte nicht geladen werden.");
  const img = await readImage(data);
  // Auf max. 600 px Breite skalieren – scharf genug für Druck, ohne das PDF aufzublähen.
  const scale = Math.min(1, 600 / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context=canvas.getContext("2d");
  if(!context) throw new Error("Logo konnte nicht verarbeitet werden.");
  context.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  return { dataUrl: canvas.toDataURL("image/png"), width: w, height: h };
}

/** Logo in eine Box einpassen (Seitenverhältnis bleibt erhalten). */
export function fitLogo(logo: { width: number; height: number }, maxW: number, maxH: number) {
  const r = Math.min(maxW / logo.width, maxH / logo.height);
  return { w: logo.width * r, h: logo.height * r };
}
