"use client";

import { useState } from "react";

const TOUR_STORAGE_KEY = "budgetwise_tour_complete";

interface TourStep {
  title: string;
  description: string;
  targetId: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to BudgetWise!",
    description: "Your personalized financial dashboard is ready. Let us show you around so you can get the most out of it.",
    targetId: "tour-welcome",
  },
  {
    title: "Budget Overview",
    description: "Track your monthly budget versus actual spending at a glance. The progress bar shows how much of your budget you have used.",
    targetId: "tour-budget-overview",
  },
  {
    title: "Expense Tracker",
    description: "View your recent transactions and add new expenses. Everything is stored locally so your data stays private.",
    targetId: "tour-expense-tracker",
  },
  {
    title: "Savings Goal",
    description: "Monitor your progress toward your monthly savings target. Stay motivated by watching your goal get closer!",
    targetId: "tour-savings-goal",
  },
  {
    title: "Quick Actions",
    description: "Use these shortcuts to quickly add expenses, set budgets, or view spending reports.",
    targetId: "tour-quick-actions",
  },
  {
    title: "You are all set!",
    description: "You are ready to take control of your finances. Start by adding your first expense or exploring your dashboard.",
    targetId: "tour-complete",
  },
];

export default function AppTour() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(TOUR_STORAGE_KEY);
  });
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="App tour"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-900/60" />

      {/* Tour card */}
      <article className="relative z-10 mx-4 w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-lg">
        <header className="mb-4">
          <p className="text-xs font-medium text-primary-500">
            Step {currentStep + 1} of {TOUR_STEPS.length}
          </p>
          <h2 className="mt-1 text-lg font-bold text-neutral-900">{step.title}</h2>
        </header>

        <p className="text-sm leading-relaxed text-neutral-600">{step.description}</p>

        {/* Progress dots */}
        <div className="mt-4 flex gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentStep ? "bg-primary-500" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>

        <footer className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={completeTour}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:invisible"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
            >
              {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
