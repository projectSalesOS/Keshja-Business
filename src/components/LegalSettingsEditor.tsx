import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveLegalSettings } from "@/lib/legal.functions";
import { LEGAL_FIELDS, missingLegalFields, type LegalDetails } from "@/lib/legal";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/OrgGate";
import { LegalLinks } from "./LegalLinks";

export function LegalSettingsEditor() {
  const q = useQuery({ queryKey: ["operator-legal"], queryFn: async () => {
    const r = await supabase.from("platform_legal_settings").select("details,updated_at").maybeSingle();
    if (r.error) throw r.error;
    return { details: (r.data?.details ?? {}) as LegalDetails, updated_at: r.data?.updated_at ?? null };
  }, retry: false });
  return <section className="border-b border-border pb-7">
    <h2 className="mb-3 text-xl font-semibold">Unternehmensdaten & Rechtliches</h2>
    <p className="mb-4 text-sm text-muted-foreground">Plattformbetreiber, nicht Kundenunternehmen. Öffentliche Angaben erscheinen in allen Rechtsentwürfen. Steuernummer bleibt intern. Unvollständige Entwürfe dürfen nicht als rechtlich freigegeben behandelt werden.</p>
    {q.isPending ? <p>Angaben werden geladen …</p> : q.error ? <p role="alert" className="text-destructive">{q.error.message}</p> : <Editor key={q.data.updated_at ?? "empty"} initial={q.data.details} />}
  </section>;
}
function Editor({ initial }: { initial: LegalDetails }) {
  const [details, setDetails] = useState(initial);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const save = useServerFn(saveLegalSettings);
  const qc = useQueryClient();
  const missing = missingLegalFields(details);
  return <form className="space-y-5" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await save({ data: { details, reason } });
      setMessage("Unternehmensdaten gespeichert. Öffentliche Dokumente übernehmen die Angaben beim Öffnen oder Neuladen.");
      await Promise.all([qc.invalidateQueries({ queryKey: ["operator-legal"] }), qc.invalidateQueries({ queryKey: ["public-legal"] }), qc.invalidateQueries({ queryKey: ["operator-dashboard"] })]);
    } catch (e) { setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen."); }
    finally { setBusy(false); }
  }}>
    <p role="status" className="text-sm text-destructive">{missing.length ? `Noch offen: ${missing.map(([, label]) => label).join(" · ")}` : "Basisangaben erfasst. Individuelle rechtliche Prüfung und Vollständigkeit für den Einzelfall bleiben erforderlich."}</p>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {LEGAL_FIELDS.map(([key, label, required], index) => <div key={key} className={index >= 15 ? "sm:col-span-2" : ""}>
        <Field label={`${label}${required ? " *" : ""}`}>
          {index >= 14 ? <textarea aria-label={label} rows={3} maxLength={10000} className={inputClass} value={details[key] ?? ""} onChange={e => setDetails({ ...details, [key]: e.target.value })} /> :
            <input aria-label={label} type={key === "email" ? "email" : key === "website" ? "url" : "text"} className={inputClass} value={details[key] ?? ""} onChange={e => setDetails({ ...details, [key]: e.target.value })} />}
          {required && !details[key]?.trim() && <span className="text-xs text-destructive">Fehlt – vor Freigabe ergänzen</span>}
        </Field>
      </div>)}
    </div>
    <Field label="Änderungsgrund"><input required minLength={3} className={inputClass} value={reason} onChange={e => setReason(e.target.value)} /></Field>
    <Button type="submit" disabled={busy}>{busy ? "Speichert …" : "Unternehmensdaten speichern"}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    <LegalLinks />
  </form>;
}