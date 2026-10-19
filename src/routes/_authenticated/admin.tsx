import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/OrgGate";
import {
  getOperatorDashboard,
  setSubscription,
  setPlan,
  getOcrReservations,
  refundOcr,
  type OperatorData,
  type OcrReservation,
} from "@/lib/tariffs.functions";
import { usePlans } from "@/hooks/useTariff";
import { STATUS_LABEL, type TariffPlan, type Subscription } from "@/lib/tariffs";
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Betreiberverwaltung – KESHJA Business" },
      {
        name: "description",
        content:
          "Geschützte Tarifverwaltung und Änderungsprotokoll für den autorisierten Betreiber.",
      },
      { property: "og:title", content: "Betreiberverwaltung – KESHJA Business" },
      {
        property: "og:description",
        content: "Geschützte Organisations-, Nutzungs- und Tarifverwaltung.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});
function Admin() {
  const get = useServerFn(getOperatorDashboard);
  const q = useQuery({ queryKey: ["operator-dashboard"], queryFn: () => get() });
  return (
    <AppShell>
      <div className="space-y-7">
        <PageHeader
          title="Betreiberverwaltung"
          description="Manuelle Freischaltungen und nachvollziehbare Tarifänderungen."
        />
        {q.isPending ? (
          <p>Zugriff wird geprüft …</p>
        ) : q.error ? (
          <div role="alert" className="border-y border-border py-6">
            <h2 className="font-semibold">Kein Betreiberzugriff</h2>
            <p className="mt-2 text-sm text-muted-foreground">{q.error.message}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Die Erstfreigabe muss kontrolliert durch den Projektinhaber erfolgen;
              Unternehmensrollen geben keinen Betreiberzugriff.
            </p>
          </div>
        ) : (
          <AdminContent data={q.data} />
        )}
      </div>
    </AppShell>
  );
}
function AdminContent({ data }: { data: OperatorData }) {
  const plans = usePlans();
  return (
    <>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Organisationen & Nutzung</h2>
        <div className="space-y-5">
          {data.organizations.map((o) => (
            <SubscriptionEditor key={o.id} org={o} />
          ))}
        </div>
      </section>
      <section className="border-t border-border pt-7">
        <h2 className="mb-4 text-xl font-semibold">Zentrale Tarifregeln</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.data?.map((p) => (
            <PlanEditor key={p.id + JSON.stringify(p)} plan={p} />
          ))}
        </div>
      </section>
      <OcrReview />
      <section className="border-t border-border pt-7">
        <h2 className="mb-4 text-xl font-semibold">Nutzer</h2>
        <ul className="divide-y divide-border">
          {data.users.map((u) => (
            <li key={u.id} className="py-3 text-sm">
              <strong>{u.display_name || "Ohne Anzeigename"}</strong>
              <p className="break-all text-xs text-muted-foreground">{u.id}</p>
              <p className="mt-1 text-muted-foreground">
                {u.memberships
                  .map(
                    (m) =>
                      `${data.organizations.find((o) => o.id === m.organization_id)?.name ?? m.organization_id} (${m.role})`,
                  )
                  .join(", ") || "Ohne Organisation"}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="border-t border-border pt-7">
        <h2 className="mb-4 text-xl font-semibold">Änderungsprotokoll · letzte 100</h2>
        {data.audit.length ? (
          data.audit.map((a) => (
            <details key={a.id} className="border-b border-border py-3 text-sm">
              <summary className="cursor-pointer">
                {new Date(a.created_at).toLocaleString("de-DE")} · {a.reason}
              </summary>
              <p className="mt-2 break-all text-xs text-muted-foreground">
                Administrator:{" "}
                {data.users.find((u) => u.id === a.administrator)?.display_name ?? a.administrator}
              </p>
              <pre className="mt-2 overflow-x-auto text-xs">
                {JSON.stringify({ vorher: a.before_value, nachher: a.after_value }, null, 2)}
              </pre>
            </details>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Noch keine Änderungen.</p>
        )}
      </section>
    </>
  );
}
function SubscriptionEditor({ org }: { org: OperatorData["organizations"][number] }) {
  const s = org.tariff.subscription;
  const [plan, setPlanId] = useState(s.plan_id);
  const [status, setStatus] = useState(s.status);
  const [start, setStart] = useState(s.starts_at.slice(0, 16));
  const [end, setEnd] = useState(s.period_end?.slice(0, 16) ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = useServerFn(setSubscription);
  const qc = useQueryClient();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await set({
        data: {
          orgId: org.id,
          plan,
          status,
          start:
            start === s.starts_at.slice(0, 16) ? s.starts_at : new Date(start + "Z").toISOString(),
          end:
            status === "free"
              ? null
              : end === s.period_end?.slice(0, 16)
                ? s.period_end
                : new Date(end + "Z").toISOString(),
          reason,
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["operator-dashboard"] }),
        qc.invalidateQueries({ queryKey: ["tariff"] }),
      ]);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-lg border border-border bg-card/70 p-5">
      <h3 className="font-semibold">{org.name}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Wirksam: {org.tariff.plan.name} · Buchungen {org.tariff.manual_used}/
        {org.tariff.plan.manual_limit ?? "∞"} · OCR {org.tariff.ocr_used}/
        {org.tariff.plan.ocr_limit}
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tarif">
          <select
            className={inputClass}
            value={plan}
            onChange={(e) => setPlanId(e.target.value as Subscription["plan_id"])}
          >
            {["free", "basic", "premium"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as Subscription["status"])}
          >
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Beginn (UTC)">
          <input
            required
            type="datetime-local"
            className={inputClass}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="Ablauf (UTC)">
          <input
            required={status !== "free"}
            type="datetime-local"
            className={inputClass}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Änderungsgrund">
            <input
              required
              minLength={3}
              className={inputClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
        <Button className="self-end" disabled={busy} type="submit">
          {busy ? "Speichert …" : "Freischaltung speichern"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </article>
  );
}
function PlanEditor({ plan }: { plan: TariffPlan }) {
  const [p, update] = useState(plan);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = useServerFn(setPlan);
  const qc = useQueryClient();
  return (
    <form
      className="space-y-3 rounded-lg border border-border bg-card/70 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await set({ data: { plan: p.id, values: p, reason } });
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["tariff-plans"] }),
            qc.invalidateQueries({ queryKey: ["tariff"] }),
            qc.invalidateQueries({ queryKey: ["operator-dashboard"] }),
          ]);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold">{p.name}</h3>
      <Field label="Monatspreis in Cent">
        <input
          type="number"
          min={0}
          required
          className={inputClass}
          value={p.price_cents}
          onChange={(e) => update({ ...p, price_cents: Number(e.target.value) })}
        />
      </Field>
      <Field label="Handbuchungen (leer = unbegrenzt)">
        <input
          type="number"
          min={0}
          className={inputClass}
          value={p.manual_limit ?? ""}
          onChange={(e) =>
            update({ ...p, manual_limit: e.target.value === "" ? null : Number(e.target.value) })
          }
        />
      </Field>
      <Field label="KI-Scans / Monat">
        <input
          type="number"
          min={0}
          required
          className={inputClass}
          value={p.ocr_limit}
          onChange={(e) => update({ ...p, ocr_limit: Number(e.target.value) })}
        />
      </Field>
      {(["documents", "voice", "logo", "advanced_reports"] as const).map((k) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary"
            checked={p[k]}
            onChange={(e) => update({ ...p, [k]: e.target.checked })}
          />
          {
            {
              documents: "Angebote & Rechnungen",
              voice: "Sprachbuchung",
              logo: "Firmenlogo",
              advanced_reports: "Erweiterte Auswertungen",
            }[k]
          }
        </label>
      ))}
      <Field label="Änderungsgrund">
        <input
          className={inputClass}
          required
          minLength={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <Button disabled={busy} type="submit" variant="outline" className="w-full">
        Tarifregeln speichern
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function OcrReview() {
  const get = useServerFn(getOcrReservations);
  const q = useQuery({ queryKey: ["operator-ocr"], queryFn: () => get() });
  return (
    <section className="border-t border-border pt-7">
      <h2 className="mb-3 text-xl font-semibold">Ungeklärte KI-Reservierungen</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Nur nach Prüfung, dass kein kostenpflichtiger Aufruf ausgeführt wurde, erstatten. Ein
        Timeout allein genügt nicht.
      </p>
      {q.error ? (
        <p role="alert" className="text-destructive">
          {q.error.message}
        </p>
      ) : q.data?.length ? (
        q.data.map((r) => <RefundEditor key={r.id} request={r} />)
      ) : (
        <p className="text-sm text-muted-foreground">Keine offenen Reservierungen.</p>
      )}
    </section>
  );
}
function RefundEditor({ request }: { request: OcrReservation }) {
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refund = useServerFn(refundOcr);
  const qc = useQueryClient();
  return (
    <form
      className="space-y-3 border-b border-border py-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!verified) return;
        setBusy(true);
        try {
          await refund({ data: { requestId: request.id, reason } });
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["operator-ocr"] }),
            qc.invalidateQueries({ queryKey: ["operator-dashboard"] }),
            qc.invalidateQueries({ queryKey: ["tariff"] }),
          ]);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erstattung fehlgeschlagen");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="break-all text-xs text-muted-foreground">
        {request.id} · {new Date(request.created_at).toLocaleString("de-DE")}
      </p>
      <Field label="Prüfergebnis und Erstattungsgrund">
        <input
          className={inputClass}
          required
          minLength={10}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 accent-primary"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
        />
        Ich habe geprüft, dass die KI-Ausführung nicht gestartet wurde.
      </label>
      <Button type="submit" variant="outline" disabled={!verified || busy}>
        Reservierung geprüft erstatten
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
