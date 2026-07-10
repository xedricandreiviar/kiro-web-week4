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
  getCategoryColor,
  getMonthDateRange,
} from "../../lib/utils";

const CATEGORIES = [
  "Food & Dining",
  "Housing",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Utilities",
  "Education",
  "Salary",
  "Freelance",
  "Investment",
  "Other",
];

type DateRangeFilter = "this_month" | "last_month" | "last_3_months" | "all";
type TypeFilter = "all" | "expense" | "income";

interface TransactionForm {
  type: "expense" | "income";
  description: string;
  amount: string;
  category: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  notes: string;
}

const emptyForm: TransactionForm = {
  type: "expense",
  description: "",
  amount: "",
  category: "Food & Dining",
  date: new Date().toISOString().split("T")[0],
  isRecurring: false,
  recurringFrequency: "monthly",
  notes: "",
};

function loadTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  return transactionStorage.getAll();
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("this_month");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [error, setError] = useState("");

  // Apply filters
  const filteredTransactions = transactions
    .filter((t) => {
      // Search filter
      if (
        searchQuery &&
        !t.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Category filter
      if (categoryFilter && t.category !== categoryFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all" && t.type !== typeFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== "all") {
        let range: { start: string; end: string };
        if (dateRange === "this_month") {
          range = getMonthDateRange(0);
        } else if (dateRange === "last_month") {
          range = getMonthDateRange(-1);
        } else {
          // last 3 months
          const end = getMonthDateRange(0).end;
          const start = getMonthDateRange(-2).start;
          range = { start, end };
        }
        if (t.date < range.start || t.date > range.end) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0 || !form.description.trim()) return;

    const transactionData: Transaction = {
      id: editingId || generateId(),
      type: form.type,
      description: form.description.trim(),
      amount,
      category: form.category,
      date: form.date,
      isRecurring: form.isRecurring,
      recurringFrequency: form.isRecurring ? form.recurringFrequency : undefined,
      notes: form.notes.trim() || undefined,
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
    setTransactions(transactionStorage.getAll());
    resetForm();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setForm({
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount.toString(),
      category: transaction.category,
      date: transaction.date,
      isRecurring: transaction.isRecurring,
      recurringFrequency: transaction.recurringFrequency || "monthly",
      notes: transaction.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      transactionStorage.delete(id);
      setTransactions(transactionStorage.getAll());
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
            Transactions
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your income and expenses
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
          + Add Transaction
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <section
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          aria-label={editingId ? "Edit transaction" : "Add transaction"}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingId ? "Edit Transaction" : "New Transaction"}
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
            {/* Type toggle */}
            <fieldset className="mb-4">
              <legend className="mb-2 block text-sm font-medium text-neutral-700">
                Type
              </legend>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "expense" })}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    form.type === "expense"
                      ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "income" })}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    form.type === "income"
                      ? "bg-green-100 text-green-700 ring-2 ring-green-300"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  Income
                </button>
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Description */}
              <div>
                <label
                  htmlFor="txn-description"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Description
                </label>
                <input
                  id="txn-description"
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Grocery shopping"
                />
              </div>

              {/* Amount */}
              <div>
                <label
                  htmlFor="txn-amount"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Amount (PHP)
                </label>
                <input
                  id="txn-amount"
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

              {/* Category */}
              <div>
                <label
                  htmlFor="txn-category"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Category
                </label>
                <select
                  id="txn-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="txn-date"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Date
                </label>
                <input
                  id="txn-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Recurring toggle */}
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2">
                  <input
                    id="txn-recurring"
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={(e) =>
                      setForm({ ...form, isRecurring: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="txn-recurring"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Recurring
                  </label>
                </div>
              </div>

              {/* Recurring frequency */}
              {form.isRecurring && (
                <div>
                  <label
                    htmlFor="txn-frequency"
                    className="block text-sm font-medium text-neutral-700"
                  >
                    Frequency
                  </label>
                  <select
                    id="txn-frequency"
                    value={form.recurringFrequency}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        recurringFrequency: e.target.value as TransactionForm["recurringFrequency"],
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label
                htmlFor="txn-notes"
                className="block text-sm font-medium text-neutral-700"
              >
                Notes (optional)
              </label>
              <textarea
                id="txn-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Additional details..."
              />
            </div>

            {/* Submit */}
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                {editingId ? "Update Transaction" : "Save Transaction"}
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

      {/* Filter bar */}
      <section
        className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        aria-label="Transaction filters"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label htmlFor="filter-search" className="sr-only">
              Search transactions
            </label>
            <input
              id="filter-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by description..."
              className="block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Category filter */}
          <div>
            <label htmlFor="filter-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div>
            <label htmlFor="filter-type" className="sr-only">
              Filter by type
            </label>
            <select
              id="filter-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </div>

          {/* Date range */}
          <div>
            <label htmlFor="filter-date" className="sr-only">
              Date range
            </label>
            <select
              id="filter-date"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
              className="block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </section>

      {/* Transaction list */}
      <section
        className="rounded-xl border border-neutral-200 bg-white shadow-sm"
        aria-label="Transaction list"
      >
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl" aria-hidden="true">
              💸
            </p>
            <h2 className="mt-3 text-lg font-semibold text-neutral-700">
              No transactions yet
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Add your first transaction to start tracking your finances.
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              + Add Transaction
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filteredTransactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {transaction.description}
                    </p>
                    {/* Category badge */}
                    <span
                      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{
                        backgroundColor: getCategoryColor(transaction.category),
                      }}
                    >
                      {transaction.category}
                    </span>
                    {/* Recurring badge */}
                    {transaction.isRecurring && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        Recurring
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {formatDate(transaction.date)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Amount */}
                  <span
                    className={`whitespace-nowrap text-sm font-semibold ${
                      transaction.type === "expense"
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {transaction.type === "expense" ? "-" : "+"}
                    {formatCurrency(transaction.amount)}
                  </span>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(transaction)}
                      className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                      aria-label={`Edit ${transaction.description}`}
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
                      onClick={() => handleDelete(transaction.id)}
                      className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${transaction.description}`}
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

      {/* Summary footer */}
      {filteredTransactions.length > 0 && (
        <footer className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <p className="text-neutral-600">
              Showing{" "}
              <span className="font-medium text-neutral-900">
                {filteredTransactions.length}
              </span>{" "}
              transaction{filteredTransactions.length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-4">
              <p className="text-green-600">
                Income:{" "}
                <span className="font-semibold">
                  {formatCurrency(
                    filteredTransactions
                      .filter((t) => t.type === "income")
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </span>
              </p>
              <p className="text-red-600">
                Expenses:{" "}
                <span className="font-semibold">
                  {formatCurrency(
                    filteredTransactions
                      .filter((t) => t.type === "expense")
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </span>
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
