import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/**
 * Benachrichtigt den Betreiber per E-Mail über eine neue Registrierung.
 * Öffentlich aufrufbar (der Nutzer hat vor der E-Mail-Bestätigung keine Sitzung),
 * aber duplikatgeschützt: pro Profil wird genau einmal versendet
 * (atomares Setzen von profiles.operator_notified_at).
 * Fehler blockieren niemals die Registrierung – der Aufruf liefert ok:false statt zu werfen.
 */
export const notifyRegistration = createServerFn({ method: "POST" })
  .inputValidator((i: { email: string }) => {
    const email = String(i?.email ?? "").trim();
    if (!EMAIL_RE.test(email) || email.length > 320) throw new Error("Ungültige E-Mail-Adresse.");
    return { email };
  })
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Atomar genau einmal pro Profil markieren; kein Treffer = unbekannt oder bereits benachrichtigt.
      const claim = await supabaseAdmin
        .from("profiles")
        .update({ operator_notified_at: new Date().toISOString() })
        .ilike("email", data.email)
        .is("operator_notified_at", null)
        .select("id, display_name");
      if (claim.error) {
        console.error(`Registrierungs-Benachrichtigung: Markierung fehlgeschlagen: ${claim.error.message}`);
        return { ok: false as const, error: "mark_failed" };
      }
      const profile = claim.data?.[0];
      if (!profile) return { ok: true as const, sent: false as const, reason: "duplicate_or_unknown" };

      const lovableKey = process.env["LOVABLE_API_KEY"];
      const resendKey = process.env["RESEND_API_KEY"];
      const operatorEmail = process.env["OPERATOR_NOTIFICATION_EMAIL"];
      if (!lovableKey || !resendKey || !operatorEmail) {
        console.error("Registrierungs-Benachrichtigung: E-Mail-Konfiguration fehlt (LOVABLE_API_KEY / RESEND_API_KEY / OPERATOR_NOTIFICATION_EMAIL).");
        return { ok: false as const, error: "email_not_configured" };
      }

      // Organisation, sofern der Nutzer bereits einer beigetreten ist.
      let orgName: string | null = null;
      const membership = await supabaseAdmin
        .from("organization_members")
        .select("organizations(name)")
        .eq("user_id", profile.id)
        .limit(1)
        .maybeSingle();
      if (!membership.error && membership.data) {
        orgName =
          (membership.data as unknown as { organizations: { name: string } | null }).organizations
            ?.name ?? null;
      }

      const fromAddress = process.env["RESEND_FROM_EMAIL"] || "onboarding@resend.dev";
      const registeredAt = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
      const lines = [
        `Neue Registrierung bei KESHJA Business.`,
        ``,
        `Zeitpunkt: ${registeredAt}`,
        `E-Mail: ${data.email}`,
        `Name: ${profile.display_name ?? "–"}`,
        `Organisation: ${orgName ?? "noch keine"}`,
      ];
      const text = lines.join("\n");

      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": resendKey,
        },
        body: JSON.stringify({
          from: `KESHJA Business <${fromAddress}>`,
          to: [operatorEmail],
          subject: `Neue Registrierung: ${data.email}`,
          text,
          html: `<div style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(text)}</div>`,
        }),
      });
      const body = await res.text();
      if (!res.ok) {
        console.error(`Registrierungs-Benachrichtigung fehlgeschlagen [${res.status}]: ${body}`);
        return { ok: false as const, error: `send_failed_${res.status}` };
      }
      return { ok: true as const, sent: true as const };
    } catch (e) {
      console.error(`Registrierungs-Benachrichtigung: ${e instanceof Error ? e.message : e}`);
      return { ok: false as const, error: "unexpected" };
    }
  });
