import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full border-b border-neutral-200 bg-white">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <Link href="/" className="text-xl font-bold text-primary-600 sm:text-2xl">
          BudgetWise
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-primary-500 px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          >
            Log In
          </Link>
          <a
            href="#signup"
            className="inline-flex items-center rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          >
            Get Early Access
          </a>
        </div>
      </nav>
    </header>
  );
}
