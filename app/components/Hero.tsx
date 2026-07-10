export default function Hero() {
  return (
    <section className="w-full bg-primary-50 py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
          Track your spending, take control of your budget
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-neutral-600 sm:mt-6 sm:text-lg lg:text-xl">
          BudgetWise lets you log every transaction, categorize your expenses,
          and set spending limits by category so you always know exactly where
          your money goes.
        </p>
        <a
          href="#signup"
          className="mt-8 inline-flex items-center rounded-lg bg-primary-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 sm:mt-10 sm:px-8 sm:py-4 sm:text-lg"
        >
          Join the Waitlist
        </a>
      </div>
    </section>
  );
}
