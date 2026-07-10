// Centralized localStorage service with typed getters/setters for all data entities

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Transaction {
  id: string;
  type: "expense" | "income";
  description: string;
  amount: number;
  category: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency?: "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  notes?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: "monthly" | "weekly";
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: number;
  frequency: "monthly" | "quarterly" | "yearly";
  category: string;
  isPaid: boolean;
  autoPay: boolean;
  lastPaidDate?: string;
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: number;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  type: "cash" | "investment" | "property" | "vehicle" | "other";
}

export interface Liability {
  id: string;
  name: string;
  amount: number;
  type: "mortgage" | "car_loan" | "student_loan" | "credit_card" | "other";
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  transactions: "budgetwise_transactions",
  budgets: "budgetwise_budgets",
  savingsGoals: "budgetwise_savings_goals",
  bills: "budgetwise_bills",
  debts: "budgetwise_debts",
  assets: "budgetwise_assets",
  liabilities: "budgetwise_liabilities",
} as const;

// ============================================================================
// Generic Storage Helpers
// ============================================================================

function safeGetItem<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as T[];
  } catch {
    return [];
  }
}

function safeSetItem<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or other error - fail silently
  }
}

function createEntity<T extends { id: string }>(key: string, entity: T): T {
  const items = safeGetItem<T>(key);
  items.push(entity);
  safeSetItem(key, items);
  return entity;
}

function updateEntity<T extends { id: string }>(key: string, id: string, updates: Partial<T>): T | null {
  const items = safeGetItem<T>(key);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates };
  safeSetItem(key, items);
  return items[index];
}

function deleteEntity<T extends { id: string }>(key: string, id: string): boolean {
  const items = safeGetItem<T>(key);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  safeSetItem(key, filtered);
  return true;
}

function getEntityById<T extends { id: string }>(key: string, id: string): T | null {
  const items = safeGetItem<T>(key);
  return items.find((item) => item.id === id) || null;
}

// ============================================================================
// Transaction Storage
// ============================================================================

export const transactionStorage = {
  getAll(): Transaction[] {
    return safeGetItem<Transaction>(STORAGE_KEYS.transactions);
  },

  getById(id: string): Transaction | null {
    return getEntityById<Transaction>(STORAGE_KEYS.transactions, id);
  },

  create(transaction: Transaction): Transaction {
    return createEntity<Transaction>(STORAGE_KEYS.transactions, transaction);
  },

  update(id: string, updates: Partial<Transaction>): Transaction | null {
    return updateEntity<Transaction>(STORAGE_KEYS.transactions, id, updates);
  },

  delete(id: string): boolean {
    return deleteEntity<Transaction>(STORAGE_KEYS.transactions, id);
  },

  getByDateRange(startDate: string, endDate: string): Transaction[] {
    const all = safeGetItem<Transaction>(STORAGE_KEYS.transactions);
    return all.filter((t) => t.date >= startDate && t.date <= endDate);
  },

  getByCategory(category: string): Transaction[] {
    const all = safeGetItem<Transaction>(STORAGE_KEYS.transactions);
    return all.filter((t) => t.category === category);
  },

  getByType(type: "expense" | "income"): Transaction[] {
    const all = safeGetItem<Transaction>(STORAGE_KEYS.transactions);
    return all.filter((t) => t.type === type);
  },
};

// ============================================================================
// Budget Storage
// ============================================================================

export const budgetStorage = {
  getAll(): Budget[] {
    return safeGetItem<Budget>(STORAGE_KEYS.budgets);
  },

  getById(id: string): Budget | null {
    return getEntityById<Budget>(STORAGE_KEYS.budgets, id);
  },

  create(budget: Budget): Budget {
    return createEntity<Budget>(STORAGE_KEYS.budgets, budget);
  },

  update(id: string, updates: Partial<Budget>): Budget | null {
    return updateEntity<Budget>(STORAGE_KEYS.budgets, id, updates);
  },

  delete(id: string): boolean {
    return deleteEntity<Budget>(STORAGE_KEYS.budgets, id);
  },
};

// ============================================================================
// Savings Goal Storage
// ============================================================================

export const savingsGoalStorage = {
  getAll(): SavingsGoal[] {
    return safeGetItem<SavingsGoal>(STORAGE_KEYS.savingsGoals);
  },

  getById(id: string): SavingsGoal | null {
    return getEntityById<SavingsGoal>(STORAGE_KEYS.savingsGoals, id);
  },

  create(goal: SavingsGoal): SavingsGoal {
    return createEntity<SavingsGoal>(STORAGE_KEYS.savingsGoals, goal);
  },

  update(id: string, updates: Partial<SavingsGoal>): SavingsGoal | null {
    return updateEntity<SavingsGoal>(STORAGE_KEYS.savingsGoals, id, updates);
  },

  delete(id: string): boolean {
    return deleteEntity<SavingsGoal>(STORAGE_KEYS.savingsGoals, id);
  },
};

// ============================================================================
// Bill Storage
// ============================================================================

export const billStorage = {
  getAll(): Bill[] {
    return safeGetItem<Bill>(STORAGE_KEYS.bills);
  },

  getById(id: string): Bill | null {
    return getEntityById<Bill>(STORAGE_KEYS.bills, id);
  },

  create(bill: Bill): Bill {
    return createEntity<Bill>(STORAGE_KEYS.bills, bill);
  },

  update(id: string, updates: Partial<Bill>): Bill | null {
    return updateEntity<Bill>(STORAGE_KEYS.bills, id, updates);
  },

  delete(id: string): boolean {
    return deleteEntity<Bill>(STORAGE_KEYS.bills, id);
  },
};

// ============================================================================
// Debt Storage
// ============================================================================

export const debtStorage = {
  getAll(): Debt[] {
    return safeGetItem<Debt>(STORAGE_KEYS.debts);
  },

  getById(id: string): Debt | null {
    return getEntityById<Debt>(STORAGE_KEYS.debts, id);
  },

  create(debt: Debt): Debt {
    return createEntity<Debt>(STORAGE_KEYS.debts, debt);
  },

  update(id: string, updates: Partial<Debt>): Debt | null {
    return updateEntity<Debt>(STORAGE_KEYS.debts, id, updates);
  },

  delete(id: string): boolean {
    return deleteEntity<Debt>(STORAGE_KEYS.debts, id);
  },
};

// ============================================================================
// Asset Storage
// ============================================================================

export const assetStorage = {
  getAll(): Asset[] {
    return safeGetItem<Asset>(STORAGE_KEYS.assets);
  },

  getById(id: string): Asset | null {
    return getEntityById<Asset>(STORAGE_KEYS.assets, id);
  },

  create(asset: Asset): Asset {
    return createEntity<Asset>(STORAGE_KEYS.assets, asset);
  },

  update(id: string, updates: Partial<Asset>): Asset | null {
    return updateEntity<Asset>(STORAGE_KEYS.assets, id, updates);
  },

  delete(id: string): boolean {
    return deleteEntity<Asset>(STORAGE_KEYS.assets, id);
  },
};

// ============================================================================
// Liability Storage
// ============================================================================

export const liabilityStorage = {
  getAll(): Liability[] {
    return safeGetItem<Liability>(STORAGE_KEYS.liabilities);
  },

  getById(id: string): Liability | null {
    return getEntityById<Liability>(STORAGE_KEYS.liabilities, id);
  },

  create(liability: Liability): Liability {
    return createEntity<Liability>(STORAGE_KEYS.liabilities, liability);
  },

  update(id: string, updates: Partial<Liability>): Liability | null {
    return updateEntity<Liability>(STORAGE_KEYS.liabilities, id, updates);
  },

  delete(id: string): boolean {
    return deleteEntity<Liability>(STORAGE_KEYS.liabilities, id);
  },
};
