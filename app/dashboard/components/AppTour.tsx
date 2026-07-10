"use client";

import { useState, useRef, useCallback } from "react";

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
    title: "Financial Summary",
    description: "See your key financial metrics at a glance: monthly income, expenses, net balance, and savings rate all in one place.",
    targetId: "tour-budget-overview",
  },
  {
    title: "Savings Progress",
    description: "Monitor your progress toward your monthly savings target. Stay motivated by watching your goal get closer!",
    targetId: "tour-savings-goal",
  },
  {
    title: "Recent Transactions",
    description: "View your latest transactions at a glance. Click 'View All' to see your complete transaction history.",
    targetId: "tour-expense-tracker",
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
  const hasScrolledRef = useRef(false);

  const scrollToTarget = useCallback((stepIndex: number) => {
    const step = TOUR_STEPS[stepIndex];
    const target = document.getElementById(step.targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Scroll to the initial target on first render via ref callback
  const dialogRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && !hasScrolledRef.current) {
        hasScrolledRef.current = true;
        scrollToTarget(0);
      }
    },
    [scrollToTarget]
  );

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollToTarget(nextStep);
    } else {
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      scrollToTarget(prevStep);
    }
  };

  const completeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];

  // Get target element position for highlighting
  const target = typeof window !== "undefined" ? document.getElementById(step.targetId) : null;
  const targetRect = target?.getBoundingClientRect() ?? null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="App tour"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-900/60" />

      {/* Highlight outline around target element */}
      {targetRect && (
        <div
          className="absolute z-10 rounded-xl border-2 border-primary-400 shadow-lg shadow-primary-400/20 pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tour card - positioned below target or centered as fallback */}
      <article
        className="absolute z-20 mx-4 w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-lg"
        style={
          targetRect
            ? {
                top: Math.min(targetRect.bottom + 16, window.innerHeight - 280),
                left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 432)),
              }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
      >
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
