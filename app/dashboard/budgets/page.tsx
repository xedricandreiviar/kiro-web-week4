"use client";

import { useState, FormEvent } from "react";
import {
  budgetStorage,
  transactionStorage,
  Budget,
} from "../../lib/storage";
import {
  formatCurrency,
  generateId,
  getMonthDateRange,
  calculatePercentage,
} from "../../lib/utils";

const BUDGET_CATEGORIES = [
  "Food & Dining",
  "Housing",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Utilities",
  "Education",
  "Other",
];

interface BudgetForm {
  category: string;
  limit: string;
  period: "monthly" | "weekly";
}

const emptyForm: BudgetForm = {
  category: "Food & Dining",
  limit: "",
  period: "monthly",
};

function loadBudgets(): Budget[] {
  if (typeof window === "undefined") return [];
  return budgetStorage.getAll();
}

function getSpentByCategory(category: string): number {
  const { start, end } = getMonthDateRange(0);
  const transactions = transactionStorage.getByDateRange(start, end);
  return transactions
    .filter((t) => t.type === "expense" && t.category === category)
    .reduce((sum, t) => sum + t.amount, 0);
}

function getProgressColor(percentage: number): string {
  if (percentage > 90) return "bg-red-500";
  if (percentage >= 75) return "bg-yellow-400";
  return "bg-primary-400";
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>(loadBudgets);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetForm>(emptyForm);
  const [error, setError] = useState("");

  // Calculate spent amounts for all budgets
  const budgetData = budgets.map((budget) => {
    const spent = getSpentByCategory(budget.category);
    const percentage = calculatePercentage(spent, budget.limit);
    const remaining = Math.max(budget.limit - spent, 0);
    return { ...budget, spent, percentage, remaining };
  });

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgetData.reduce((sum, b) => sum + b.spent, 0);
  const overallUtilization = calculatePercentage(totalSpent, totalBudgeted);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(form.limit);
    if (isNaN(limit) || limit <= 0) return;

    if (editingId) {
      const result = budgetStorage.update(editingId, {
        category: form.category,
        limit,
        period: form.period,
      });
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    } else {
      const budget: Budget = {
        id: generateId(),
        category: form.category,
        limit,
        period: form.period,
      };
      const result = budgetStorage.create(budget);
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    }

    setError("");
    setBudgets(budgetStorage.getAll());
    resetForm();
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setForm({
      category: budget.category,
      limit: budget.limit.toString(),
      period: budget.period,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this budget?")) {
      budgetStorage.delete(id);
      setBudgets(budgetStorage.getAll());
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            Budgets
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Set spending limits and track your budget utilization
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:w-auto"
        >
          + Create Budget
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Overview summary */}
      {budgets.length > 0 && (
        <section
          className="grid gap-4 sm:grid-cols-3"
          aria-label="Budget overview"
        >
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Total Budgeted
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {formatCurrency(totalBudgeted)}
            </p>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Total Spent
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {formatCurrency(totalSpent)}
            </p>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Overall Utilization
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                overallUtilization > 90
                  ? "text-red-600"
                  : overallUtilization >= 75
                    ? "text-yellow-600"
                    : "text-green-600"
              }`}
            >
              {overallUtilization}%
            </p>
          </article>
        </section>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <section
          className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm"
          aria-label={editingId ? "Edit budget" : "Create budget"}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingId ? "Edit Budget" : "New Budget"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-neutral-500 hover:text-neutral-700"
              aria-label="Close form"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Category */}
              <div>
                <label
                  htmlFor="budget-category"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Category
                </label>
                <select
                  id="budget-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  {BUDGET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monthly Limit */}
              <div>
                <label
                  htmlFor="budget-limit"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Monthly Limit ($)
                </label>
                <input
                  id="budget-limit"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.limit}
                  onChange={(e) => setForm({ ...form, limit: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="500.00"
                />
              </div>

              {/* Period */}
              <div>
                <label
                  htmlFor="budget-period"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Period
                </label>
                <select
                  id="budget-period"
                  value={form.period}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      period: e.target.value as "monthly" | "weekly",
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                {editingId ? "Update Budget" : "Save Budget"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Budget cards grid */}
      {budgets.length === 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl" aria-hidden="true">
              📊
            </p>
            <h2 className="mt-3 text-lg font-semibold text-neutral-700">
              No budgets set
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Create your first budget to start tracking your spending!
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              + Create Budget
            </button>
          </div>
        </section>
      ) : (
        <section aria-label="Budget cards">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {budgetData.map((budget) => (
              <article
                key={budget.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900">
                      {budget.category}
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500 capitalize">
                      {budget.period}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Warning badges */}
                    {budget.percentage > 100 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Over budget!
                      </span>
                    )}
                    {budget.percentage >= 80 && budget.percentage <= 100 && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                        Warning
                      </span>
                    )}
                  </div>
                </div>

                {/* Spending info */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-neutral-600">
                      <span className="font-semibold text-neutral-900">
                        {formatCurrency(budget.spent)}
                      </span>{" "}
                      / {formatCurrency(budget.limit)}
                    </p>
                    <span
                      className={`text-sm font-semibold ${
                        budget.percentage > 90
                          ? "text-red-600"
                          : budget.percentage >= 75
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {budget.percentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(budget.percentage)}`}
                      style={{
                        width: `${Math.min(budget.percentage, 100)}%`,
                      }}
                    />
                  </div>

                  {/* Remaining */}
                  <p className="mt-2 text-xs text-neutral-500">
                    {budget.percentage > 100
                      ? `Over by ${formatCurrency(budget.spent - budget.limit)}`
                      : `${formatCurrency(budget.remaining)} remaining`}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(budget)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
                    aria-label={`Edit ${budget.category} budget`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(budget.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                    aria-label={`Delete ${budget.category} budget`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
