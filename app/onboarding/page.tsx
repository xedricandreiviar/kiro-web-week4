"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, OnboardingData } from "../context/AuthContext";

const INCOME_RANGES = [
  "Under $2,000",
  "$2,000 - $4,000",
  "$4,000 - $6,000",
  "$6,000 - $8,000",
  "$8,000 - $10,000",
  "Over $10,000",
];

const SPENDING_CATEGORIES = [
  "Housing",
  "Food & Dining",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Utilities",
  "Education",
];

const FINANCIAL_GOALS = [
  { value: "saving", label: "Build savings" },
  { value: "debt_payoff", label: "Pay off debt" },
  { value: "investing", label: "Start investing" },
  { value: "budgeting", label: "Better budgeting" },
];

const SAVINGS_TARGETS = [
  "$100 - $300",
  "$300 - $500",
  "$500 - $1,000",
  "$1,000 - $2,000",
  "Over $2,000",
];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [incomeRange, setIncomeRange] = useState("");
  const [spendingCategories, setSpendingCategories] = useState<string[]>([]);
  const [financialGoal, setFinancialGoal] = useState("");
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState("");
  const { isLoggedIn, updateProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  const toggleCategory = (category: string) => {
    setSpendingCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return incomeRange !== "";
      case 2:
        return spendingCategories.length > 0;
      case 3:
        return financialGoal !== "";
      case 4:
        return monthlySavingsTarget !== "";
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      const onboarding: OnboardingData = {
        incomeRange,
        spendingCategories,
        financialGoal,
        monthlySavingsTarget,
      };
      updateProfile({ onboarding });
      router.push("/dashboard");
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-8">
      <section className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-primary-700 sm:text-2xl">
            Personalize Your Experience
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Step {step} of {TOTAL_STEPS}
          </p>
          {/* Progress indicator */}
          <div className="mt-4 flex gap-2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-primary-500" : "bg-neutral-200"
                }`}
              />
            ))}
          </div>
        </header>

        {/* Step 1: Income range */}
        {step === 1 && (
          <fieldset className="space-y-3">
            <legend className="text-base font-medium text-neutral-800">
              What is your monthly income range?
            </legend>
            <div className="mt-3 grid gap-2">
              {INCOME_RANGES.map((range) => (
                <label
                  key={range}
                  className={`flex cursor-pointer items-center rounded-lg border px-4 py-3 text-sm transition-colors ${
                    incomeRange === range
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="income"
                    value={range}
                    checked={incomeRange === range}
                    onChange={() => setIncomeRange(range)}
                    className="sr-only"
                  />
                  {range}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Step 2: Spending categories */}
        {step === 2 && (
          <fieldset className="space-y-3">
            <legend className="text-base font-medium text-neutral-800">
              What are your top spending categories?
            </legend>
            <p className="text-sm text-neutral-500">Select all that apply</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SPENDING_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className={`flex cursor-pointer items-center rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    spendingCategories.includes(category)
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={spendingCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="sr-only"
                  />
                  {category}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Step 3: Financial goal */}
        {step === 3 && (
          <fieldset className="space-y-3">
            <legend className="text-base font-medium text-neutral-800">
              What is your primary financial goal?
            </legend>
            <div className="mt-3 grid gap-2">
              {FINANCIAL_GOALS.map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center rounded-lg border px-4 py-3 text-sm transition-colors ${
                    financialGoal === value
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="goal"
                    value={value}
                    checked={financialGoal === value}
                    onChange={() => setFinancialGoal(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Step 4: Monthly savings target */}
        {step === 4 && (
          <fieldset className="space-y-3">
            <legend className="text-base font-medium text-neutral-800">
              How much do you want to save each month?
            </legend>
            <div className="mt-3 grid gap-2">
              {SAVINGS_TARGETS.map((target) => (
                <label
                  key={target}
                  className={`flex cursor-pointer items-center rounded-lg border px-4 py-3 text-sm transition-colors ${
                    monthlySavingsTarget === target
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="savings"
                    value={target}
                    checked={monthlySavingsTarget === target}
                    onChange={() => setMonthlySavingsTarget(target)}
                    className="sr-only"
                  />
                  {target}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <footer className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-800 disabled:invisible"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className="rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === TOTAL_STEPS ? "Get Started" : "Next"}
          </button>
        </footer>
      </section>
    </main>
  );
}
