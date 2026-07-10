"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Transactions", href: "/dashboard/transactions", icon: "💸" },
  { label: "Budgets", href: "/dashboard/budgets", icon: "📋" },
  { label: "Income", href: "/dashboard/income", icon: "💰" },
  { label: "Savings Goals", href: "/dashboard/savings", icon: "🎯" },
  { label: "Bills & Recurring", href: "/dashboard/bills", icon: "🔄" },
  { label: "Reports", href: "/dashboard/reports", icon: "📈" },
  { label: "Net Worth", href: "/dashboard/net-worth", icon: "🏦" },
  { label: "Debts", href: "/dashboard/debts", icon: "💳" },
  { label: "Calendar", href: "/dashboard/calendar", icon: "📅" },
  { label: "Insights", href: "/dashboard/insights", icon: "💡" },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full border-b border-neutral-200 bg-white lg:w-64 lg:border-b-0 lg:border-r lg:min-h-screen">
        <div className="flex items-center justify-between px-4 py-4 lg:flex-col lg:items-start lg:gap-6 lg:px-6 lg:py-6">
          <Link href="/" className="text-xl font-bold text-primary-600">
            BudgetWise
          </Link>
          <nav className="hidden lg:block lg:w-full" aria-label="Dashboard navigation">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-primary-50 text-primary-700"
                        : "text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        {/* Mobile navigation */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-primary-50 text-primary-700"
                  : "text-neutral-600 hover:bg-primary-50 hover:text-primary-700"
              }`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top header */}
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
          <p className="text-sm text-neutral-600">
            Hello, <span className="font-medium text-neutral-900">{user?.name || "User"}</span>
          </p>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            Log Out
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
