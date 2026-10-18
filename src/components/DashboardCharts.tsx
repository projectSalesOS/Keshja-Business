import { useId } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { currency } from "@/lib/finance";
import { monthLabel } from "@/lib/analytics";
import type { dashboardData } from "@/lib/dashboard";
import { tooltipStyle } from "./AnalyticsUi";

type Data = ReturnType<typeof dashboardData>;
const monthTick = (month: string) => monthLabel(month);
const moneyTick = (n: number) => n.toLocaleString("de-DE", { notation: "compact" });
export const categoryColors = ["var(--dash-expense)", "var(--dash-brand)", "var(--dash-income)", "var(--dash-category-muted)"];

export function BalanceChart({ data }: { data: Data["series"] }) {
  const id = useId().replace(/:/g, "");
  return <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 0 }} accessibilityLayer>
      <defs><linearGradient id={`balance-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--dash-brand)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--dash-brand)" stopOpacity={0.01} /></linearGradient></defs>
      <CartesianGrid stroke="var(--dash-line)" strokeDasharray="3 4" vertical={false} />
      <XAxis dataKey="month" tickFormatter={monthTick} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={20} />
      <YAxis width={42} tickFormatter={moneyTick} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => currency(v)} labelFormatter={monthTick} />
      <Area type="linear" dataKey="balance" name="Gewinn / Verlust" stroke="var(--dash-brand)" strokeWidth={2.5} fill={`url(#balance-${id})`} dot={data.length === 1 ? { r: 4 } : false} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer>;
}

export function MiniBars({ data, type }: { data: Data["series"]; type: "income" | "expense" }) {
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 8, right: 2, left: 2, bottom: 0 }} accessibilityLayer>
      <CartesianGrid stroke="var(--dash-line)" strokeDasharray="3 4" vertical={false} />
      <XAxis dataKey="month" tickFormatter={monthTick} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={20} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => currency(v)} labelFormatter={monthTick} cursor={{ fill: "var(--dash-line)" }} />
      <Bar dataKey={type} name={type === "income" ? "Einnahmen" : "Ausgaben"} fill={`var(--dash-${type})`} fillOpacity={0.65} maxBarSize={28} radius={[4, 4, 0, 0]} isAnimationActive={false} />
    </BarChart>
  </ResponsiveContainer>;
}

export function ExpenseRing({ data }: { data: Data["categories"] }) {
  return <ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer>
    <Pie data={data} dataKey="value" nameKey="name" innerRadius="73%" outerRadius="94%" paddingAngle={data.length > 1 ? 3 : 0} stroke="var(--dash-surface)" strokeWidth={2} isAnimationActive={false}>
      {data.map((c, i) => <Cell key={c.name} fill={categoryColors[i % categoryColors.length]} />)}
    </Pie><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => currency(v)} />
  </PieChart></ResponsiveContainer>;
}

export function IncomeExpenseChart({ data }: { data: Data["trend"] }) {
  const id = useId().replace(/:/g, "");
  return <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
    <defs>{(["income", "expense"] as const).map((type) => <linearGradient key={type} id={`${type}-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={`var(--dash-${type})`} stopOpacity={0.13} /><stop offset="100%" stopColor={`var(--dash-${type})`} stopOpacity={0} /></linearGradient>)}</defs>
    <CartesianGrid stroke="var(--dash-line)" strokeDasharray="3 4" vertical={false} />
    <XAxis dataKey="month" tickFormatter={monthTick} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={14} />
    <YAxis width={46} tickFormatter={moneyTick} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => currency(v)} labelFormatter={monthTick} />
    <Legend content={() => <div className="mt-3 flex justify-center gap-5 text-xs"><span className="dash-income">● Einnahmen</span><span className="dash-expense">● Ausgaben</span></div>} />
    {(["income", "expense"] as const).map((type) => <Area key={type} type="linear" dataKey={type} fill={`url(#${type}-${id})`} stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />)}
    <Line type="linear" dataKey="income" name="Einnahmen" stroke="var(--dash-income)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} isAnimationActive={false} />
    <Line type="linear" dataKey="expense" name="Ausgaben" stroke="var(--dash-expense)" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3, strokeWidth: 2 }} isAnimationActive={false} />
  </ComposedChart></ResponsiveContainer>;
}