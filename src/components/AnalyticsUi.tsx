import type { ReactNode } from "react";
import { inputClass } from "@/components/OrgGate";
import { rangeFor, type Preset, type Range } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export const PRESET_LABEL: Record<Preset, string> = {
  monat: "Monat",
  vormonat: "Vormonat",
  quartal: "Quartal",
  jahr: "Jahr",
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
    <div className="period-picker flex min-w-0 flex-wrap items-end gap-3">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
          <Button
            variant="ghost"
            key={p}
            type="button"
            onClick={() => onChange(p, p === "frei" ? custom : rangeFor(p, today))}
            aria-pressed={preset === p}
            className={`h-10 shrink-0 rounded-md px-3 text-xs font-medium transition-colors ${
              preset === p ? "bg-secondary text-primary hover:bg-secondary" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {PRESET_LABEL[p]}
          </Button>
        ))}
      </div>
      {preset === "frei" && (
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:w-auto">
          <input
            type="date"
            aria-label="Von"
            className={`${inputClass} min-w-0 py-1.5`}
            value={custom.from}
            onChange={(e) => e.target.value && onChange("frei", { ...custom, from: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">bis</span>
          <input
            type="date"
            aria-label="Bis"
            className={`${inputClass} min-w-0 py-1.5`}
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
  valueColor,
  matchAccent = false,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  delta?: { pct: number | null; label: string; invert?: boolean } | undefined;
  tone?: "default" | "good" | "bad" | "muted";
  badge?: string;
  accent?: "violet" | "blue" | "turquoise" | "green" | "orange" | "pink";
  valueColor?: "income" | "expense" | "balance" | "dashboardIncome" | "dashboardExpense" | "profitPositive" | "profitNegative" | "profitNeutral";
  matchAccent?: boolean;
}) {
  const toneCls = valueColor ? { income: "text-finance-income", expense: "text-finance-expense", balance: "text-finance-balance", dashboardIncome: "text-dashboard-income", dashboardExpense: "text-dashboard-expense", profitPositive: "text-profit-positive", profitNegative: "text-profit-negative", profitNeutral: "text-profit-neutral" }[valueColor] : tone === "good" ? "text-primary" : tone === "bad" ? "text-destructive" : "text-card-foreground";
  const tintCls = accent
    ? `glass-tint-accent-${accent}`
    : valueColor
      ? {
          income: "glass-tint-green",
          expense: "glass-tint-red",
          balance: "glass-tint-violet",
          dashboardIncome: "glass-tint-green",
          dashboardExpense: "glass-tint-red",
          profitPositive: "glass-tint-violet",
          profitNegative: "glass-tint-destructive",
          profitNeutral: "glass-tint-violet",
        }[valueColor]
      : tone === "bad"
        ? "glass-tint-destructive"
        : "glass-tint-default";
  const accentCls = {
    violet: "bg-kpi-violet",
    blue: "bg-kpi-blue",
    turquoise: "bg-kpi-turquoise",
    green: "bg-kpi-green",
    orange: "bg-kpi-orange",
    pink: "bg-kpi-pink",
  };
  return (
    <div className={`kpi-stat relative min-w-0 overflow-hidden rounded-xl p-5 glass-tile ${tintCls}`}>
      {(accent || matchAccent) && <span aria-hidden="true" className={`kpi-contour absolute inset-0 pointer-events-none ${matchAccent ? `bg-current ${toneCls}` : accent ? accentCls[accent] : ""}`} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {badge && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p className={`kpi-value mt-3 break-words text-2xl font-semibold leading-tight tabular-nums sm:text-3xl ${toneCls}`}>{value}</p>
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
    <section className="min-w-0 border-t border-border pt-5">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
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
