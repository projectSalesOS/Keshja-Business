import type { ReactNode } from "react";
import { inputClass } from "@/components/OrgGate";
import { rangeFor, type Preset, type Range } from "@/lib/analytics";

export const PRESET_LABEL: Record<Preset, string> = {
  monat: "Aktueller Monat",
  vormonat: "Vormonat",
  jahr: "Aktuelles Jahr",
  frei: "Frei wählbar",
};

export function PeriodPicker({
  preset,
  custom,
  today,
  onChange,
}: {
  preset: Preset;
  custom: Range;
  today: string;
  onChange: (preset: Preset, custom: Range) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p, p === "frei" ? custom : rangeFor(p, today))}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              preset === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {PRESET_LABEL[p]}
          </button>
        ))}
      </div>
      {preset === "frei" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Von"
            className={`${inputClass} w-auto py-1.5`}
            value={custom.from}
            onChange={(e) => e.target.value && onChange("frei", { ...custom, from: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">bis</span>
          <input
            type="date"
            aria-label="Bis"
            className={`${inputClass} w-auto py-1.5`}
            value={custom.to}
            onChange={(e) => e.target.value && onChange("frei", { ...custom, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  delta,
  tone = "default",
  badge,
  accent,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  delta?: { pct: number | null; label: string; invert?: boolean } | undefined;
  tone?: "default" | "good" | "bad" | "muted";
  badge?: string;
  accent?: "violet" | "blue" | "turquoise" | "green" | "orange" | "pink";
}) {
  const toneCls = tone === "good" ? "text-primary" : tone === "bad" ? "text-destructive" : "text-card-foreground";
  const accentCls = {
    violet: "bg-kpi-violet",
    blue: "bg-kpi-blue",
    turquoise: "bg-kpi-turquoise",
    green: "bg-kpi-green",
    orange: "bg-kpi-orange",
    pink: "bg-kpi-pink",
  };
  return (
    <div className="relative rounded-2xl border border-border bg-card p-4 shadow-card">
      {accent && <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${accentCls[accent]}`} />}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {badge && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p className={`mt-2 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${toneCls}`}>{value}</p>
      {delta && (
        <p className="mt-1 text-xs text-muted-foreground">
          {delta.pct === null ? (
            <>Keine Vergleichsdaten ({delta.label})</>
          ) : (
            <>
              <span
                className={
                  (delta.pct >= 0) !== !!delta.invert ? "font-medium text-primary" : "font-medium text-destructive"
                }
              >
                {delta.pct > 0 ? "+" : ""}
                {delta.pct.toLocaleString("de-DE")} %
              </span>{" "}
              ggü. {delta.label}
            </>
          )}
        </p>
      )}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
};
