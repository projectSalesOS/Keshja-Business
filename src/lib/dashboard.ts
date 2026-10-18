import { actualTotals, byCategory, change, inRange, monthlySeries, previousRange, type ATx, type Range } from "./analytics";

/** One selected range for every dashboard metric; context months outside it are gaps, not fabricated zeroes. */
export function dashboardData(transactions: ATx[], range: Range) {
  const paid = transactions.filter((t) => t.status === "bezahlt" && inRange(t.booking_date, range));
  const previous = previousRange(range);
  const priorPaid = transactions.filter((t) => t.status === "bezahlt" && inRange(t.booking_date, previous));
  const totals = actualTotals(transactions, range);
  const prior = actualTotals(transactions, previous);
  const incomeCount = paid.filter((t) => t.type === "income").length;
  const expenseCount = paid.filter((t) => t.type === "expense").length;
  const end = new Date(`${range.to}T12:00:00Z`);
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() - 5);
  const contextRange = { from: end.toISOString().slice(0, 10), to: range.to };
  const trend = monthlySeries(paid, contextRange).map((row) => {
    const active = row.month >= range.from.slice(0, 7) && row.month <= range.to.slice(0, 7);
    return { ...row, income: active ? row.income : null, expense: active ? row.expense : null, balance: active ? row.balance : null };
  });
  return {
    totals, incomeCount, expenseCount, previous,
    deltas: {
      income: change(totals.income, prior.income, priorPaid.filter((t) => t.type === "income").length),
      expense: change(totals.expense, prior.expense, priorPaid.filter((t) => t.type === "expense").length),
      balance: change(totals.balance, prior.balance, priorPaid.length),
    },
    series: monthlySeries(transactions, range),
    trend,
    categories: byCategory(transactions, range, "expense"),
  };
}