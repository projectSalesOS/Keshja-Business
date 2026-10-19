import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { legalDetailsSchema, type LegalData } from "./legal";

export const getPublicLegal = createServerFn({ method: "GET" }).handler(async (): Promise<LegalData> => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  const url = process.env['SUPABASE_URL'];
  if (!key || !url) throw new Error("Rechtliche Angaben können gerade nicht geladen werden.");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const r = await client.rpc("public_legal_settings");
  if (r.error) throw new Error("Rechtliche Angaben können gerade nicht geladen werden.");
  return r.data as unknown as LegalData;
});
export const saveLegalSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { details: unknown; reason: string }) => ({
    details: legalDetailsSchema.parse(input.details), reason: input.reason.trim(),
  }))
  .handler(async ({ data, context }) => {
    const r = await context.supabase.rpc("operator_save_legal_settings", { _details: data.details, _reason: data.reason });
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });