/** Trusted workstation only. Requires an already configured server credential.
 * Never import into app code. An explicit verified user UUID and reason are required.
 */
import { createClient } from "@supabase/supabase-js";
const [id, reason] = process.argv.slice(2);
if (!id || !reason || reason.trim().length < 10 || !/^[0-9a-f-]{36}$/i.test(id))
  throw new Error(
    "Usage: bun scripts/setup-operator.ts <verified-user-uuid> <verification-reason>",
  );
const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !key)
  throw new Error(
    "Trusted server configuration is required. Do not request or expose Cloud secrets.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false },
  global: {
    fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
        h.delete("Authorization");
      h.set("apikey", key);
      return fetch(input, { ...init, headers: h });
    },
  },
});
const user = await db.auth.admin.getUserById(id);
if (user.error || !user.data.user?.email_confirmed_at)
  throw new Error("A confirmed existing account is required.");
const existing = await db.from("platform_operators").select("user_id");
if (existing.error) throw new Error("Cannot verify existing operator grants.");
if (existing.data.length) throw new Error("Initial setup is closed: an operator already exists.");
const insert = await db.from("platform_operators").insert({ user_id: id });
if (insert.error) throw new Error("Operator grant failed.");
const audit = await db
  .from("subscription_audit")
  .insert({
    administrator: id,
    reason: `Verified initial operator setup: ${reason}`,
    after_value: { operator_user: id, action: "bootstrap" },
  });
if (audit.error) {
  await db.from("platform_operators").delete().eq("user_id", id);
  throw new Error("Audit failed; operator grant removed.");
}
console.log("Verified operator access created and audited. No credentials were printed.");
