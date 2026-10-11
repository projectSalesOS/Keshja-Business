import type { LucideIcon } from "lucide-react";

type KpiColor = "violet" | "blue" | "green" | "orange";

const gradients: Record<KpiColor, string> = {
  violet: "from-violet-700 to-violet-500",
  blue: "from-blue-700 to-blue-500",
  green: "from-emerald-700 to-emerald-500",
  orange: "from-amber-700 to-amber-500",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  icon: LucideIcon;
  color?: KpiColor;
}) {
  const accent = color ? gradients[color] : "from-[#1a1a1a] to-violet-600";

  return (
    <div className={`relative rounded-2xl border border-border border-l-0 bg-card p-5 shadow-card ${color ? "overflow-hidden" : ""}`}>
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b ${accent}`}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-card-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}