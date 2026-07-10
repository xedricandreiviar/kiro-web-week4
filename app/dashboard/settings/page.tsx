"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  transactionStorage,
  budgetStorage,
  savingsGoalStorage,
  billStorage,
  debtStorage,
  assetStorage,
  liabilityStorage,
} from "../../lib/storage";

const INCOME_RANGES = [
  "Under $2,000",
  "$2,000 - $4,000",
  "$4,000 - $6,000",
  "$6,000 - $8,000",
  "$8,000 - $10,000",
  "Over $10,000",
];

const SPENDING_CATEGORIES = [
  "Food & Dining",
  "Housing",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Utilities",
  "Education",
  "Travel",
  "Personal Care",
];

const FINANCIAL_GOALS = [
  { value: "saving", label: "Build Savings" },
  { value: "debt_payoff", label: "Pay Off Debt" },
  { value: "investing", label: "Start Investing" },
  { value: "budgeting", label: "Better Budgeting" },
];

const SAVINGS_TARGETS = [
  "Under $200",
  "$200 - $500",
  "$500 - $1,000",
  "$1,000 - $2,000",
  "Over $2,000",
];

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();

  // Profile state
  const [name, setName] = useState(user?.name || "");
  const [profileSaved, setProfileSaved] = useState(false);

  // Preferences state
  const [incomeRange, setIncomeRange] = useState(user?.onboarding?.incomeRange || INCOME_RANGES[0]);
  const [spendingCategories, setSpendingCategories] = useState<string[]>(
    user?.onboarding?.spendingCategories || []
  );
  const [financialGoal, setFinancialGoal] = useState(user?.onboarding?.financialGoal || "saving");
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(
    user?.onboarding?.monthlySavingsTarget || SAVINGS_TARGETS[0]
  );
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Data management state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [dataCleared, setDataCleared] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleProfileSave = (e: FormEvent) => {
    e.preventDefault();
    updateProfile({ name });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handlePrefsSave = (e: FormEvent) => {
    e.preventDefault();
    updateProfile({
      onboarding: {
        incomeRange,
        spendingCategories,
        financialGoal,
        monthlySavingsTarget,
      },
    });
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 3000);
  };

  const toggleCategory = (category: string) => {
    setSpendingCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleExportData = () => {
    const data = {
      transactions: transactionStorage.getAll(),
      budgets: budgetStorage.getAll(),
      savingsGoals: savingsGoalStorage.getAll(),
      bills: billStorage.getAll(),
      debts: debtStorage.getAll(),
      assets: assetStorage.getAll(),
      liabilities: liabilityStorage.getAll(),
      exportedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `budgetwise-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json);

        // Validate the structure has expected keys
        const validKeys = ["transactions", "budgets", "savingsGoals", "bills", "debts", "assets", "liabilities"];
        const hasValidData = validKeys.some((key) => Array.isArray(data[key]));

        if (!hasValidData) {
          setImportStatus({ type: "error", message: "Invalid file format. Expected a BudgetWise export JSON." });
          setTimeout(() => setImportStatus(null), 5000);
          return;
        }

        // Import each entity type if present in the file
        if (Array.isArray(data.transactions)) {
          localStorage.setItem("budgetwise_transactions", JSON.stringify(data.transactions));
        }
        if (Array.isArray(data.budgets)) {
          localStorage.setItem("budgetwise_budgets", JSON.stringify(data.budgets));
        }
        if (Array.isArray(data.savingsGoals)) {
          localStorage.setItem("budgetwise_savings_goals", JSON.stringify(data.savingsGoals));
        }
        if (Array.isArray(data.bills)) {
          localStorage.setItem("budgetwise_bills", JSON.stringify(data.bills));
        }
        if (Array.isArray(data.debts)) {
          localStorage.setItem("budgetwise_debts", JSON.stringify(data.debts));
        }
        if (Array.isArray(data.assets)) {
          localStorage.setItem("budgetwise_assets", JSON.stringify(data.assets));
        }
        if (Array.isArray(data.liabilities)) {
          localStorage.setItem("budgetwise_liabilities", JSON.stringify(data.liabilities));
        }

        setImportStatus({ type: "success", message: "Data imported successfully! Refresh the page to see updated data." });
        setTimeout(() => setImportStatus(null), 5000);
      } catch {
        setImportStatus({ type: "error", message: "Failed to parse the file. Make sure it is a valid JSON export." });
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be re-imported
    e.target.value = "";
  };

  const handleClearData = () => {
    // Clear all budgetwise_ keys except user auth
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("budgetwise_") && key !== "budgetwise_user") {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    setShowClearConfirm(false);
    setDataCleared(true);
    setTimeout(() => setDataCleared(false), 3000);
  };

  return (
    <section className="p-4 sm:p-6 lg:p-8" aria-labelledby="settings-heading">
      <header className="mb-6">
        <h1 id="settings-heading" className="text-2xl font-bold text-neutral-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your profile, preferences, and data.</p>
      </header>

      <div className="space-y-6">
        {/* Profile section */}
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Profile</h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-neutral-700">
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium text-neutral-700">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={user?.email || ""}
                disabled
                className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-neutral-400">Email cannot be changed.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                Save Profile
              </button>
              {profileSaved && (
                <span className="text-sm text-green-600">Profile updated!</span>
              )}
            </div>
          </form>
        </article>

        {/* Financial preferences */}
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Financial Preferences
          </h2>
          <form onSubmit={handlePrefsSave} className="space-y-5">
            {/* Income Range */}
            <div>
              <label htmlFor="income-range" className="block text-sm font-medium text-neutral-700">
                Monthly Income Range
              </label>
              <select
                id="income-range"
                value={incomeRange}
                onChange={(e) => setIncomeRange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              >
                {INCOME_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>

            {/* Spending Categories */}
            <fieldset>
              <legend className="block text-sm font-medium text-neutral-700">Spending Categories</legend>
              <p className="mt-1 text-xs text-neutral-500">Select categories relevant to your spending.</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SPENDING_CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      spendingCategories.includes(cat)
                        ? "border-primary-400 bg-primary-50 text-primary-700"
                        : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={spendingCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Financial Goal */}
            <fieldset>
              <legend className="block text-sm font-medium text-neutral-700">Financial Goal</legend>
              <div className="mt-2 space-y-2">
                {FINANCIAL_GOALS.map((goal) => (
                  <label
                    key={goal.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                      financialGoal === goal.value
                        ? "border-primary-400 bg-primary-50 text-primary-700"
                        : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="financial-goal"
                      value={goal.value}
                      checked={financialGoal === goal.value}
                      onChange={(e) => setFinancialGoal(e.target.value)}
                      className="h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-400"
                    />
                    {goal.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Monthly Savings Target */}
            <div>
              <label htmlFor="savings-target" className="block text-sm font-medium text-neutral-700">
                Monthly Savings Target
              </label>
              <select
                id="savings-target"
                value={monthlySavingsTarget}
                onChange={(e) => setMonthlySavingsTarget(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              >
                {SAVINGS_TARGETS.map((target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                Save Preferences
              </button>
              {prefsSaved && (
                <span className="text-sm text-green-600">Preferences updated!</span>
              )}
            </div>
          </form>
        </article>

        {/* Data management */}
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Data Management</h2>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleExportData}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Export Data (JSON)
              </button>
              <p className="text-xs text-neutral-500">Download all your financial data as a JSON file.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                Import Data (JSON)
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-neutral-500">Restore data from a previously exported JSON file.</p>
            </div>

            {importStatus && (
              <p className={`text-sm ${importStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {importStatus.message}
              </p>
            )}

            <div className="border-t border-neutral-200 pt-4">
              {!showClearConfirm ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                  >
                    Clear All Data
                  </button>
                  <p className="text-xs text-neutral-500">Permanently delete all financial data (keeps your account).</p>
                </div>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">
                    Are you sure? This will permanently delete all your transactions, budgets, goals, bills, debts, assets, and liabilities.
                  </p>
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={handleClearData}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Yes, Delete Everything
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {dataCleared && (
                <p className="mt-2 text-sm text-green-600">All data has been cleared.</p>
              )}
            </div>
          </div>
        </article>

        {/* About section */}
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">About</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-neutral-700">App Name:</dt>
              <dd className="text-neutral-600">BudgetWise</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-neutral-700">Version:</dt>
              <dd className="text-neutral-600">1.0.0</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-neutral-700">Description:</dt>
              <dd className="text-neutral-600">
                Your personal financial assistant for budgeting, tracking expenses, managing debts, and achieving your savings goals.
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
