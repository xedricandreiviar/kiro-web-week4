export default function Features() {
  return (
    <section
      id="features"
      className="w-full py-16 sm:py-20 lg:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          id="features-heading"
          className="text-center text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl"
        >
          What you get with BudgetWise
        </h2>
        <div className="mt-10 grid gap-8 sm:mt-12 md:grid-cols-2 lg:gap-12">
          <article className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-neutral-900 sm:text-xl">
              Expense Tracking
            </h3>
            <p className="mt-3 text-sm text-neutral-600 sm:text-base">
              Log each transaction as it happens and assign it to a category.
              View a running list of where your money went, filtered by date or
              category, so you spot patterns without digging through bank
              statements.
            </p>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-neutral-900 sm:text-xl">
              Budgeting
            </h3>
            <p className="mt-3 text-sm text-neutral-600 sm:text-base">
              Set a monthly spending limit for each category and track your
              progress in real time. When you approach or exceed a limit,
              BudgetWise flags it immediately so you can adjust before the month
              ends.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
