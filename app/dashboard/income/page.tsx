"use client";

import { useState, FormEvent } from "react";
import {
  transactionStorage,
  Transaction,
} from "../../lib/storage";
import {
  formatCurrency,
  formatDate,
  generateId,
  getMonthDateRange,
  calculatePercentage,
} from "../../lib/utils";

const INCOME_TYPES = [
  "Salary",
  "Freelance",
  "Investment",
  "Rental",
  "Side Hustle",
  "Gift",
  "Other",
];

interface IncomeForm {
  description: string;
  amount: string;
  category: string;
  frequency: "one-time" | "recurring";
  date: string;
}

const emptyForm: IncomeForm = {
  description: "",
  amount: "",
  category: "Salary",
  frequency: "one-time",
  date: new Date().toISOString().split("T")[0],
};

function loadIncomeTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  return transactionStorage
    .getByType("income")
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default function IncomePage() {
  const [incomeList, setIncomeList] = useState<Transaction[]>(loadIncomeTransactions);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IncomeForm>(emptyForm);
  const [error, setError] = useState("");

  // Current month income
  const currentMonthRange = getMonthDateRange(0);
  const lastMonthRange = getMonthDateRange(-1);

  const currentMonthIncome = incomeList
    .filter((t) => t.date >= currentMonthRange.start && t.date <= currentMonthRange.end)
    .reduce((sum, t) => sum + t.amount, 0);

  const lastMonthIncome = incomeList
    .filter((t) => t.date >= lastMonthRange.start && t.date <= lastMonthRange.end)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthChange = lastMonthIncome > 0
    ? Math.round(((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100)
    : currentMonthIncome > 0
      ? 100
      : 0;

  // Income sources count (unique categories this month)
  const currentMonthEntries = incomeList.filter(
    (t) => t.date >= currentMonthRange.start && t.date <= currentMonthRange.end
  );
  const uniqueSources = new Set(currentMonthEntries.map((t) => t.category)).size;

  // Income by source breakdown
  const sourceBreakdown = INCOME_TYPES.map((type) => {
    const total = currentMonthEntries
      .filter((t) => t.category === type)
      .reduce((sum, t) => sum + t.amount, 0);
    return { type, total };
  }).filter((s) => s.total > 0);

  const maxSourceAmount = Math.max(...sourceBreakdown.map((s) => s.total), 1);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0 || !form.description.trim()) return;

    const transactionData: Transaction = {
      id: editingId || generateId(),
      type: "income",
      description: form.description.trim(),
      amount,
      category: form.category,
      date: form.date,
      isRecurring: form.frequency === "recurring",
      recurringFrequency: form.frequency === "recurring" ? "monthly" : undefined,
    };

    if (editingId) {
      const result = transactionStorage.update(editingId, transactionData);
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    } else {
      const result = transactionStorage.create(transactionData);
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    }

    setError("");
    setIncomeList(loadIncomeTransactions());
    resetForm();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setForm({
      description: transaction.description,
      amount: transaction.amount.toString(),
      category: transaction.category,
      frequency: transaction.isRecurring ? "recurring" : "one-time",
      date: transaction.date,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this income entry?")) {
      transactionStorage.delete(id);
      setIncomeList(loadIncomeTransactions());
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
            Income
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Track your income sources and earnings
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
          + Add Income
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Income summary">
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Total Income This Month
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {formatCurrency(currentMonthIncome)}
          </p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            vs Last Month
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-2xl font-bold ${
                monthChange >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {monthChange >= 0 ? "+" : ""}
              {monthChange}%
            </span>
            <span aria-hidden="true" className="text-lg">
              {monthChange >= 0 ? "\u2191" : "\u2193"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            Last month: {formatCurrency(lastMonthIncome)}
          </p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Income Sources
          </p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {uniqueSources}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Active this month
          </p>
        </article>
      </section>

      {/* Add/Edit Form */}
      {showForm && (
        <section
          className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm"
          aria-label={editingId ? "Edit income" : "Add income"}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingId ? "Edit Income" : "New Income"}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Source/Description */}
              <div>
                <label
                  htmlFor="income-description"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Source / Description
                </label>
                <input
                  id="income-description"
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Monthly salary"
                />
              </div>

              {/* Amount */}
              <div>
                <label
                  htmlFor="income-amount"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Amount ($)
                </label>
                <input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="0.00"
                />
              </div>

              {/* Type */}
              <div>
                <label
                  htmlFor="income-type"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Type
                </label>
                <select
                  id="income-type"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  {INCOME_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label
                  htmlFor="income-frequency"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Frequency
                </label>
                <select
                  id="income-frequency"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      frequency: e.target.value as "one-time" | "recurring",
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="one-time">One-time</option>
                  <option value="recurring">Recurring</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="income-date"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Date
                </label>
                <input
                  id="income-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                {editingId ? "Update Income" : "Save Income"}
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

      {/* Income by source breakdown */}
      {sourceBreakdown.length > 0 && (
        <section
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          aria-label="Income by source"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Income by Source (This Month)
          </h2>
          <div className="mt-4 space-y-3">
            {sourceBreakdown.map((source) => (
              <div key={source.type}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-700">
                    {source.type}
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {formatCurrency(source.total)} (
                    {calculatePercentage(source.total, currentMonthIncome)}%)
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all"
                    style={{
                      width: `${(source.total / maxSourceAmount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Income list */}
      <section
        className="rounded-xl border border-neutral-200 bg-white shadow-sm"
        aria-label="Income entries"
      >
        {incomeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl" aria-hidden="true">
              💰
            </p>
            <h2 className="mt-3 text-lg font-semibold text-neutral-700">
              No income recorded
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Add your first income entry to start tracking your earnings.
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              + Add Income
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {incomeList.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {entry.description}
                    </p>
                    {/* Type badge */}
                    <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {entry.category}
                    </span>
                    {/* Recurring indicator */}
                    {entry.isRecurring && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        Recurring
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {formatDate(entry.date)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-sm font-semibold text-green-600">
                    +{formatCurrency(entry.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(entry)}
                      className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                      aria-label={`Edit ${entry.description}`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${entry.description}`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
