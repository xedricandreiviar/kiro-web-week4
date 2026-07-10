"use client";

import { useState, useMemo, useCallback } from "react";
import {
  transactionStorage,
  budgetStorage,
  savingsGoalStorage,
  billStorage,
  debtStorage,
  Transaction,
  Budget,
  SavingsGoal,
  Bill,
  Debt,
} from "../../lib/storage";
import { formatCurrency, getMonthDateRange } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

interface Insight {
  id: string;
  icon: string;
  title: string;
  description: string;
  type: "warning" | "success" | "info" | "tip";
}

function loadAllData() {
  if (typeof window === "undefined")
    return {
      transactions: [] as Transaction[],
      budgets: [] as Budget[],
      goals: [] as SavingsGoal[],
      bills: [] as Bill[],
      debts: [] as Debt[],
    };
  return {
    transactions: transactionStorage.getAll(),
    budgets: budgetStorage.getAll(),
    goals: savingsGoalStorage.getAll(),
    bills: billStorage.getAll(),
    debts: debtStorage.getAll(),
  };
}

function generateInsights(
  transactions: Transaction[],
  budgets: Budget[],
  goals: SavingsGoal[],
  bills: Bill[],
  debts: Debt[],
  financialGoal?: string
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  const { start: thisMonthStart, end: thisMonthEnd } = getMonthDateRange(0);
  const { start: lastMonthStart, end: lastMonthEnd } = getMonthDateRange(-1);

  const thisMonthTxns = transactions.filter((t) => t.date >= thisMonthStart && t.date <= thisMonthEnd);
  const lastMonthTxns = transactions.filter((t) => t.date >= lastMonthStart && t.date <= lastMonthEnd);

  const thisMonthExpenses = thisMonthTxns.filter((t) => t.type === "expense");
  const lastMonthExpenses = lastMonthTxns.filter((t) => t.type === "expense");

  const thisMonthIncome = thisMonthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const thisMonthExpenseTotal = thisMonthExpenses.reduce((s, t) => s + t.amount, 0);

  // 1. Spending alert: category spending 50%+ higher than last month
  const thisCatMap: Record<string, number> = {};
  const lastCatMap: Record<string, number> = {};
  thisMonthExpenses.forEach((t) => {
    thisCatMap[t.category] = (thisCatMap[t.category] || 0) + t.amount;
  });
  lastMonthExpenses.forEach((t) => {
    lastCatMap[t.category] = (lastCatMap[t.category] || 0) + t.amount;
  });

  for (const [cat, amount] of Object.entries(thisCatMap)) {
    const lastAmount = lastCatMap[cat] || 0;
    if (lastAmount > 0 && amount >= lastAmount * 1.5) {
      const increase = Math.round(((amount - lastAmount) / lastAmount) * 100);
      insights.push({
        id: `spending-alert-${cat}`,
        icon: "🚨",
        title: `${cat} spending is up ${increase}%`,
        description: `You spent ${formatCurrency(amount)} on ${cat} this month, compared to ${formatCurrency(lastAmount)} last month. Consider cutting back in this area.`,
        type: "warning",
      });
    }
  }

  // 2. Budget warning: over 80%
  budgets.forEach((budget) => {
    const spent = thisCatMap[budget.category] || 0;
    const percentage = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
    if (percentage >= 80) {
      insights.push({
        id: `budget-warning-${budget.id}`,
        icon: "⚠️",
        title: `${budget.category} budget is at ${percentage}%`,
        description: `You have spent ${formatCurrency(spent)} of your ${formatCurrency(budget.limit)} ${budget.category} budget. Consider reducing spending to stay on track.`,
        type: "warning",
      });
    }
  });

  // 3. Savings tip: behind on goals
  goals.forEach((goal) => {
    const deadline = new Date(goal.deadline);
    const monthsLeft = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()));
    const remaining = goal.targetAmount - goal.currentAmount;
    const neededPerMonth = remaining / monthsLeft;
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

    if (remaining > 0 && deadline > now) {
      // Check if behind pace
      const totalMonths = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()) + (now.getDate() > 15 ? 0 : 1));
      const expectedProgress = ((totalMonths - monthsLeft + (now.getDate() / 30)) / totalMonths) * 100;

      if (progress < expectedProgress * 0.8) {
        insights.push({
          id: `savings-behind-${goal.id}`,
          icon: "💡",
          title: `Increase savings for "${goal.name}"`,
          description: `You need ${formatCurrency(neededPerMonth)}/month to reach your ${formatCurrency(goal.targetAmount)} goal by the deadline. You are currently at ${Math.round(progress)}%.`,
          type: "tip",
        });
      } else if (progress >= expectedProgress) {
        insights.push({
          id: `savings-ontrack-${goal.id}`,
          icon: "🎉",
          title: `"${goal.name}" is on track!`,
          description: `Great job! You have saved ${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)} (${Math.round(progress)}%). Keep up the momentum!`,
          type: "success",
        });
      }
    }
  });

  // 4. Bill reminder: bills due in next 3 days
  const todayDay = now.getDate();
  bills.forEach((bill) => {
    if (!bill.isPaid) {
      const daysUntilDue = bill.dueDate >= todayDay ? bill.dueDate - todayDay : (bill.dueDate + 30) - todayDay;
      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        insights.push({
          id: `bill-reminder-${bill.id}`,
          icon: "📅",
          title: `${bill.name} due ${daysUntilDue === 0 ? "today" : `in ${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""}`}`,
          description: `Your ${bill.name} bill of ${formatCurrency(bill.amount)} is due soon. ${bill.autoPay ? "Auto-pay is enabled." : "Make sure to pay it on time."}`,
          type: "info",
        });
      }
    }
  });

  // 5. Debt tip: high interest debt (>15%)
  debts.forEach((debt) => {
    if (debt.interestRate > 15 && debt.remainingAmount > 0) {
      insights.push({
        id: `debt-high-interest-${debt.id}`,
        icon: "🔥",
        title: `Prioritize paying off ${debt.name}`,
        description: `${debt.name} has a ${debt.interestRate}% interest rate with ${formatCurrency(debt.remainingAmount)} remaining. High-interest debt should be your top priority to pay down.`,
        type: "warning",
      });
    }
  });

  // 6. Income suggestion: expenses exceed 80% of income
  if (thisMonthIncome > 0 && thisMonthExpenseTotal > thisMonthIncome * 0.8) {
    const ratio = Math.round((thisMonthExpenseTotal / thisMonthIncome) * 100);
    insights.push({
      id: "income-ratio-warning",
      icon: "📊",
      title: `Expenses are ${ratio}% of your income`,
      description: `You are spending ${formatCurrency(thisMonthExpenseTotal)} against ${formatCurrency(thisMonthIncome)} in income this month. Consider finding ways to reduce expenses or increase income.`,
      type: "warning",
    });
  }

  // 7. General tip based on financial goal
  if (financialGoal) {
    const goalTips: Record<string, Insight> = {
      saving: {
        id: "goal-tip-saving",
        icon: "🏦",
        title: "Automate your savings",
        description: "Since your goal is to save more, try setting up automatic transfers to your savings account right after each paycheck arrives.",
        type: "tip",
      },
      debt_payoff: {
        id: "goal-tip-debt",
        icon: "💳",
        title: "Use the debt avalanche method",
        description: "Focus extra payments on your highest-interest debt first while paying minimums on others. This saves the most money over time.",
        type: "tip",
      },
      investing: {
        id: "goal-tip-investing",
        icon: "📈",
        title: "Start with index funds",
        description: "Since your goal is investing, consider low-cost index funds for diversified market exposure. Consistency matters more than timing.",
        type: "tip",
      },
      budgeting: {
        id: "goal-tip-budgeting",
        icon: "📋",
        title: "Try the 50/30/20 rule",
        description: "Allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment for a balanced budget.",
        type: "tip",
      },
    };
    const tip = goalTips[financialGoal];
    if (tip) insights.push(tip);
  }

  // If no insights generated at all, add a general one
  if (insights.length === 0) {
    insights.push({
      id: "general-tip",
      icon: "✨",
      title: "Start tracking your finances",
      description: "Add some transactions, set up budgets, and create savings goals to get personalized insights and tips based on your spending patterns.",
      type: "info",
    });
  }

  return insights;
}

function getBorderColor(type: Insight["type"]): string {
  switch (type) {
    case "warning":
      return "border-l-red-500";
    case "success":
      return "border-l-green-500";
    case "info":
      return "border-l-blue-500";
    case "tip":
      return "border-l-yellow-500";
  }
}

function getBadgeStyle(type: Insight["type"]): string {
  switch (type) {
    case "warning":
      return "bg-red-100 text-red-700";
    case "success":
      return "bg-green-100 text-green-700";
    case "info":
      return "bg-blue-100 text-blue-700";
    case "tip":
      return "bg-yellow-100 text-yellow-700";
  }
}

export default function InsightsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(loadAllData);

  const insights = useMemo(
    () =>
      generateInsights(
        data.transactions,
        data.budgets,
        data.goals,
        data.bills,
        data.debts,
        user?.onboarding?.financialGoal
      ),
    [data, user?.onboarding?.financialGoal]
  );

  const handleRefresh = useCallback(() => {
    setData(loadAllData());
  }, []);

  return (
    <section className="p-4 sm:p-6 lg:p-8" aria-labelledby="insights-heading">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="insights-heading" className="text-2xl font-bold text-neutral-900">
            Insights &amp; Tips
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Personalized recommendations based on your financial data.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          Refresh
        </button>
      </header>

      {/* Insights list */}
      <div className="space-y-4">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className={`rounded-xl border border-neutral-200 border-l-4 bg-white p-5 shadow-sm ${getBorderColor(insight.type)}`}
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden="true">
                {insight.icon}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-neutral-900">{insight.title}</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getBadgeStyle(insight.type)}`}>
                    {insight.type}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600">{insight.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
