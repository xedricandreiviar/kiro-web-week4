"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import AppTour from "./components/AppTour";
import {
  transactionStorage,
  budgetStorage,
  savingsGoalStorage,
  billStorage,
  Transaction,
  Budget,
  SavingsGoal,
  Bill,
} from "../lib/storage";
import {
  formatCurrency,
  formatDateShort,
  calculatePercentage,
  getMonthDateRange,
  getCategoryColor,
} from "../lib/utils";
import { seedDataIfEmpty } from "../lib/seed";

function initializeDashboardData(
  categories: string[],
  incomeRange: string,
  monthlySavingsTarget: string
): {
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  bills: Bill[];
} {
  if (typeof window === "undefined") {
    return { transactions: [], budgets: [], savingsGoals: [], bills: [] };
  }
  // Seed data if first load with empty storage
  seedDataIfEmpty(categories, incomeRange, monthlySavingsTarget);
  return {
    transactions: transactionStorage.getAll(),
    budgets: budgetStorage.getAll(),
    savingsGoals: savingsGoalStorage.getAll(),
    bills: billStorage.getAll(),
  };
}

export default function DashboardPage() {
  const { user } = useAuth();

  const onboarding = user?.onboarding;
  const categories = onboarding?.spendingCategories || [];
  const incomeRange = onboarding?.incomeRange || "";
  const monthlySavingsTarget = onboarding?.monthlySavingsTarget || "";

  const [data] = useState(() =>
    initializeDashboardData(categories, incomeRange, monthlySavingsTarget)
  );

  const transactions = data.transactions;
  const budgets = data.budgets;
  const savingsGoals = data.savingsGoals;
  const bills = data.bills;

  // Current month date range
  const { start: monthStart, end: monthEnd } = getMonthDateRange(0);

  // Monthly transactions
  const monthlyTransactions = transactions.filter(
    (t) => t.date >= monthStart && t.date <= monthEnd
  );

  // Calculate totals
  const totalIncome = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? calculatePercentage(netBalance, totalIncome) : 0;

  // Budget status
  const budgetStatus = budgets.map((budget) => {
    const spent = monthlyTransactions
      .filter((t) => t.type === "expense" && t.category === budget.category)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...budget, spent, isOver: spent > budget.limit };
  });
  const budgetsOnTrack = budgetStatus.filter((b) => !b.isOver).length;
  const budgetsOver = budgetStatus.filter((b) => b.isOver).length;

  // Upcoming bills (next 7 days)
  const today = new Date();
  const upcomingBills = bills.filter((bill) => {
    if (bill.isPaid) return false;
    const dueDay = bill.dueDate;
    const currentDay = today.getDate();
    // Simple check: due within next 7 days this month
    return dueDay >= currentDay && dueDay <= currentDay + 7;
  });

  // Savings progress
  const totalSavingsTarget = savingsGoals.reduce(
    (sum, g) => sum + g.targetAmount,
    0
  );
  const totalSavingsCurrent = savingsGoals.reduce(
    (sum, g) => sum + g.currentAmount,
    0
  );
  const savingsProgress =
    totalSavingsTarget > 0
      ? calculatePercentage(totalSavingsCurrent, totalSavingsTarget)
      : 0;

  // Recent transactions (last 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Spending by category
  const spendingByCategory = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  const maxCategorySpending = Math.max(
    ...Object.values(spendingByCategory),
    1
  );

  // Goal label
  const goalLabel = (() => {
    const map: Record<string, string> = {
      saving: "Build savings",
      debt_payoff: "Pay off debt",
      investing: "Start investing",
      budgeting: "Better budgeting",
    };
    return map[onboarding?.financialGoal || ""] || "Financial wellness";
  })();

  if (typeof window === "undefined") {
    return null;
  }

  return (
    <>
      <AppTour />
      <div className="space-y-6 p-4 sm:p-6" id="tour-welcome">
        {/* Personalized greeting */}
        <header>
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            Welcome back, {user?.name || "User"}!
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Your goal: {goalLabel} | Income: {incomeRange || "Not set"}
          </p>
        </header>

        {/* Summary cards row */}
        <section
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Financial summary"
          id="tour-budget-overview"
        >
          {/* Total Income */}
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Income This Month
            </h2>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </p>
          </article>

          {/* Total Expenses */}
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Expenses This Month
            </h2>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </p>
          </article>

          {/* Net Balance */}
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Net Balance
            </h2>
            <p
              className={`mt-2 text-2xl font-bold ${
                netBalance >= 0 ? "text-primary-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netBalance)}
            </p>
          </article>

          {/* Savings Rate */}
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Savings Rate
            </h2>
            <p className="mt-2 text-2xl font-bold text-primary-600">
              {savingsRate}%
            </p>
            <p className="mt-1 text-xs text-neutral-400">of monthly income</p>
          </article>
        </section>

        {/* Middle row: Budget status, Upcoming bills, Savings progress */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Budget Status */}
          <section
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            aria-label="Budget status"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Budget Status
            </h2>
            {budgets.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">
                No budgets set yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm text-neutral-700">
                      {budgetsOnTrack} on track
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm text-neutral-700">
                      {budgetsOver} over budget
                    </span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {budgetStatus.slice(0, 3).map((b) => (
                    <li key={b.id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-neutral-700">
                          {b.category}
                        </span>
                        <span className="text-neutral-500">
                          {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            b.isOver ? "bg-red-500" : "bg-primary-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              calculatePercentage(b.spent, b.limit),
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Upcoming Bills */}
          <section
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            aria-label="Upcoming bills"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Upcoming Bills (7 Days)
            </h2>
            {upcomingBills.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">
                No bills due in the next 7 days.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcomingBills.map((bill) => (
                  <li
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-800">
                        {bill.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Due: {bill.dueDate}th
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">
                      {formatCurrency(bill.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Savings Progress */}
          <section
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            aria-label="Savings progress"
            id="tour-savings-goal"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Savings Progress
            </h2>
            {savingsGoals.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">
                No savings goals yet.
              </p>
            ) : (
              <div className="mt-3">
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-primary-600">
                    {savingsProgress}%
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatCurrency(totalSavingsCurrent)} /{" "}
                    {formatCurrency(totalSavingsTarget)}
                  </span>
                </div>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-primary-400 transition-all"
                    style={{ width: `${savingsProgress}%` }}
                  />
                </div>
                <ul className="mt-3 space-y-1.5">
                  {savingsGoals.map((goal) => (
                    <li
                      key={goal.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-neutral-700">{goal.name}</span>
                      <span className="text-neutral-500">
                        {calculatePercentage(
                          goal.currentAmount,
                          goal.targetAmount
                        )}
                        %
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Recent Transactions */}
        <section
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          aria-label="Recent transactions"
          id="tour-expense-tracker"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Recent Transactions
            </h2>
            <Link
              href="/dashboard/transactions"
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              View All
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-400">
              No transactions recorded yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-100">
              {recentTransactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {t.description}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {t.category} &middot; {formatDateShort(t.date)}
                    </p>
                  </div>
                  <span
                    className={`ml-3 whitespace-nowrap text-sm font-semibold ${
                      t.type === "expense" ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {t.type === "expense" ? "-" : "+"}
                    {formatCurrency(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Spending by Category */}
        <section
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          aria-label="Spending by category"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Spending by Category
          </h2>
          {Object.keys(spendingByCategory).length === 0 ? (
            <p className="mt-4 text-sm text-neutral-400">
              No spending data this month.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {Object.entries(spendingByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-neutral-700">
                        {category}
                      </span>
                      <span className="text-neutral-500">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(amount / maxCategorySpending) * 100}%`,
                          backgroundColor: getCategoryColor(category),
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          aria-label="Quick actions"
          id="tour-quick-actions"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Quick Actions
          </h2>
          <nav className="mt-3 grid gap-2 sm:grid-cols-3" aria-label="Quick action links">
            <Link
              href="/dashboard/transactions"
              className="rounded-lg bg-primary-50 px-4 py-2.5 text-center text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
            >
              + Add Expense
            </Link>
            <Link
              href="/dashboard/budgets"
              className="rounded-lg bg-neutral-50 px-4 py-2.5 text-center text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              Set Budget
            </Link>
            <Link
              href="/dashboard/reports"
              className="rounded-lg bg-neutral-50 px-4 py-2.5 text-center text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              View Reports
            </Link>
          </nav>
        </section>
      </div>
    </>
  );
}
