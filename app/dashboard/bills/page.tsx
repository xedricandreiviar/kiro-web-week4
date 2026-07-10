"use client";

import { useState, FormEvent } from "react";
import { billStorage, Bill } from "../../lib/storage";
import { formatCurrency, generateId } from "../../lib/utils";

interface BillForm {
  name: string;
  amount: string;
  dueDate: string;
  frequency: "monthly" | "quarterly" | "yearly";
  category: string;
  autoPay: boolean;
}

const emptyForm: BillForm = {
  name: "",
  amount: "",
  dueDate: "",
  frequency: "monthly",
  category: "",
  autoPay: false,
};

function loadBills(): Bill[] {
  if (typeof window === "undefined") return [];
  return billStorage.getAll();
}

function getNextDueDate(dayOfMonth: number, frequency: "monthly" | "quarterly" | "yearly"): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let nextDate: Date;

  if (currentDay <= dayOfMonth) {
    // Due date is still upcoming this month or today
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const adjustedDay = Math.min(dayOfMonth, lastDayOfMonth);
    nextDate = new Date(currentYear, currentMonth, adjustedDay);
  } else {
    // Due date already passed this month, get next occurrence based on frequency
    let monthOffset = 1;
    if (frequency === "quarterly") monthOffset = 3;
    if (frequency === "yearly") monthOffset = 12;

    const nextMonth = currentMonth + monthOffset;
    const lastDayOfNextMonth = new Date(currentYear, nextMonth + 1, 0).getDate();
    const adjustedDay = Math.min(dayOfMonth, lastDayOfNextMonth);
    nextDate = new Date(currentYear, nextMonth, adjustedDay);
  }

  return nextDate;
}

function getDaysUntilDue(nextDueDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = nextDueDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function isOverdue(bill: Bill): boolean {
  if (bill.isPaid) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // If lastPaidDate exists, check if the bill was paid this billing cycle.
  // A bill is overdue if it hasn't been paid since its last due date.
  if (bill.lastPaidDate) {
    const lastPaid = new Date(bill.lastPaidDate);
    lastPaid.setHours(0, 0, 0, 0);

    // Determine the most recent due date (could be this month or last month)
    let mostRecentDueDate: Date;
    const dueThisMonth = new Date(currentYear, currentMonth, Math.min(bill.dueDate, new Date(currentYear, currentMonth + 1, 0).getDate()));

    if (dueThisMonth <= today) {
      // Due date already passed this month
      mostRecentDueDate = dueThisMonth;
    } else {
      // Due date is still ahead this month, so the most recent past due was last month
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const daysInLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate();
      mostRecentDueDate = new Date(lastMonthYear, lastMonth, Math.min(bill.dueDate, daysInLastMonth));
    }

    // Overdue if the last payment was before the most recent due date
    return lastPaid < mostRecentDueDate;
  }

  // No lastPaidDate recorded: fall back to simple day-of-month check
  return currentDay > bill.dueDate;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>(loadBills);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BillForm>(emptyForm);

  // Summary calculations
  const totalDue = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = bills.filter((b) => b.isPaid).reduce((sum, b) => sum + b.amount, 0);
  const totalRemaining = totalDue - totalPaid;

  // Sort bills by upcoming due date
  const upcomingBills = [...bills]
    .map((bill) => {
      const nextDue = getNextDueDate(bill.dueDate, bill.frequency);
      const daysUntil = getDaysUntilDue(nextDue);
      const overdue = isOverdue(bill);
      return { ...bill, nextDue, daysUntil, overdue };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Calendar data
  const now = new Date();
  const calendarYear = now.getFullYear();
  const calendarMonth = now.getMonth();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const billDays = new Set(bills.map((b) => b.dueDate).filter((d) => d <= daysInMonth));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    const dueDate = parseInt(form.dueDate);
    if (isNaN(amount) || amount <= 0 || !form.name.trim()) return;
    if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) return;

    if (editingId) {
      billStorage.update(editingId, {
        name: form.name.trim(),
        amount,
        dueDate,
        frequency: form.frequency,
        category: form.category.trim(),
        autoPay: form.autoPay,
      });
    } else {
      const bill: Bill = {
        id: generateId(),
        name: form.name.trim(),
        amount,
        dueDate,
        frequency: form.frequency,
        category: form.category.trim(),
        isPaid: false,
        autoPay: form.autoPay,
      };
      billStorage.create(bill);
    }

    setBills(billStorage.getAll());
    resetForm();
  };

  const handleMarkPaid = (id: string) => {
    billStorage.update(id, {
      isPaid: true,
      lastPaidDate: new Date().toISOString().split("T")[0],
    });
    setBills(billStorage.getAll());
  };

  const handleMarkUnpaid = (id: string) => {
    billStorage.update(id, { isPaid: false });
    setBills(billStorage.getAll());
  };

  const handleEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setForm({
      name: bill.name,
      amount: bill.amount.toString(),
      dueDate: bill.dueDate.toString(),
      frequency: bill.frequency,
      category: bill.category,
      autoPay: bill.autoPay,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this bill?")) {
      billStorage.delete(id);
      setBills(billStorage.getAll());
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            Bills &amp; Recurring
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Track and manage your recurring bills and payments
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
          + Add Bill
        </button>
      </header>

      {/* Monthly summary cards */}
      {bills.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3" aria-label="Monthly summary">
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Total Due This Month
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {formatCurrency(totalDue)}
            </p>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Total Paid
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </p>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Remaining
            </p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(totalRemaining)}
            </p>
          </article>
        </section>
      )}

      {/* Add/Edit Bill Form */}
      {showForm && (
        <section
          className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm"
          aria-label={editingId ? "Edit bill" : "Add bill"}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingId ? "Edit Bill" : "Add New Bill"}
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
                <label htmlFor="bill-name" className="block text-sm font-medium text-neutral-700">
                  Bill Name
                </label>
                <input
                  id="bill-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Netflix"
                />
              </div>

              <div>
                <label htmlFor="bill-amount" className="block text-sm font-medium text-neutral-700">
                  Amount ($)
                </label>
                <input
                  id="bill-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="15.99"
                />
              </div>

              <div>
                <label htmlFor="bill-due" className="block text-sm font-medium text-neutral-700">
                  Due Date (Day of Month)
                </label>
                <input
                  id="bill-due"
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

              <div>
                <label htmlFor="bill-frequency" className="block text-sm font-medium text-neutral-700">
                  Frequency
                </label>
                <select
                  id="bill-frequency"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({ ...form, frequency: e.target.value as BillForm["frequency"] })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label htmlFor="bill-category" className="block text-sm font-medium text-neutral-700">
                  Category
                </label>
                <input
                  id="bill-category"
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Streaming"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={form.autoPay}
                    onChange={(e) => setForm({ ...form, autoPay: e.target.checked })}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  Auto-Pay Enabled
                </label>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                {editingId ? "Update Bill" : "Save Bill"}
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

      {/* Bills content */}
      {bills.length === 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl" aria-hidden="true">
              📋
            </p>
            <h2 className="mt-3 text-lg font-semibold text-neutral-700">
              No bills tracked yet
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Add your recurring bills and never miss a payment again!
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              + Add Bill
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Upcoming Bills */}
          <section aria-label="Upcoming bills">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Upcoming Bills
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingBills.map((bill) => (
                <article
                  key={bill.id}
                  className={`rounded-xl border bg-white p-5 shadow-sm ${
                    bill.overdue
                      ? "border-red-300 ring-1 ring-red-200"
                      : "border-neutral-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900">
                        {bill.name}
                      </h3>
                      {bill.category && (
                        <span className="mt-0.5 inline-block text-xs text-neutral-500">
                          {bill.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {bill.autoPay && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Auto
                        </span>
                      )}
                      {bill.overdue && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Overdue
                        </span>
                      )}
                      {bill.isPaid && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Paid
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xl font-bold text-neutral-900">
                    {formatCurrency(bill.amount)}
                  </p>

                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-neutral-500">
                      Due: Day {bill.dueDate} ({bill.frequency})
                    </p>
                    <p className="text-xs text-neutral-500">
                      Next due:{" "}
                      <span className="font-medium text-neutral-700">
                        {bill.nextDue.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {" "}
                      ({bill.daysUntil === 0
                        ? "Today"
                        : bill.daysUntil > 0
                        ? `${bill.daysUntil} days`
                        : `${Math.abs(bill.daysUntil)} days ago`})
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                    {bill.isPaid ? (
                      <button
                        type="button"
                        onClick={() => handleMarkUnpaid(bill.id)}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200"
                      >
                        Mark Unpaid
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(bill.id)}
                        className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(bill)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                      aria-label={`Edit ${bill.name}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(bill.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${bill.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Mini Calendar View */}
          <section aria-label="Bills calendar">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {monthNames[calendarMonth]} {calendarYear} - Bill Calendar
            </h2>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1 text-xs font-semibold text-neutral-500">
                    {day}
                  </div>
                ))}
                {/* Empty cells before first day */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {/* Calendar days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const hasBill = billDays.has(day);
                  const isToday = day === now.getDate();
                  return (
                    <div
                      key={day}
                      className={`relative flex aspect-square items-center justify-center rounded-lg text-xs ${
                        isToday
                          ? "bg-primary-100 font-bold text-primary-700"
                          : "text-neutral-700"
                      }`}
                    >
                      {day}
                      {hasBill && (
                        <span className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
