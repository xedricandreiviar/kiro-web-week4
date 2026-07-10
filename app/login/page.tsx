"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login(email, password);

    // Check if returning user already has onboarding data in localStorage
    const STORAGE_KEY = "budgetwise_user";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const existingUser = JSON.parse(stored);
        if (existingUser.email === email && existingUser.onboarding) {
          router.push("/dashboard");
          return;
        }
      } catch {
        // Fall through to onboarding
      }
    }
    router.push("/onboarding");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary-700">Welcome to BudgetWise</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Log in to manage your finances
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="Enter any password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          >
            Log In
          </button>
        </form>

        <footer className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            &larr; Back to home
          </Link>
        </footer>
      </section>
    </main>
  );
}
