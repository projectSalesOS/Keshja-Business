import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currency, breakdown, trend, type Dimension, type Period } from "@/lib/finance";
import { colorToken } from "@/lib/categories";
import type { Receipt } from "@/lib/mock-data";

/** Colors always come from the fixed category color concept. */
export const chartColor = colorToken;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

const EMPTY_TEXT =
  "Noch keine Ausgaben erfasst. Scanne deinen ersten Kassenbon, um deine Finanzen auszuwerten.";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
};

/** Display-only short forms – data, filters and reports keep the full names. */
const SHORT_LABELS: Record<string, string> = {
  "Restaurant & Außer Haus": "Restaurant & Außerh.",
  "Drogerie & Körperpflege": "Drogerie",
  "Freizeit & Unterhaltung": "Freizeit",
  "Geschenke & Sonstiges": "Sonstiges",
  "Büro & Bildung": "Büro",
  "Wohnen & Garten": "Wohnen",
  "Baby & Kinder": "Baby",
  Grundnahrungsmittel: "Grundnahrung",
  Haushaltsartikel: "Haushaltsart.",
  "Vitamine & Nahrungsergänzung": "Vitamine",
  "Unterhaltungselektronik": "Unterh.-Elektr.",
  "Cocktails & Mischgetränke": "Cocktails",
  "Zigarren & Zigarillos": "Zigarren",
  "E-Zigaretten & Vapes": "E-Zigaretten",
  "Sonstiges Baby & Kinder": "Sonstiges Baby",
  "Sonstige Dienstleistungen": "Sonst. Dienstl.",
};

const shortLabel = (name: string) => SHORT_LABELS[name] ?? name;

export function DimensionToggle({
  value,
  onChange,
}: {
  value: Dimension;
  onChange: (d: Dimension) => void;
}) {
  const options: { key: Dimension; label: string }[] = [
    { key: "bereich", label: "Kategorien" },
    { key: "kategorie", label: "Unterkategorien" },
  ];
  return (
    <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-card">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            value === o.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChartSection({ receipts, period }: { receipts: Receipt[]; period: Period }) {
  const [dimension, setDimension] = useState<Dimension>("bereich");
  const data = breakdown(receipts, dimension, dimension === "bereich" ? 10 : 12);
  const line = trend(receipts, period);
  const totalValue = data.reduce((s, d) => s + d.value, 0);
  const share = (v: number) => (totalValue ? Math.round((v / totalValue) * 100) : 0);
  const isEmpty = data.length === 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Verteilung</h2>
        <DimensionToggle value={dimension} onChange={setDimension} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Anteile">
          {isEmpty ? (
            <EmptyState text={EMPTY_TEXT} />
          ) : (
          <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-40 shrink-0 sm:h-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="52%"
                    outerRadius="82%"
                    paddingAngle={2}
                    stroke="var(--card)"
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={chartColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, n: string) => [currency(v), n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 overflow-y-auto pr-1 text-xs sm:max-h-full">
              {data.map((entry) => (
                <li key={entry.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: chartColor(entry.name) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {entry.name}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-card-foreground">
                    {currency(entry.value)}
                  </span>
                  <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
                    {share(entry.value)} %
                  </span>
                </li>
              ))}
            </ul>
          </div>
          )}
        </Panel>

        <Panel title="Top Ausgaben">
          {isEmpty ? <EmptyState text={EMPTY_TEXT} /> : <TopSpendingChart data={data} share={share} />}
        </Panel>

        <div className="lg:col-span-2">
          <Panel title="Verlauf">
            {line.length === 0 ? (
              <EmptyState text={EMPTY_TEXT} />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={line} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [currency(v), "Ausgaben"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}

function TopSpendingChart({
  data,
  share,
}: {
  data: { name: string; value: number }[];
  share: (v: number) => number;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const onOutside = (e: Event) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) {
        setResetKey((k) => k + 1);
      }
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, []);

  return (
    <div ref={wrapper} key={resetKey} className="h-full touch-manipulation">
          <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
            width={120}
            interval={0}
            tickFormatter={shortLabel}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
            trigger="click"
                cursor={{ fill: "var(--muted)" }}
            wrapperStyle={{ outline: "none", zIndex: 20 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]!.payload as { name: string; value: number };
              return (
                <div style={tooltipStyle} className="px-3 py-2 shadow-card">
                  <p className="font-medium">{p.name}</p>
                  <p className="mt-0.5 tabular-nums opacity-80">
                    {currency(p.value)} · {share(p.value)} %
                  </p>
                </div>
              );
            }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={chartColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
    </div>
  );
}