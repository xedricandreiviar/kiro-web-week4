"use client";

import { useState, FormEvent } from "react";
import {
  savingsGoalStorage,
  SavingsGoal,
} from "../../lib/storage";
import {
  formatCurrency,
  generateId,
  calculatePercentage,
} from "../../lib/utils";

const PRESET_COLORS = [
  "#4ade80",
  "#60a5fa",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#fb923c",
];

interface GoalForm {
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  color: string;
}

const emptyForm: GoalForm = {
  name: "",
  targetAmount: "",
  currentAmount: "0",
  deadline: "",
  color: PRESET_COLORS[0],
};

function loadGoals(): SavingsGoal[] {
  if (typeof window === "undefined") return [];
  return savingsGoalStorage.getAll();
}

function getDaysUntilDeadline(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffMs = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getMonthlyContribution(remaining: number, deadline: string): number {
  const daysLeft = getDaysUntilDeadline(deadline);
  if (daysLeft <= 0) return remaining;
  const monthsLeft = Math.max(daysLeft / 30, 1);
  return remaining / monthsLeft;
}

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>(loadGoals);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [addFundsId, setAddFundsId] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState("");

  // Separate active and completed goals
  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount);

  // Overall summary
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallProgress = calculatePercentage(totalSaved, totalTarget);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const targetAmount = parseFloat(form.targetAmount);
    const currentAmount = parseFloat(form.currentAmount) || 0;
    if (isNaN(targetAmount) || targetAmount <= 0 || !form.name.trim()) return;

    if (editingId) {
      savingsGoalStorage.update(editingId, {
        name: form.name.trim(),
        targetAmount,
        currentAmount,
        deadline: form.deadline,
        color: form.color,
      });
    } else {
      const goal: SavingsGoal = {
        id: generateId(),
        name: form.name.trim(),
        targetAmount,
        currentAmount,
        deadline: form.deadline,
        color: form.color,
      };
      savingsGoalStorage.create(goal);
    }

    setGoals(savingsGoalStorage.getAll());
    resetForm();
  };

  const handleAddFunds = (goalId: string) => {
    const amount = parseFloat(fundsAmount);
    if (isNaN(amount) || amount <= 0) return;

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    savingsGoalStorage.update(goalId, {
      currentAmount: goal.currentAmount + amount,
    });

    setGoals(savingsGoalStorage.getAll());
    setAddFundsId(null);
    setFundsAmount("");
  };

  const handleEdit = (goal: SavingsGoal) => {
    setEditingId(goal.id);
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline,
      color: goal.color,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this savings goal?")) {
      savingsGoalStorage.delete(id);
      setGoals(savingsGoalStorage.getAll());
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
            Savings Goals
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Set targets and track progress toward your financial goals
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
          + Create Goal
        </button>
      </header>

      {/* Overall summary */}
      {goals.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-3" aria-label="Savings summary">
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Total Saved
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(totalSaved)}
            </p>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Total Target
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {formatCurrency(totalTarget)}
            </p>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Overall Progress
            </p>
            <p className="mt-1 text-2xl font-bold text-primary-600">
              {overallProgress}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>
          </article>
        </section>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <section
          className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm"
          aria-label={editingId ? "Edit goal" : "Create goal"}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingId ? "Edit Goal" : "New Savings Goal"}
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
              {/* Name */}
              <div>
                <label
                  htmlFor="goal-name"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Goal Name
                </label>
                <input
                  id="goal-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Emergency Fund"
                />
              </div>

              {/* Target Amount */}
              <div>
                <label
                  htmlFor="goal-target"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Target Amount ($)
                </label>
                <input
                  id="goal-target"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.targetAmount}
                  onChange={(e) =>
                    setForm({ ...form, targetAmount: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="10000.00"
                />
              </div>

              {/* Current Amount */}
              <div>
                <label
                  htmlFor="goal-current"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Current Amount ($)
                </label>
                <input
                  id="goal-current"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.currentAmount}
                  onChange={(e) =>
                    setForm({ ...form, currentAmount: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="0.00"
                />
              </div>

              {/* Deadline */}
              <div>
                <label
                  htmlFor="goal-deadline"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Deadline
                </label>
                <input
                  id="goal-deadline"
                  type="date"
                  required
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Color
                </label>
                <div className="mt-2 flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        form.color === color
                          ? "scale-110 border-neutral-900"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                {editingId ? "Update Goal" : "Save Goal"}
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

      {/* Active Goals */}
      {goals.length === 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl" aria-hidden="true">
              🎯
            </p>
            <h2 className="mt-3 text-lg font-semibold text-neutral-700">
              No savings goals yet
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Create your first savings goal and start building toward your dreams!
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              + Create Goal
            </button>
          </div>
        </section>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <section aria-label="Active savings goals">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Active Goals ({activeGoals.length})
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activeGoals.map((goal) => {
                  const percentage = calculatePercentage(
                    goal.currentAmount,
                    goal.targetAmount
                  );
                  const remaining = goal.targetAmount - goal.currentAmount;
                  const daysLeft = getDaysUntilDeadline(goal.deadline);
                  const monthlyNeeded = getMonthlyContribution(
                    remaining,
                    goal.deadline
                  );

                  return (
                    <article
                      key={goal.id}
                      className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
                    >
                      {/* Colored accent bar */}
                      <div
                        className="h-1.5"
                        style={{ backgroundColor: goal.color }}
                      />
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <h3 className="text-base font-semibold text-neutral-900">
                            {goal.name}
                          </h3>
                          <span className="text-xs text-neutral-500">
                            {daysLeft > 0
                              ? `${daysLeft} days left`
                              : "Overdue"}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="mt-4">
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm text-neutral-600">
                              <span className="font-semibold text-neutral-900">
                                {formatCurrency(goal.currentAmount)}
                              </span>{" "}
                              / {formatCurrency(goal.targetAmount)}
                            </p>
                            <span className="text-sm font-semibold text-neutral-700">
                              {percentage}%
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-neutral-200">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: goal.color,
                              }}
                            />
                          </div>

                          {/* Details */}
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-neutral-500">
                              Remaining:{" "}
                              <span className="font-medium text-neutral-700">
                                {formatCurrency(remaining)}
                              </span>
                            </p>
                            {daysLeft > 0 && (
                              <p className="text-xs text-neutral-500">
                                Monthly contribution needed:{" "}
                                <span className="font-medium text-neutral-700">
                                  {formatCurrency(monthlyNeeded)}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Add Funds */}
                        {addFundsId === goal.id ? (
                          <div className="mt-4 flex gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={fundsAmount}
                              onChange={(e) => setFundsAmount(e.target.value)}
                              className="block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                              placeholder="Amount"
                              aria-label="Amount to add"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddFunds(goal.id)}
                              className="shrink-0 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddFundsId(null);
                                setFundsAmount("");
                              }}
                              className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setAddFundsId(goal.id);
                                setFundsAmount("");
                              }}
                              className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                            >
                              + Add Funds
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(goal)}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
                              aria-label={`Edit ${goal.name}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(goal.id)}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                              aria-label={`Delete ${goal.name}`}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <section aria-label="Completed savings goals">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Completed Goals ({completedGoals.length})
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {completedGoals.map((goal) => (
                  <article
                    key={goal.id}
                    className="overflow-hidden rounded-xl border border-neutral-200 bg-white opacity-80 shadow-sm"
                  >
                    <div
                      className="h-1.5"
                      style={{ backgroundColor: goal.color }}
                    />
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <h3 className="text-base font-semibold text-neutral-700">
                          {goal.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          <svg
                            className="h-3 w-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Complete
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-neutral-600">
                          <span className="font-semibold text-neutral-800">
                            {formatCurrency(goal.currentAmount)}
                          </span>{" "}
                          / {formatCurrency(goal.targetAmount)}
                        </p>
                        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-neutral-200">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: "100%",
                              backgroundColor: goal.color,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(goal.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                          aria-label={`Delete ${goal.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
