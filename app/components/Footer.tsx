export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-neutral-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-neutral-500">
            &copy; {currentYear} BudgetWise. All rights reserved.
          </p>
          <nav aria-label="Footer navigation">
            <ul className="flex gap-6">
              <li>
                <a
                  href="#features"
                  className="text-sm text-neutral-500 transition-colors hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 rounded"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#signup"
                  className="text-sm text-neutral-500 transition-colors hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 rounded"
                >
                  Sign Up
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
