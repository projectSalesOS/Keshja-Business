import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Copy, ImageUp, Loader2, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { LOGO_BUCKET, LOGO_TYPES, validateLogoFile } from "@/lib/orgLogo";
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
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Header />
        <span className="justify-self-start rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
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
            const payload: Fields = {
              name: form.name.trim(),
              legal_form: form.legal_form, street: form.street, postal_code: form.postal_code,
              city: form.city, email: form.email, phone: form.phone, tax_number: form.tax_number,
              vat_id: form.vat_id, iban: form.iban, bic: form.bic, bank_name: form.bank_name,
              small_business: form.small_business, default_payment_days: form.default_payment_days,
            };
            run(() => supabase.from("organizations").update(payload).eq("id", org.id), "Unternehmensdaten gespeichert.");
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

      <LogoSection orgId={org.id} path={org.logo_path} isAdmin={isAdmin} onChanged={refresh} />

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
        {data.role !== "owner" && (
          <button type="button" disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-destructive hover:bg-accent disabled:opacity-50"
            onClick={() => confirm(`Unternehmen „${org.name}“ wirklich verlassen?`) && run(() => supabase.rpc("leave_organization", { _org: org.id }), "Unternehmen verlassen.")}>
            <LogOut className="h-4 w-4" /> Unternehmen verlassen
          </button>
        )}
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

function LogoSection({ orgId, path, isAdmin, onChanged }: { orgId: string; path: string | null; isAdmin: boolean; onChanged: () => Promise<unknown> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    setUrl(null);
    if (!path) return;
    supabase.storage.from(LOGO_BUCKET).download(path).then(({ data }) => {
      if (data) { revoke = URL.createObjectURL(data); setUrl(revoke); }
    });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [path]);

  async function upload(file: File) {
    const err = validateLogoFile(file);
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const newPath = `${orgId}/logo-${Date.now()}.${LOGO_TYPES[file.type]}`;
      const up = await supabase.storage.from(LOGO_BUCKET).upload(newPath, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("organizations").update({ logo_path: newPath }).eq("id", orgId);
      if (error) { await supabase.storage.from(LOGO_BUCKET).remove([newPath]); throw error; }
      if (path) await supabase.storage.from(LOGO_BUCKET).remove([path]);
      await onChanged();
      toast.success("Logo gespeichert.");
    } catch (e) {
      toast.error(`Logo konnte nicht gespeichert werden: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function removeLogo() {
    if (!path || !confirm("Logo entfernen?")) return undefined;
    setBusy(true);
    const { error } = await supabase.from("organizations").update({ logo_path: null }).eq("id", orgId);
    if (!error) await supabase.storage.from(LOGO_BUCKET).remove([path]);
    setBusy(false);
    if (error) { toast.error(error.message); return undefined; }
    await onChanged();
    toast.success("Logo entfernt.");
    return undefined;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Firmenlogo</h3>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-40 items-center justify-center rounded-xl bg-muted p-2">
          {url ? <img src={url} alt="Firmenlogo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Kein Logo</span>}
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <label className={`${btn} cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
              {path ? "Logo ersetzen" : "Logo hochladen"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
            </label>
            {path && <button type="button" className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-destructive" onClick={removeLogo}>Entfernen</button>}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPG oder WEBP, max. 2 MB. Erscheint rechts oben auf Angeboten, Rechnungen und Mahnungen.</p>
    </div>
  );
}
