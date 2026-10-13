import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Copy, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ORG_QUERY_KEY,
  ROLE_LABEL,
  useOrganization,
  type Organization,
  type OrgRole,
} from "@/hooks/useOrganization";

const inputClass =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50";

type Fields = Pick<
  Organization,
  | "name" | "legal_form" | "street" | "postal_code" | "city" | "email" | "phone"
  | "tax_number" | "vat_id" | "iban" | "bic" | "bank_name" | "small_business" | "default_payment_days"
>;

const TEXT_FIELDS: { key: keyof Fields; label: string }[] = [
  { key: "name", label: "Unternehmensname" },
  { key: "legal_form", label: "Rechtsform" },
  { key: "street", label: "Straße und Hausnummer" },
  { key: "postal_code", label: "PLZ" },
  { key: "city", label: "Ort" },
  { key: "email", label: "E-Mail" },
  { key: "phone", label: "Telefon" },
  { key: "tax_number", label: "Steuernummer" },
  { key: "vat_id", label: "USt-IdNr." },
  { key: "iban", label: "IBAN" },
  { key: "bic", label: "BIC" },
  { key: "bank_name", label: "Bank" },
];

export function OrganizationCard() {
  const { data, isLoading } = useOrganization();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Fields | null>(null);

  useEffect(() => {
    if (data?.organization) setForm({ ...data.organization });
  }, [data?.organization]);

  const refresh = () => qc.invalidateQueries({ queryKey: ORG_QUERY_KEY });

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success(ok);
  }

  if (isLoading || !data) {
    return <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">Unternehmen wird geladen …</div>;
  }

  const org = data.organization;
  const isAdmin = data.role === "owner" || data.role === "admin";

  if (!org) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
        <Header />
        <p className="text-sm text-muted-foreground">
          Lege dein Unternehmen an oder tritt mit einem Einladungscode einem bestehenden bei.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Name des Unternehmens" value={name} onChange={(e) => setName(e.target.value)} />
            <button className={btn} disabled={busy || !name.trim()} onClick={() => run(() => supabase.rpc("create_organization", { _name: name }), "Unternehmen angelegt.")}>Anlegen</button>
          </div>
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Einladungscode" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className={btn} disabled={busy || !code.trim()} onClick={() => run(() => supabase.rpc("join_organization", { _code: code }), "Beigetreten.")}>Beitreten</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
      <div className="flex items-center justify-between">
        <Header />
        <span className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
          Deine Rolle: {data.role ? ROLE_LABEL[data.role] : "–"}
        </span>
      </div>

      {form && (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name?.trim()) {
              toast.error("Der Unternehmensname darf nicht leer sein.");
              return;
            }
            run(() => supabase.from("organizations").update(form).eq("id", org.id), "Unternehmensdaten gespeichert.");
          }}
        >
          {TEXT_FIELDS.map((f) => (
            <label key={f.key} className="space-y-1 text-xs text-muted-foreground">
              {f.label}
              <input
                className={inputClass}
                disabled={!isAdmin}
                value={(form[f.key] as string | null) ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value || null })}
              />
            </label>
          ))}
          <label className="space-y-1 text-xs text-muted-foreground">
            Zahlungsziel (Tage)
            <input type="number" min={0} max={365} className={inputClass} disabled={!isAdmin}
              value={form.default_payment_days}
              onChange={(e) => setForm({ ...form, default_payment_days: Number(e.target.value) })} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" disabled={!isAdmin} checked={form.small_business}
              onChange={(e) => setForm({ ...form, small_business: e.target.checked })} />
            Kleinunternehmer (§ 19 UStG)
          </label>
          {isAdmin && (
            <div className="sm:col-span-2">
              <button className={btn} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Speichern</button>
            </div>
          )}
        </form>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Benutzer</h3>
        {isAdmin && org.invite_code && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-accent px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Einladungscode für neue Mitarbeiter</p>
              <p className="font-mono font-semibold tracking-widest text-accent-foreground">{org.invite_code}</p>
            </div>
            <div className="flex gap-1">
              <button type="button" aria-label="Code kopieren" className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
                onClick={() => { navigator.clipboard.writeText(org.invite_code!); toast.success("Code kopiert."); }}>
                <Copy className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Neuen Code erzeugen" className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
                onClick={() => run(() => supabase.rpc("regenerate_org_invite_code", { _org: org.id }), "Neuer Code erzeugt.")}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <ul className="divide-y divide-border rounded-xl border border-border">
          {data.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>{m.displayName}{m.userId === data.userId && " (du)"}</span>
              <div className="flex items-center gap-2">
                {isAdmin && m.role !== "owner" && m.userId !== data.userId ? (
                  <>
                    <select className="rounded-lg border border-input bg-background px-2 py-1 text-xs" value={m.role}
                      onChange={(e) => run(() => supabase.from("organization_members").update({ role: e.target.value as OrgRole }).eq("id", m.id), "Rolle geändert.")}>
                      <option value="admin">Admin</option>
                      <option value="member">Mitarbeiter</option>
                    </select>
                    <button aria-label="Entfernen" className="p-1 text-muted-foreground hover:text-destructive"
                      onClick={() => confirm(`${m.displayName} entfernen?`) && run(() => supabase.from("organization_members").delete().eq("id", m.id), "Benutzer entfernt.")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-primary" />
      <h2 className="text-sm font-semibold">Unternehmen</h2>
    </div>
  );
}
