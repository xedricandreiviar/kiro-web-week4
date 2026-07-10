"use client";

import { useState, type FormEvent } from "react";

type FormStatus = "idle" | "loading" | "success" | "error";

export default function EmailSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    // Simulate async form submission
    setTimeout(() => {
      setStatus("success");
    }, 1500);
  }

  return (
    <section
      id="signup"
      className="w-full bg-primary-50 py-16 sm:py-20 lg:py-28"
      aria-labelledby="signup-heading"
    >
      <div className="mx-auto max-w-xl px-4 text-center sm:px-6 lg:px-8">
        <h2
          id="signup-heading"
          className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl"
        >
          Get early access
        </h2>
        <p className="mt-3 text-sm text-neutral-600 sm:text-base">
          Sign up to be notified when BudgetWise launches. No spam, just a
          single email when we are ready.
        </p>

        {status === "success" ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-8 rounded-lg bg-primary-100 p-6 text-primary-700"
          >
            <p className="text-lg font-medium">You are on the list!</p>
            <p className="mt-1 text-sm">
              We will let you know when BudgetWise is ready.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4"
          >
            <div className="flex-1">
              <label htmlFor="email-input" className="sr-only">
                Email address
              </label>
              <input
                id="email-input"
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") {
                    setStatus("idle");
                    setErrorMessage("");
                  }
                }}
                placeholder="you@example.com"
                required
                aria-describedby="email-status"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-400 sm:text-base"
                disabled={status === "loading"}
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center justify-center rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
            >
              {status === "loading" ? "Submitting..." : "Join Waitlist"}
            </button>
          </form>
        )}

        <div
          id="email-status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-3 min-h-[1.5rem]"
        >
          {status === "error" && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </section>
  );
}
