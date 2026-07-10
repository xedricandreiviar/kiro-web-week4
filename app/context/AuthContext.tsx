"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface OnboardingData {
  incomeRange: string;
  spendingCategories: string[];
  financialGoal: string;
  monthlySavingsTarget: string;
}

export interface User {
  email: string;
  name: string;
  onboarding?: OnboardingData;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password?: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "budgetwise_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as User;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  });
  const router = useRouter();

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = (email: string, _password?: string) => {
    // Check if a user with this email already exists in localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const existingUser = JSON.parse(stored) as User;
        if (existingUser.email === email) {
          setUser(existingUser);
          return;
        }
      } catch {
        // Ignore parse errors and create fresh user
      }
    }
    const newUser: User = {
      email,
      name: email.split("@")[0],
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
    router.push("/");
  };

  const updateProfile = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...data };
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
