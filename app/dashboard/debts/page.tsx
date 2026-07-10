"use client";

import { useState, useMemo, FormEvent } from "react";
import { debtStorage, Debt } from "../../lib/storage";
import { formatCurrency, generateId, calculatePercentage } from "../../lib/utils";

interface DebtForm {
  name: string;
  totalAmount: string;
  remainingAmount: string;
  interestRate: string;
  minimumPayment: string;
  dueDate: string;
}

const emptyForm: DebtForm = {
  name: "",
  totalAmount: "",
  remainingAmount: "",
  interestRate: "",
  minimumPayment: "",
  dueDate: "",
};

function loadDebts(): Debt[] {
  if (typeof window === "undefined") return [];
  return debtStorage.getAll();
}

function getEstimatedPayoffMonths(remaining: number, minimumPayment: number): number {
  if (minimumPayment <= 0) return Infinity;
  return Math.ceil(remaining / minimumPayment);
}

function getPayoffDate(months: number): string {
  if (!isFinite(months)) return "N/A";
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Calculate payoff strategy
function calculateStrategy(
  debts: Debt[],
  strategy: "avalanche" | "snowball",
  extraPayment: number = 100
): { totalMonths: number; totalInterest: number } {
  if (debts.length === 0) return { totalMonths: 0, totalInterest: 0 };

  // Clone debts for simulation
  const simDebts = debts.map((d) => ({
    remaining: d.remainingAmount,
    rate: d.interestRate / 100 / 12, // monthly rate
    minimum: d.minimumPayment,
  }));

  // Sort based on strategy
  const sorted =
    strategy === "avalanche"
      ? [...simDebts].sort((a, b) => b.rate - a.rate)
      : [...simDebts].sort((a, b) => a.remaining - b.remaining);

  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600; // Cap at 50 years

  while (sorted.some((d) => d.remaining > 0) && months < maxMonths) {
    months++;
    let extraLeft = extraPayment;

    for (const debt of sorted) {
      if (debt.remaining <= 0) continue;

      // Add monthly interest
      const interest = debt.remaining * debt.rate;
      totalInterest += interest;
      debt.remaining += interest;

      // Pay minimum
      const minPay = Math.min(debt.minimum, debt.remaining);
      debt.remaining -= minPay;
    }

    // Apply extra payment to priority debt
    for (const debt of sorted) {
      if (debt.remaining <= 0 || extraLeft <= 0) continue;
      const payment = Math.min(extraLeft, debt.remaining);
      debt.remaining -= payment;
      extraLeft -= payment;
      break; // Only apply to first non-zero debt in sorted order
    }
  }

  return { totalMonths: months, totalInterest };
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>(loadDebts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DebtForm>(emptyForm);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [error, setError] = useState("");

  // Summary calculations
  const totalDebt = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalMinimumPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const avgInterestRate =
    debts.length > 0
      ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
      : 0;

  // Payoff strategies - memoized to avoid recomputing on form/payment state changes
  const avalanche = useMemo(() => calculateStrategy(debts, "avalanche"), [debts]);
  const snowball = useMemo(() => calculateStrategy(debts, "snowball"), [debts]);

  // Debt-free date projection based on minimum payments only
  const maxPayoffMonths = debts.reduce((max, d) => {
    const months = getEstimatedPayoffMonths(d.remainingAmount, d.minimumPayment);
    return Math.max(max, months);
  }, 0);
  const debtFreeDate = getPayoffDate(maxPayoffMonths);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const totalAmount = parseFloat(form.totalAmount);
    const remainingAmount = parseFloat(form.remainingAmount);
    const interestRate = parseFloat(form.interestRate);
    const minimumPayment = parseFloat(form.minimumPayment);
    const dueDate = parseInt(form.dueDate);

    if (!form.name.trim() || isNaN(totalAmount) || totalAmount <= 0) return;
    if (isNaN(remainingAmount) || remainingAmount < 0) return;
    if (isNaN(interestRate) || interestRate < 0) return;
    if (isNaN(minimumPayment) || minimumPayment < 0) return;
    if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) return;

    if (editingId) {
      const result = debtStorage.update(editingId, {
        name: form.name.trim(),
        totalAmount,
        remainingAmount,
        interestRate,
        minimumPayment,
        dueDate,
      });
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    } else {
      const debt: Debt = {
        id: generateId(),
        name: form.name.trim(),
        totalAmount,
        remainingAmount,
        interestRate,
        minimumPayment,
        dueDate,
      };
      const result = debtStorage.create(debt);
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    }

    setError("");
    setDebts(debtStorage.getAll());
    resetForm();
  };

  const handleMakePayment = (debtId: string) => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return;

    const newRemaining = Math.max(0, debt.remainingAmount - amount);
    const result = debtStorage.update(debtId, { remainingAmount: newRemaining });
    if (!result.success) {
      setError("Failed to save. Storage may be full.");
      return;
    }

    setError("");
    setDebts(debtStorage.getAll());
    setPaymentId(null);
    setPaymentAmount("");
  };

  const handleEdit = (debt: Debt) => {
    setEditingId(debt.id);
    setForm({
      name: debt.name,
      totalAmount: debt.totalAmount.toString(),
      remainingAmount: debt.remainingAmount.toString(),
      interestRate: debt.interestRate.toString(),
      minimumPayment: debt.minimumPayment.toString(),
      dueDate: debt.dueDate.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this debt?")) {
      debtStorage.delete(id);
      setDebts(debtStorage.getAll());
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
            Debt Management
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Track your debts and plan your path to becoming debt-free
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
          + Add Debt
        </button>
      </header>

      {/* Overview summary cards */}
      {debts.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3" aria-label="Debt overview">
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Total Debt
            </p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(totalDebt)}
            </p>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Total Minimum Payments
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {formatCurrency(totalMinimumPayments)}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">per month</p>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Average Interest Rate
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {avgInterestRate.toFixed(1)}%
            </p>
          </article>
        </section>
      )}

      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Add/Edit Debt Form */}
      {showForm && (
        <section
          className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm"
          aria-label={editingId ? "Edit debt" : "Add debt"}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingId ? "Edit Debt" : "Add New Debt"}
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
              <div>
                <label htmlFor="debt-name" className="block text-sm font-medium text-neutral-700">
                  Debt Name
                </label>
                <input
                  id="debt-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Credit Card"
                />
              </div>

              <div>
                <label htmlFor="debt-total" className="block text-sm font-medium text-neutral-700">
                  Original Amount ($)
                </label>
                <input
                  id="debt-total"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="10000.00"
                />
              </div>

              <div>
                <label htmlFor="debt-remaining" className="block text-sm font-medium text-neutral-700">
                  Remaining Amount ($)
                </label>
                <input
                  id="debt-remaining"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.remainingAmount}
                  onChange={(e) => setForm({ ...form, remainingAmount: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="5000.00"
                />
              </div>

              <div>
                <label htmlFor="debt-rate" className="block text-sm font-medium text-neutral-700">
                  Interest Rate (%)
                </label>
                <input
                  id="debt-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="18.5"
                />
              </div>

              <div>
                <label htmlFor="debt-min" className="block text-sm font-medium text-neutral-700">
                  Minimum Payment ($)
                </label>
                <input
                  id="debt-min"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.minimumPayment}
                  onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="200.00"
                />
              </div>

              <div>
                <label htmlFor="debt-due" className="block text-sm font-medium text-neutral-700">
                  Due Date (Day of Month)
                </label>
                <input
                  id="debt-due"
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="15"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                {editingId ? "Update Debt" : "Save Debt"}
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

      {/* Debt content */}
      {debts.length === 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl" aria-hidden="true">
              💳
            </p>
            <h2 className="mt-3 text-lg font-semibold text-neutral-700">
              No debts tracked yet
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Add your debts to track progress and plan your payoff strategy.
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              + Add Debt
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Debt Cards */}
          <section aria-label="Your debts">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Your Debts ({debts.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {debts.map((debt) => {
                const paidOff = debt.totalAmount - debt.remainingAmount;
                const paidPercent = calculatePercentage(paidOff, debt.totalAmount);
                const payoffMonths = getEstimatedPayoffMonths(
                  debt.remainingAmount,
                  debt.minimumPayment
                );
                const payoffDate = getPayoffDate(payoffMonths);

                return (
                  <article
                    key={debt.id}
                    className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-neutral-900">
                        {debt.name}
                      </h3>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {debt.interestRate}% APR
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-neutral-600">
                      <span className="text-lg font-bold text-neutral-900">
                        {formatCurrency(debt.remainingAmount)}
                      </span>{" "}
                      of {formatCurrency(debt.totalAmount)}
                    </p>

                    {/* Progress bar - shows paid portion in green */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>{paidPercent}% paid off</span>
                        <span>{formatCurrency(paidOff)} paid</span>
                      </div>
                      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-neutral-500">
                      <p>
                        Minimum payment:{" "}
                        <span className="font-medium text-neutral-700">
                          {formatCurrency(debt.minimumPayment)}/mo
                        </span>
                      </p>
                      <p>
                        Estimated payoff:{" "}
                        <span className="font-medium text-neutral-700">{payoffDate}</span>
                        {isFinite(payoffMonths) && (
                          <span className="text-neutral-400">
                            {" "}({payoffMonths} months)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Make Payment */}
                    {paymentId === debt.id ? (
                      <div className="mt-4 flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                          placeholder="Amount"
                          aria-label="Payment amount"
                        />
                        <button
                          type="button"
                          onClick={() => handleMakePayment(debt.id)}
                          className="shrink-0 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                        >
                          Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentId(null);
                            setPaymentAmount("");
                          }}
                          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentId(debt.id);
                            setPaymentAmount("");
                          }}
                          className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          Make Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(debt)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                          aria-label={`Edit ${debt.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(debt.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          aria-label={`Delete ${debt.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* Payoff Strategy Comparison */}
          <section aria-label="Payoff strategies">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Payoff Strategies (with extra $100/month)
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Avalanche */}
              <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">🏔️</span>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Avalanche Method
                  </h3>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Pay off highest interest rate first. Saves the most money on interest over time.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Time to pay off:</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {avalanche.totalMonths} months
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Total interest paid:</span>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(avalanche.totalInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Debt-free by:</span>
                    <span className="text-sm font-semibold text-green-600">
                      {getPayoffDate(avalanche.totalMonths)}
                    </span>
                  </div>
                </div>
                {avalanche.totalInterest <= snowball.totalInterest && (
                  <div className="mt-3 rounded-lg bg-green-50 p-2 text-center text-xs font-semibold text-green-700">
                    Recommended - Saves the most on interest
                  </div>
                )}
              </article>

              {/* Snowball */}
              <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">⛄</span>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Snowball Method
                  </h3>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Pay off smallest balance first. Builds momentum with quick wins.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Time to pay off:</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {snowball.totalMonths} months
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Total interest paid:</span>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(snowball.totalInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Debt-free by:</span>
                    <span className="text-sm font-semibold text-green-600">
                      {getPayoffDate(snowball.totalMonths)}
                    </span>
                  </div>
                </div>
                {snowball.totalInterest < avalanche.totalInterest && (
                  <div className="mt-3 rounded-lg bg-green-50 p-2 text-center text-xs font-semibold text-green-700">
                    Recommended - Saves the most on interest
                  </div>
                )}
              </article>
            </div>
          </section>

          {/* Debt-free date projection */}
          <section
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm text-center"
            aria-label="Debt-free projection"
          >
            <p className="text-sm text-neutral-500">
              At minimum payments only, you will be debt-free by:
            </p>
            <p className="mt-1 text-xl font-bold text-primary-600">
              {debtFreeDate}
            </p>
            {isFinite(maxPayoffMonths) && (
              <p className="mt-0.5 text-xs text-neutral-400">
                ({maxPayoffMonths} months from now)
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
