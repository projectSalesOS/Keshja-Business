import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

type Input = { documentId: string; to: string; subject: string; message: string; filename: string; pdfBase64: string };

function validate(i: Input): Input {
  if (!i || typeof i !== "object") throw new Error("Ungültige Anfrage.");
  const to = String(i.to ?? "").trim();
  if (!EMAIL_RE.test(to)) throw new Error("Bitte eine gültige Empfängeradresse eingeben.");
  const subject = String(i.subject ?? "").trim();
  if (!subject || subject.length > 200) throw new Error("Bitte einen Betreff (max. 200 Zeichen) eingeben.");
  const message = String(i.message ?? "");
  if (message.length > 5000) throw new Error("Die Nachricht ist zu lang.");
  const filename = String(i.filename ?? "").replace(/[^\w.\-äöüÄÖÜß]/g, "_").slice(0, 120);
  if (!filename.endsWith(".pdf")) throw new Error("Ungültiger Dateiname.");
  const pdfBase64 = String(i.pdfBase64 ?? "");
  if (!/^[A-Za-z0-9+/=]+$/.test(pdfBase64) || (pdfBase64.length * 3) / 4 > MAX_PDF_BYTES)
    throw new Error("Das PDF ist ungültig oder zu groß.");
  if (!/^[0-9a-f-]{36}$/i.test(String(i.documentId))) throw new Error("Ungültiges Dokument.");
  return { documentId: i.documentId, to, subject, message, filename, pdfBase64 };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Versendet ein Angebot / eine Rechnung als PDF-Anhang über den verbundenen E-Mail-Dienst (Resend). */
export const sendDocumentEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    // Zugriff nur auf Dokumente des eigenen Unternehmens (RLS als angemeldeter Benutzer).
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id, kind, organization_id, organizations(name, email)")
      .eq("id", data.documentId)
      .maybeSingle();
    if (error || !doc) throw new Error("Dokument nicht gefunden oder kein Zugriff.");
    if (doc.kind !== "quote" && doc.kind !== "invoice") throw new Error("Nur Angebote und Rechnungen können versendet werden.");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    if (!lovableKey || !resendKey)
      return { ok: false as const, error: "Der E-Mail-Versand ist noch nicht eingerichtet (E-Mail-Dienst nicht verbunden). Es wurde nichts versendet." };

    const org = (doc as unknown as { organizations: { name: string; email: string | null } | null }).organizations;
    const fromAddress = process.env["RESEND_FROM_EMAIL"] || "onboarding@resend.dev";
    const replyTo = org?.email && EMAIL_RE.test(org.email) ? org.email : undefined;

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: `${(org?.name ?? "Keshja Business").replace(/[<>"]/g, "")} <${fromAddress}>`,
        to: [data.to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: data.subject,
        text: data.message,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(data.message)}</div>`,
        attachments: [{ filename: data.filename, content: data.pdfBase64 }],
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`E-Mail-Versand fehlgeschlagen [${res.status}]: ${body}`);
      return { ok: false as const, error: `Versand fehlgeschlagen (${res.status}): ${body.slice(0, 300)}` };
    }
    let id: string | undefined;
    try { id = (JSON.parse(body) as { id?: string }).id; } catch { /* ignore */ }
    return { ok: true as const, id: id ?? null };
  });
