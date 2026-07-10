"use client";

import { useState, FormEvent } from "react";
import {
  assetStorage,
  liabilityStorage,
  debtStorage,
  Asset,
  Liability,
  Debt,
} from "../../lib/storage";
import { formatCurrency, generateId } from "../../lib/utils";

interface AssetForm {
  name: string;
  value: string;
  type: Asset["type"];
}

interface LiabilityForm {
  name: string;
  amount: string;
  type: Liability["type"];
}

const emptyAssetForm: AssetForm = { name: "", value: "", type: "cash" };
const emptyLiabilityForm: LiabilityForm = { name: "", amount: "", type: "other" };

function loadAssets(): Asset[] {
  if (typeof window === "undefined") return [];
  return assetStorage.getAll();
}

function loadLiabilities(): Liability[] {
  if (typeof window === "undefined") return [];
  return liabilityStorage.getAll();
}

function loadDebts(): Debt[] {
  if (typeof window === "undefined") return [];
  return debtStorage.getAll();
}

const ASSET_TYPES: { value: Asset["type"]; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
  { value: "property", label: "Property" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other", label: "Other" },
];

const LIABILITY_TYPES: { value: Liability["type"]; label: string }[] = [
  { value: "mortgage", label: "Mortgage" },
  { value: "car_loan", label: "Car Loan" },
  { value: "student_loan", label: "Student Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

function getTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    cash: "bg-green-100 text-green-700",
    investment: "bg-blue-100 text-blue-700",
    property: "bg-purple-100 text-purple-700",
    vehicle: "bg-amber-100 text-amber-700",
    mortgage: "bg-red-100 text-red-700",
    car_loan: "bg-orange-100 text-orange-700",
    student_loan: "bg-indigo-100 text-indigo-700",
    credit_card: "bg-pink-100 text-pink-700",
    other: "bg-neutral-100 text-neutral-700",
  };
  return colors[type] || colors.other;
}

function formatType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function NetWorthPage() {
  const [assets, setAssets] = useState<Asset[]>(loadAssets);
  const [liabilities, setLiabilities] = useState<Liability[]>(loadLiabilities);
  const [debts, setDebts] = useState<Debt[]>(loadDebts);

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAssetForm);

  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null);
  const [liabilityForm, setLiabilityForm] = useState<LiabilityForm>(emptyLiabilityForm);

  const [error, setError] = useState("");

  // Calculations
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalManualLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const totalDebtLiabilities = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalLiabilities = totalManualLiabilities + totalDebtLiabilities;
  const netWorth = totalAssets - totalLiabilities;

  // Proportional bar widths
  const maxBar = Math.max(totalAssets, totalLiabilities, 1);
  const assetBarWidth = (totalAssets / maxBar) * 100;
  const liabilityBarWidth = (totalLiabilities / maxBar) * 100;

  // Asset form handlers
  const handleAssetSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseFloat(assetForm.value);
    if (!assetForm.name.trim() || isNaN(value) || value <= 0) return;

    if (editingAssetId) {
      const result = assetStorage.update(editingAssetId, {
        name: assetForm.name.trim(),
        value,
        type: assetForm.type,
      });
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    } else {
      const asset: Asset = {
        id: generateId(),
        name: assetForm.name.trim(),
        value,
        type: assetForm.type,
      };
      const result = assetStorage.create(asset);
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    }

    setError("");
    setAssets(assetStorage.getAll());
    resetAssetForm();
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setAssetForm({
      name: asset.name,
      value: asset.value.toString(),
      type: asset.type,
    });
    setShowAssetForm(true);
  };

  const handleDeleteAsset = (id: string) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      assetStorage.delete(id);
      setAssets(assetStorage.getAll());
    }
  };

  const resetAssetForm = () => {
    setAssetForm(emptyAssetForm);
    setEditingAssetId(null);
    setShowAssetForm(false);
  };

  // Liability form handlers
  const handleLiabilitySubmit = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(liabilityForm.amount);
    if (!liabilityForm.name.trim() || isNaN(amount) || amount <= 0) return;

    if (editingLiabilityId) {
      const result = liabilityStorage.update(editingLiabilityId, {
        name: liabilityForm.name.trim(),
        amount,
        type: liabilityForm.type,
      });
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    } else {
      const liability: Liability = {
        id: generateId(),
        name: liabilityForm.name.trim(),
        amount,
        type: liabilityForm.type,
      };
      const result = liabilityStorage.create(liability);
      if (!result.success) {
        setError("Failed to save. Storage may be full.");
        return;
      }
    }

    setError("");
    setLiabilities(liabilityStorage.getAll());
    resetLiabilityForm();
  };

  const handleEditLiability = (liability: Liability) => {
    setEditingLiabilityId(liability.id);
    setLiabilityForm({
      name: liability.name,
      amount: liability.amount.toString(),
      type: liability.type,
    });
    setShowLiabilityForm(true);
  };

  const handleDeleteLiability = (id: string) => {
    if (window.confirm("Are you sure you want to delete this liability?")) {
      liabilityStorage.delete(id);
      setLiabilities(liabilityStorage.getAll());
    }
  };

  const resetLiabilityForm = () => {
    setLiabilityForm(emptyLiabilityForm);
    setEditingLiabilityId(null);
    setShowLiabilityForm(false);
  };

  // Refresh debts after navigating back
  const refreshDebts = () => {
    setDebts(debtStorage.getAll());
  };

  // We call refreshDebts on mount is not needed since we use lazy initializer
  // But we keep this for reference if user navigates between pages

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          Net Worth
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Track your total assets and liabilities to understand your financial position
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Net Worth Headline */}
      <section
        className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm"
        aria-label="Net worth summary"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Your Net Worth
        </p>
        <p
          className={`mt-2 text-4xl font-bold ${
            netWorth >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatCurrency(netWorth)}
        </p>
      </section>

      {/* Summary Cards */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Financial summary">
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Total Assets
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {formatCurrency(totalAssets)}
          </p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Total Liabilities
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {formatCurrency(totalLiabilities)}
          </p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Net Worth
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              netWorth >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(netWorth)}
          </p>
        </article>
      </section>

      {/* Visual Breakdown */}
      {(totalAssets > 0 || totalLiabilities > 0) && (
        <section
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          aria-label="Visual breakdown"
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Visual Breakdown
          </h2>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-green-700">Assets</span>
                <span className="text-neutral-600">{formatCurrency(totalAssets)}</span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${assetBarWidth}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-red-700">Liabilities</span>
                <span className="text-neutral-600">{formatCurrency(totalLiabilities)}</span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${liabilityBarWidth}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Assets Section */}
      <section aria-label="Assets">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Assets
          </h2>
          <button
            type="button"
            onClick={() => {
              resetAssetForm();
              setShowAssetForm(true);
            }}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
          >
            + Add Asset
          </button>
        </div>

        {/* Asset Form */}
        {showAssetForm && (
          <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">
                {editingAssetId ? "Edit Asset" : "Add New Asset"}
              </h3>
              <button
                type="button"
                onClick={resetAssetForm}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleAssetSubmit}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="asset-name" className="block text-xs font-medium text-neutral-700">
                    Name
                  </label>
                  <input
                    id="asset-name"
                    type="text"
                    required
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g., Savings Account"
                  />
                </div>
                <div>
                  <label htmlFor="asset-value" className="block text-xs font-medium text-neutral-700">
                    Value (PHP)
                  </label>
                  <input
                    id="asset-value"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={assetForm.value}
                    onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="10000.00"
                  />
                </div>
                <div>
                  <label htmlFor="asset-type" className="block text-xs font-medium text-neutral-700">
                    Type
                  </label>
                  <select
                    id="asset-type"
                    value={assetForm.type}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, type: e.target.value as Asset["type"] })
                    }
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    {ASSET_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                  {editingAssetId ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={resetAssetForm}
                  className="rounded-lg border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Asset List */}
        {assets.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-neutral-500">No assets added yet. Add your first asset above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map((asset) => (
              <article
                key={asset.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{asset.name}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getTypeBadgeColor(
                        asset.type
                      )}`}
                    >
                      {formatType(asset.type)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-green-600">
                    {formatCurrency(asset.value)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleEditAsset(asset)}
                    className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
                    aria-label={`Edit ${asset.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${asset.name}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
            <div className="flex justify-end border-t border-neutral-200 pt-2">
              <p className="text-sm font-semibold text-neutral-900">
                Total: <span className="text-green-600">{formatCurrency(totalAssets)}</span>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Liabilities Section */}
      <section aria-label="Liabilities">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Liabilities
          </h2>
          <button
            type="button"
            onClick={() => {
              resetLiabilityForm();
              setShowLiabilityForm(true);
            }}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
          >
            + Add Liability
          </button>
        </div>

        {/* Hint about debt inclusion to prevent double-counting */}
        {debts.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Note:</span> Debts from the Debts page are automatically included below as read-only liabilities.
              Avoid adding the same debt manually here to prevent double-counting.
            </p>
          </div>
        )}

        {/* Liability Form */}
        {showLiabilityForm && (
          <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">
                {editingLiabilityId ? "Edit Liability" : "Add New Liability"}
              </h3>
              <button
                type="button"
                onClick={resetLiabilityForm}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleLiabilitySubmit}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="liability-name" className="block text-xs font-medium text-neutral-700">
                    Name
                  </label>
                  <input
                    id="liability-name"
                    type="text"
                    required
                    value={liabilityForm.name}
                    onChange={(e) =>
                      setLiabilityForm({ ...liabilityForm, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g., Mortgage"
                  />
                </div>
                <div>
                  <label htmlFor="liability-amount" className="block text-xs font-medium text-neutral-700">
                    Amount (PHP)
                  </label>
                  <input
                    id="liability-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={liabilityForm.amount}
                    onChange={(e) =>
                      setLiabilityForm({ ...liabilityForm, amount: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="250000.00"
                  />
                </div>
                <div>
                  <label htmlFor="liability-type" className="block text-xs font-medium text-neutral-700">
                    Type
                  </label>
                  <select
                    id="liability-type"
                    value={liabilityForm.type}
                    onChange={(e) =>
                      setLiabilityForm({
                        ...liabilityForm,
                        type: e.target.value as Liability["type"],
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    {LIABILITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                  {editingLiabilityId ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={resetLiabilityForm}
                  className="rounded-lg border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liability List */}
        {liabilities.length === 0 && debts.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-neutral-500">
              No liabilities tracked. Add a liability above or track debts on the Debts page.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Manual liabilities */}
            {liabilities.map((liability) => (
              <article
                key={liability.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{liability.name}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getTypeBadgeColor(
                        liability.type
                      )}`}
                    >
                      {formatType(liability.type)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-red-600">
                    {formatCurrency(liability.amount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleEditLiability(liability)}
                    className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
                    aria-label={`Edit ${liability.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLiability(liability.id)}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${liability.name}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}

            {/* Debts shown as read-only liabilities */}
            {debts.map((debt) => (
              <article
                key={`debt-${debt.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{debt.name}</p>
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      From Debts
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-red-600">
                    {formatCurrency(debt.remainingAmount)}
                  </p>
                  <a
                    href="/dashboard/debts"
                    className="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                    onClick={refreshDebts}
                  >
                    View in Debts
                  </a>
                </div>
              </article>
            ))}

            <div className="flex justify-end border-t border-neutral-200 pt-2">
              <p className="text-sm font-semibold text-neutral-900">
                Total: <span className="text-red-600">{formatCurrency(totalLiabilities)}</span>
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
