// Seed realistic mock data on first app load when localStorage is empty

import {
  transactionStorage,
  budgetStorage,
  savingsGoalStorage,
  billStorage,
  Transaction,
  Budget,
  SavingsGoal,
  Bill,
} from "./storage";
import { generateId } from "./utils";

/**
 * Check if data has already been seeded
 */
function isAlreadySeeded(): boolean {
  return transactionStorage.getAll().length > 0;
}

/**
 * Get a random amount between min and max (inclusive), rounded to 2 decimal places
 */
function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

/**
 * Get a random date within the current month
 */
function randomDateThisMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = Math.floor(Math.random() * Math.min(now.getDate(), 28)) + 1;
  const date = new Date(year, month, day);
  return date.toISOString().split("T")[0];
}

/**
 * Get a deterministic date for the nth day of the current month
 */
function dateOfMonth(day: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28));
  return date.toISOString().split("T")[0];
}

/**
 * Generate mock transactions based on user categories and income range
 */
function generateTransactions(
  categories: string[],
  incomeRange: string
): Transaction[] {
  const expenseTemplates = [
    { description: "Grocery shopping at Whole Foods", category: "Food & Dining", min: 45, max: 150 },
    { description: "Monthly rent payment", category: "Housing", min: 800, max: 2000 },
    { description: "Gas fill-up", category: "Transportation", min: 35, max: 70 },
    { description: "Netflix subscription", category: "Entertainment", min: 15, max: 20 },
    { description: "Electric bill", category: "Utilities", min: 80, max: 200 },
    { description: "Coffee shop visit", category: "Food & Dining", min: 4, max: 12 },
    { description: "Uber ride to work", category: "Transportation", min: 12, max: 30 },
    { description: "Dinner at Italian restaurant", category: "Food & Dining", min: 35, max: 85 },
    { description: "Amazon purchase", category: "Shopping", min: 20, max: 100 },
    { description: "Gym membership", category: "Healthcare", min: 30, max: 60 },
    { description: "Phone bill", category: "Utilities", min: 50, max: 90 },
    { description: "Online course subscription", category: "Education", min: 15, max: 50 },
    { description: "Movie tickets", category: "Entertainment", min: 15, max: 35 },
    { description: "Doctor copay", category: "Healthcare", min: 25, max: 50 },
    { description: "New running shoes", category: "Shopping", min: 60, max: 150 },
    { description: "Internet bill", category: "Utilities", min: 50, max: 80 },
    { description: "Spotify Premium", category: "Entertainment", min: 10, max: 15 },
    { description: "Lunch with coworkers", category: "Food & Dining", min: 12, max: 25 },
  ];

  // Filter to user's selected categories if available, otherwise use all
  const relevantExpenses =
    categories.length > 0
      ? expenseTemplates.filter((t) => categories.includes(t.category))
      : expenseTemplates;

  const templates =
    relevantExpenses.length >= 10 ? relevantExpenses : expenseTemplates;

  // Determine income amount based on income range
  const incomeMap: Record<string, number> = {
    "Under \u20B150,000": 40000,
    "\u20B150,000 - \u20B1100,000": 75000,
    "\u20B1100,000 - \u20B1150,000": 125000,
    "\u20B1150,000 - \u20B1200,000": 175000,
    "\u20B1200,000 - \u20B1300,000": 250000,
    "Over \u20B1300,000": 400000,
  };
  const monthlyIncome = incomeMap[incomeRange] || 75000;

  const transactions: Transaction[] = [];

  // Add income transactions (2-3)
  transactions.push({
    id: generateId(),
    type: "income",
    description: "Salary deposit",
    amount: monthlyIncome * 0.7,
    category: "Salary",
    date: dateOfMonth(1),
    isRecurring: true,
    recurringFrequency: "monthly",
    notes: "Primary paycheck",
  });

  transactions.push({
    id: generateId(),
    type: "income",
    description: "Salary deposit (2nd half)",
    amount: monthlyIncome * 0.3,
    category: "Salary",
    date: dateOfMonth(15),
    isRecurring: true,
    recurringFrequency: "monthly",
    notes: "Second paycheck of the month",
  });

  transactions.push({
    id: generateId(),
    type: "income",
    description: "Freelance web design project",
    amount: randomAmount(200, 800),
    category: "Freelance",
    date: randomDateThisMonth(),
    isRecurring: false,
  });

  // Add 15 expense transactions
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  const selectedExpenses = shuffled.slice(0, 15);

  for (const template of selectedExpenses) {
    const isRecurring =
      template.description.includes("subscription") ||
      template.description.includes("bill") ||
      template.description.includes("membership") ||
      template.description.includes("rent");

    transactions.push({
      id: generateId(),
      type: "expense",
      description: template.description,
      amount: randomAmount(template.min, template.max),
      category: template.category,
      date: randomDateThisMonth(),
      isRecurring,
      recurringFrequency: isRecurring ? "monthly" : undefined,
    });
  }

  return transactions;
}

/**
 * Generate default budgets based on user's selected categories
 */
function generateBudgets(categories: string[], incomeRange: string): Budget[] {
  const incomeMap: Record<string, number> = {
    "Under \u20B150,000": 40000,
    "\u20B150,000 - \u20B1100,000": 75000,
    "\u20B1100,000 - \u20B1150,000": 125000,
    "\u20B1150,000 - \u20B1200,000": 175000,
    "\u20B1200,000 - \u20B1300,000": 250000,
    "Over \u20B1300,000": 400000,
  };
  const income = incomeMap[incomeRange] || 75000;

  const defaultBudgets: { category: string; percentage: number }[] = [
    { category: "Food & Dining", percentage: 0.15 },
    { category: "Housing", percentage: 0.3 },
    { category: "Transportation", percentage: 0.1 },
    { category: "Entertainment", percentage: 0.05 },
    { category: "Shopping", percentage: 0.08 },
    { category: "Healthcare", percentage: 0.05 },
    { category: "Utilities", percentage: 0.08 },
    { category: "Education", percentage: 0.05 },
  ];

  // Pick 3-4 budgets that match user's categories, or defaults
  const userBudgets =
    categories.length > 0
      ? defaultBudgets.filter((b) => categories.includes(b.category))
      : defaultBudgets;

  const selected = userBudgets.slice(0, 4);
  if (selected.length < 3) {
    const remaining = defaultBudgets.filter(
      (b) => !selected.some((s) => s.category === b.category)
    );
    while (selected.length < 3 && remaining.length > 0) {
      selected.push(remaining.shift()!);
    }
  }

  return selected.map((b) => ({
    id: generateId(),
    category: b.category,
    limit: Math.round(income * b.percentage),
    period: "monthly" as const,
  }));
}

/**
 * Generate default savings goals
 */
function generateSavingsGoals(monthlySavingsTarget: string): SavingsGoal[] {
  const targetMap: Record<string, number> = {
    "\u20B15,000 - \u20B115,000": 10000,
    "\u20B115,000 - \u20B125,000": 20000,
    "\u20B125,000 - \u20B150,000": 37500,
    "\u20B150,000 - \u20B1100,000": 75000,
    "Over \u20B1100,000": 125000,
  };
  const monthlyTarget = targetMap[monthlySavingsTarget] || 20000;

  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  return [
    {
      id: generateId(),
      name: "Emergency Fund",
      targetAmount: monthlyTarget * 12,
      currentAmount: monthlyTarget * 2.5,
      deadline: oneYearFromNow.toISOString().split("T")[0],
      color: "#6366f1",
    },
    {
      id: generateId(),
      name: "Vacation Fund",
      targetAmount: monthlyTarget * 6,
      currentAmount: monthlyTarget * 1.2,
      deadline: sixMonthsFromNow.toISOString().split("T")[0],
      color: "#22c55e",
    },
  ];
}

/**
 * Generate common bills
 */
function generateBills(): Bill[] {
  const now = new Date();
  const currentMonth = now.toISOString().split("T")[0].slice(0, 7);

  return [
    {
      id: generateId(),
      name: "Rent / Mortgage",
      amount: 1200,
      dueDate: 1,
      frequency: "monthly",
      category: "Housing",
      isPaid: now.getDate() > 1,
      autoPay: true,
      lastPaidDate: now.getDate() > 1 ? `${currentMonth}-01` : undefined,
    },
    {
      id: generateId(),
      name: "Electric Bill",
      amount: 120,
      dueDate: 15,
      frequency: "monthly",
      category: "Utilities",
      isPaid: now.getDate() > 15,
      autoPay: false,
    },
    {
      id: generateId(),
      name: "Internet Service",
      amount: 65,
      dueDate: 20,
      frequency: "monthly",
      category: "Utilities",
      isPaid: now.getDate() > 20,
      autoPay: true,
    },
    {
      id: generateId(),
      name: "Streaming Services",
      amount: 35,
      dueDate: 10,
      frequency: "monthly",
      category: "Entertainment",
      isPaid: now.getDate() > 10,
      autoPay: true,
    },
  ];
}

/**
 * Main seed function - call this on dashboard first load.
 * Only seeds if no transaction data exists yet.
 */
export function seedDataIfEmpty(
  categories: string[],
  incomeRange: string,
  monthlySavingsTarget: string
): boolean {
  if (isAlreadySeeded()) {
    return false;
  }

  // Seed transactions
  const transactions = generateTransactions(categories, incomeRange);
  for (const t of transactions) {
    transactionStorage.create(t);
  }

  // Seed budgets
  const budgets = generateBudgets(categories, incomeRange);
  for (const b of budgets) {
    budgetStorage.create(b);
  }

  // Seed savings goals
  const goals = generateSavingsGoals(monthlySavingsTarget);
  for (const g of goals) {
    savingsGoalStorage.create(g);
  }

  // Seed bills
  const bills = generateBills();
  for (const bill of bills) {
    billStorage.create(bill);
  }

  return true;
}
