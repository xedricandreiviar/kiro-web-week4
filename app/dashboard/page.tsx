"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import AppTour from "./components/AppTour";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

const EXPENSES_KEY = "budgetwise_expenses";

function getMonthlyBudget(incomeRange: string): number {
  const map: Record<string, number> = {
    "Under $2,000": 1500,
    "$2,000 - $4,000": 3000,
    "$4,000 - $6,000": 4500,
    "$6,000 - $8,000": 6000,
    "$8,000 - $10,000": 8000,
    "Over $10,000": 10000,
  };
  return map[incomeRange] || 3000;
}

function getSavingsTarget(target: string): number {
  const map: Record<string, number> = {
    "$100 - $300": 200,
    "$300 - $500": 400,
    "$500 - $1,000": 750,
    "$1,000 - $2,000": 1500,
    "Over $2,000": 2500,
  };
  return map[target] || 400;
}

function generateMockExpenses(categories: string[]): Expense[] {
  const mockData: { description: string; category: string; amount: number }[] = [
    { description: "Grocery shopping", category: "Food & Dining", amount: 85.5 },
    { description: "Electric bill", category: "Utilities", amount: 120.0 },
    { description: "Gas station", category: "Transportation", amount: 45.0 },
    { description: "Streaming subscription", category: "Entertainment", amount: 15.99 },
    { description: "Rent payment", category: "Housing", amount: 1200.0 },
    { description: "Restaurant dinner", category: "Food & Dining", amount: 52.3 },
    { description: "Online course", category: "Education", amount: 29.99 },
    { description: "New shoes", category: "Shopping", amount: 89.0 },
    { description: "Doctor visit copay", category: "Healthcare", amount: 30.0 },
    { description: "Bus pass", category: "Transportation", amount: 65.0 },
  ];

  const relevant = mockData.filter(
    (item) => categories.length === 0 || categories.includes(item.category)
  );

  const selected = relevant.length > 0 ? relevant.slice(0, 6) : mockData.slice(0, 6);

  return selected.map((item, i) => ({
    id: `mock-${i}`,
    description: item.description,
    amount: item.amount,
    category: item.category,
    date: new Date(Date.now() - i * 86400000 * 2).toISOString().split("T")[0],
  }));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const onboarding = user?.onboarding;
  const monthlyBudget = getMonthlyBudget(onboarding?.incomeRange || "");
  const savingsTarget = getSavingsTarget(onboarding?.monthlySavingsTarget || "");
  const categories = onboarding?.spendingCategories || [];

  useEffect(() => {
    const stored = localStorage.getItem(EXPENSES_KEY);
    if (stored) {
      try {
        setExpenses(JSON.parse(stored));
      } catch {
        const mock = generateMockExpenses(categories);
        setExpenses(mock);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(mock));
      }
    } else {
      const mock = generateMockExpenses(categories);
      setExpenses(mock);
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(mock));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPercentage = Math.min((totalSpending / monthlyBudget) * 100, 100);
  const currentSavings = Math.max(monthlyBudget - totalSpending, 0);
  const savingsPercentage = Math.min((currentSavings / savingsTarget) * 100, 100);

  const spendingByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const maxCategorySpending = Math.max(...Object.values(spendingByCategory), 1);

  const handleAddExpense = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;
    const expense: Expense = {
      id: `exp-${Date.now()}`,
      description: newDescription,
      amount,
      category: newCategory || "Other",
      date: new Date().toISOString().split("T")[0],
    };
    const updated = [expense, ...expenses];
    setExpenses(updated);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
    setNewDescription("");
    setNewAmount("");
    setNewCategory("");
    setShowAddForm(false);
  };

  const goalLabel = (() => {
    const map: Record<string, string> = {
      saving: "Build savings",
      debt_payoff: "Pay off debt",
      investing: "Start investing",
      budgeting: "Better budgeting",
    };
    return map[onboarding?.financialGoal || ""] || "Financial wellness";
  })();

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
            Your goal: {goalLabel} | Income: {onboarding?.incomeRange || "Not set"}
          </p>
        </header>

        {/* Dashboard grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Budget Overview */}
          <section
            id="tour-budget-overview"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            aria-label="Budget overview"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Budget Overview
            </h2>
            <div className="mt-3">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-neutral-900">
                  ${totalSpending.toFixed(0)}
                </span>
                <span className="text-sm text-neutral-500">
                  of ${monthlyBudget.toLocaleString()}
                </span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetPercentage > 80 ? "bg-red-500" : "bg-primary-500"
                  }`}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                {budgetPercentage.toFixed(0)}% of monthly budget used
              </p>
            </div>
          </section>

          {/* Savings Goal */}
          <section
            id="tour-savings-goal"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            aria-label="Savings goal"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Savings Goal
            </h2>
            <div className="mt-3">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-primary-600">
                  ${currentSavings.toFixed(0)}
                </span>
                <span className="text-sm text-neutral-500">
                  of ${savingsTarget.toLocaleString()}
                </span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-primary-400 transition-all"
                  style={{ width: `${savingsPercentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                {savingsPercentage.toFixed(0)}% of monthly target reached
              </p>
            </div>
          </section>

          {/* Quick Actions */}
          <section
            id="tour-quick-actions"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            aria-label="Quick actions"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Quick Actions
            </h2>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full rounded-lg bg-primary-50 px-4 py-2.5 text-left text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
              >
                + Add Expense
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-neutral-50 px-4 py-2.5 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
              >
                Set Budget
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-neutral-50 px-4 py-2.5 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
              >
                View Reports
              </button>
            </div>
          </section>
        </div>

        {/* Expense Tracker */}
        <section
          id="tour-expense-tracker"
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          aria-label="Expense tracker"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Recent Expenses
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600"
            >
              {showAddForm ? "Cancel" : "+ Add"}
            </button>
          </div>

          {/* Add expense form */}
          {showAddForm && (
            <form onSubmit={handleAddExpense} className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="exp-desc" className="block text-xs font-medium text-neutral-600">
                    Description
                  </label>
                  <input
                    id="exp-desc"
                    type="text"
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
                    placeholder="Coffee shop"
                  />
                </div>
                <div>
                  <label htmlFor="exp-amount" className="block text-xs font-medium text-neutral-600">
                    Amount ($)
                  </label>
                  <input
                    id="exp-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
                    placeholder="5.00"
                  />
                </div>
                <div>
                  <label htmlFor="exp-cat" className="block text-xs font-medium text-neutral-600">
                    Category
                  </label>
                  <input
                    id="exp-cat"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
                    placeholder="Food & Dining"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-3 rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
              >
                Save Expense
              </button>
            </form>
          )}

          {/* Expenses list */}
          <ul className="mt-4 divide-y divide-neutral-100">
            {expenses.slice(0, 8).map((expense) => (
              <li key={expense.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{expense.description}</p>
                  <p className="text-xs text-neutral-400">
                    {expense.category} &middot; {expense.date}
                  </p>
                </div>
                <span className="text-sm font-semibold text-neutral-900">
                  -${expense.amount.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Spending by Category */}
        <section
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          aria-label="Spending by category"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Spending by Category
          </h2>
          <div className="mt-4 space-y-3">
            {Object.entries(spendingByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-700">{category}</span>
                    <span className="text-neutral-500">${amount.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-primary-400"
                      style={{ width: `${(amount / maxCategorySpending) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}
