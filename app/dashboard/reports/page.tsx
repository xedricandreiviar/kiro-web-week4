"use client";

import { useState, useMemo } from "react";
import { transactionStorage, Transaction } from "../../lib/storage";
import { formatCurrency, getCategoryColor } from "../../lib/utils";

type PeriodKey = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "this_year";

interface PeriodOption {
  key: PeriodKey;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "last_3_months", label: "Last 3 Months" },
  { key: "last_6_months", label: "Last 6 Months" },
  { key: "this_year", label: "This Year" },
];

function getDateRange(period: PeriodKey): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "this_month":
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
      break;
    case "last_month":
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      break;
    case "last_3_months":
      startDate = new Date(year, month - 2, 1);
      endDate = new Date(year, month + 1, 0);
      break;
    case "last_6_months":
      startDate = new Date(year, month - 5, 1);
      endDate = new Date(year, month + 1, 0);
      break;
    case "this_year":
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      break;
  }

  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];
  return { start, end };
}

function getDaysInPeriod(period: PeriodKey): number {
  const { start, end } = getDateRange(period);
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getPreviousPeriodRange(period: PeriodKey): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "this_month":
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      break;
    case "last_month":
      startDate = new Date(year, month - 2, 1);
      endDate = new Date(year, month - 1, 0);
      break;
    case "last_3_months":
      startDate = new Date(year, month - 5, 1);
      endDate = new Date(year, month - 2, 0);
      break;
    case "last_6_months":
      startDate = new Date(year, month - 11, 1);
      endDate = new Date(year, month - 5, 0);
      break;
    case "this_year":
      startDate = new Date(year - 1, 0, 1);
      endDate = new Date(year - 1, 11, 31);
      break;
  }

  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];
  return { start, end };
}

function getMonthlyBreakdown(transactions: Transaction[], period: PeriodKey): { month: string; income: number; expenses: number; net: number }[] {
  if (period === "this_month" || period === "last_month") return [];

  const groups: Record<string, { income: number; expenses: number }> = {};

  transactions.forEach((t) => {
    const date = new Date(t.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = { income: 0, expenses: 0 };
    if (t.type === "income") groups[key].income += t.amount;
    else groups[key].expenses += t.amount;
  });

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const [y, m] = key.split("-");
      const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return { month: monthName, income: data.income, expenses: data.expenses, net: data.income - data.expenses };
    });
}

export default function ReportsPage() {
  const [allTransactions] = useState<Transaction[]>(() => transactionStorage.getAll());
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("this_month");

  const reportData = useMemo(() => {
    const { start, end } = getDateRange(selectedPeriod);
    const transactions = allTransactions.filter((t) => t.date >= start && t.date <= end);

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    // Expense breakdown by category
    const categoryMap: Record<string, number> = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    const categories = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }));

    // Top 5 spending categories
    const topCategories = categories.slice(0, 5);

    // Monthly breakdown
    const monthlyData = getMonthlyBreakdown(transactions, selectedPeriod);

    // Average daily spending
    const days = getDaysInPeriod(selectedPeriod);
    const avgDailySpending = days > 0 ? totalExpenses / days : 0;

    // Biggest expense
    const expenses = transactions.filter((t) => t.type === "expense");
    const biggestExpense = expenses.length > 0
      ? expenses.reduce((max, t) => (t.amount > max.amount ? t : max), expenses[0])
      : null;

    // Category that grew most
    const prevRange = getPreviousPeriodRange(selectedPeriod);
    const prevTransactions = allTransactions.filter((t) => t.date >= prevRange.start && t.date <= prevRange.end);
    const prevCategoryMap: Record<string, number> = {};
    prevTransactions.filter((t) => t.type === "expense").forEach((t) => {
      prevCategoryMap[t.category] = (prevCategoryMap[t.category] || 0) + t.amount;
    });

    let fastestGrowing: { name: string; growth: number } | null = null;
    for (const [cat, amount] of Object.entries(categoryMap)) {
      const prevAmount = prevCategoryMap[cat] || 0;
      if (prevAmount > 0) {
        const growth = ((amount - prevAmount) / prevAmount) * 100;
        if (!fastestGrowing || growth > fastestGrowing.growth) {
          fastestGrowing = { name: cat, growth: Math.round(growth) };
        }
      } else if (amount > 0 && !fastestGrowing) {
        fastestGrowing = { name: cat, growth: 100 };
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      categories,
      topCategories,
      monthlyData,
      avgDailySpending,
      biggestExpense,
      fastestGrowing,
    };
  }, [allTransactions, selectedPeriod]);

  return (
    <section className="p-4 sm:p-6 lg:p-8" aria-labelledby="reports-heading">
      <header className="mb-6">
        <h1 id="reports-heading" className="text-2xl font-bold text-neutral-900">
          Reports &amp; Analytics
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Analyze your financial data across different time periods.</p>
      </header>

      {/* Period selector */}
      <nav aria-label="Period selector" className="mb-6 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSelectedPeriod(opt.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedPeriod === opt.key
                ? "bg-primary-500 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-primary-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </nav>

      {/* Summary cards */}
      <section aria-label="Financial summary" className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Total Income</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(reportData.totalIncome)}</p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Total Expenses</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(reportData.totalExpenses)}</p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Net Savings</p>
          <p className={`mt-2 text-2xl font-bold ${reportData.netSavings >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(reportData.netSavings)}
          </p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Savings Rate</p>
          <p className={`mt-2 text-2xl font-bold ${reportData.savingsRate >= 0 ? "text-primary-600" : "text-red-600"}`}>
            {reportData.savingsRate}%
          </p>
        </article>
      </section>

      {/* Income vs Expenses comparison */}
      <section aria-label="Income vs Expenses" className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Income vs Expenses</h2>
        <div className="flex items-end gap-8">
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-neutral-600">Income</span>
              <span className="font-medium text-green-600">{formatCurrency(reportData.totalIncome)}</span>
            </div>
            <div className="h-8 w-full rounded-md bg-neutral-100">
              <div
                className="h-full rounded-md bg-green-500 transition-all"
                style={{
                  width: `${Math.min(100, reportData.totalIncome > 0 && reportData.totalExpenses > 0 ? (reportData.totalIncome / Math.max(reportData.totalIncome, reportData.totalExpenses)) * 100 : reportData.totalIncome > 0 ? 100 : 0)}%`,
                }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-neutral-600">Expenses</span>
              <span className="font-medium text-red-600">{formatCurrency(reportData.totalExpenses)}</span>
            </div>
            <div className="h-8 w-full rounded-md bg-neutral-100">
              <div
                className="h-full rounded-md bg-red-500 transition-all"
                style={{
                  width: `${Math.min(100, reportData.totalIncome > 0 && reportData.totalExpenses > 0 ? (reportData.totalExpenses / Math.max(reportData.totalIncome, reportData.totalExpenses)) * 100 : reportData.totalExpenses > 0 ? 100 : 0)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Expense breakdown by category */}
      <section aria-label="Expense breakdown" className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Expense Breakdown by Category</h2>
        {reportData.categories.length === 0 ? (
          <p className="text-sm text-neutral-500">No expense data for this period.</p>
        ) : (
          <ul className="space-y-3">
            {reportData.categories.map((cat) => (
              <li key={cat.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-700">{cat.name}</span>
                  <span className="text-neutral-600">
                    {formatCurrency(cat.amount)} ({cat.percentage}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${cat.percentage}%`, backgroundColor: getCategoryColor(cat.name) }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Top spending categories */}
      <section aria-label="Top spending categories" className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Top Spending Categories</h2>
        {reportData.topCategories.length === 0 ? (
          <p className="text-sm text-neutral-500">No expenses recorded for this period.</p>
        ) : (
          <ol className="space-y-2">
            {reportData.topCategories.map((cat, idx) => (
              <li key={cat.name} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                  {idx + 1}
                </span>
                <span className="flex-1 font-medium text-neutral-800">{cat.name}</span>
                <span className="font-semibold text-neutral-900">{formatCurrency(cat.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Monthly trend table */}
      {reportData.monthlyData.length > 0 && (
        <section aria-label="Monthly trend" className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Monthly Trend</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="py-2 text-left font-semibold text-neutral-700">Month</th>
                  <th className="py-2 text-right font-semibold text-neutral-700">Income</th>
                  <th className="py-2 text-right font-semibold text-neutral-700">Expenses</th>
                  <th className="py-2 text-right font-semibold text-neutral-700">Net</th>
                </tr>
              </thead>
              <tbody>
                {reportData.monthlyData.map((row) => (
                  <tr key={row.month} className="border-b border-neutral-100">
                    <td className="py-2 text-neutral-800">{row.month}</td>
                    <td className="py-2 text-right text-green-600">{formatCurrency(row.income)}</td>
                    <td className="py-2 text-right text-red-600">{formatCurrency(row.expenses)}</td>
                    <td className={`py-2 text-right font-medium ${row.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Stats section */}
      <section aria-label="Additional statistics" className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Avg Daily Spending</p>
          <p className="mt-2 text-xl font-bold text-neutral-900">{formatCurrency(reportData.avgDailySpending)}</p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Biggest Expense</p>
          {reportData.biggestExpense ? (
            <>
              <p className="mt-2 text-xl font-bold text-neutral-900">{formatCurrency(reportData.biggestExpense.amount)}</p>
              <p className="mt-1 text-sm text-neutral-500">{reportData.biggestExpense.description}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">No expenses</p>
          )}
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Fastest Growing Category</p>
          {reportData.fastestGrowing ? (
            <>
              <p className="mt-2 text-xl font-bold text-neutral-900">{reportData.fastestGrowing.name}</p>
              <p className="mt-1 text-sm text-red-500">+{reportData.fastestGrowing.growth}% vs previous period</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">Not enough data</p>
          )}
        </article>
      </section>
    </section>
  );
}
