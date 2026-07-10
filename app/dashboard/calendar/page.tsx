"use client";

import { useState, useMemo } from "react";
import {
  billStorage,
  transactionStorage,
  savingsGoalStorage,
  Bill,
  Transaction,
  SavingsGoal,
} from "../../lib/storage";
import { formatCurrency } from "../../lib/utils";

interface CalendarEvent {
  type: "bill" | "income" | "goal";
  name: string;
  amount?: number;
}

function loadData() {
  if (typeof window === "undefined") return { bills: [] as Bill[], transactions: [] as Transaction[], goals: [] as SavingsGoal[] };
  return {
    bills: billStorage.getAll(),
    transactions: transactionStorage.getAll(),
    goals: savingsGoalStorage.getAll(),
  };
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [data] = useState(loadData);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const recurringIncome = useMemo(
    () => data.transactions.filter((t) => t.type === "income" && t.isRecurring),
    [data.transactions]
  );

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    return days;
  }, [currentMonth, currentYear]);

  // Pre-compute events for all days of the month in a single pass
  const eventsMap = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const map = new Map<number, CalendarEvent[]>();

    for (let day = 1; day <= daysInMonth; day++) {
      const events: CalendarEvent[] = [];

      // Bills due on this day of month
      data.bills.forEach((bill) => {
        if (bill.dueDate === day) {
          events.push({ type: "bill", name: bill.name, amount: bill.amount });
        }
      });

      // Recurring income on this day
      recurringIncome.forEach((t) => {
        const tDate = new Date(t.date);
        const frequency = t.recurringFrequency;

        if (frequency === "monthly" || frequency === "yearly") {
          if (tDate.getDate() === day) {
            events.push({ type: "income", name: t.description, amount: t.amount });
          }
        } else if (frequency === "weekly") {
          const cellDate = new Date(currentYear, currentMonth, day);
          if (cellDate.getDay() === tDate.getDay()) {
            events.push({ type: "income", name: t.description, amount: t.amount });
          }
        } else if (frequency === "biweekly") {
          const cellDate = new Date(currentYear, currentMonth, day);
          const diffDays = Math.round((cellDate.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays % 14 === 0) {
            events.push({ type: "income", name: t.description, amount: t.amount });
          }
        } else {
          if (tDate.getDate() === day) {
            events.push({ type: "income", name: t.description, amount: t.amount });
          }
        }
      });

      // Savings goal deadlines
      data.goals.forEach((goal) => {
        const deadline = new Date(goal.deadline);
        if (deadline.getFullYear() === currentYear && deadline.getMonth() === currentMonth && deadline.getDate() === day) {
          events.push({ type: "goal", name: goal.name, amount: goal.targetAmount });
        }
      });

      if (events.length > 0) {
        map.set(day, events);
      }
    }

    return map;
  }, [currentMonth, currentYear, data.bills, recurringIncome, data.goals]);

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const selectedDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return eventsMap.get(selectedDay) || [];
  }, [selectedDay, eventsMap]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };

  const monthYearLabel = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <section className="p-4 sm:p-6 lg:p-8" aria-labelledby="calendar-heading">
      <header className="mb-6">
        <h1 id="calendar-heading" className="text-2xl font-bold text-neutral-900">
          Financial Calendar
        </h1>
        <p className="mt-1 text-sm text-neutral-500">See your bills, income, and deadlines at a glance.</p>
      </header>

      {/* Month navigation */}
      <nav aria-label="Month navigation" className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          &larr; Previous
        </button>
        <h2 className="text-lg font-semibold text-neutral-900">{monthYearLabel}</h2>
        <button
          type="button"
          onClick={goToNextMonth}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Next &rarr;
        </button>
      </nav>

      {/* Calendar grid */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-16 sm:h-20" />;
            }

            const events = eventsMap.get(day) || [];
            const hasBill = events.some((e) => e.type === "bill");
            const hasIncome = events.some((e) => e.type === "income");
            const hasGoal = events.some((e) => e.type === "goal");
            const isTodayCell = isToday(day);
            const isSelected = selectedDay === day;

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`relative flex h-16 sm:h-20 flex-col items-center rounded-lg border p-1 text-sm transition-colors ${
                  isSelected
                    ? "border-primary-400 bg-primary-50"
                    : isTodayCell
                    ? "border-primary-200 bg-primary-50/50"
                    : "border-neutral-100 hover:bg-neutral-50"
                }`}
                aria-label={`${monthYearLabel} ${day}${events.length > 0 ? `, ${events.length} events` : ""}`}
              >
                <span
                  className={`text-xs font-medium ${
                    isTodayCell ? "rounded-full bg-primary-500 px-1.5 py-0.5 text-white" : "text-neutral-800"
                  }`}
                >
                  {day}
                </span>
                {/* Event dots */}
                <div className="mt-auto flex gap-1">
                  {hasBill && <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />}
                  {hasIncome && <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />}
                  {hasGoal && <span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <aside aria-label="Calendar legend" className="mb-6 flex flex-wrap gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500" aria-hidden="true" />
          <span className="text-sm text-neutral-600">Bills Due</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500" aria-hidden="true" />
          <span className="text-sm text-neutral-600">Income Expected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-orange-500" aria-hidden="true" />
          <span className="text-sm text-neutral-600">Savings Goal Deadline</span>
        </div>
      </aside>

      {/* Selected day detail */}
      <section aria-label="Selected day details" className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {selectedDay !== null
            ? `Events for ${monthYearLabel.split(" ")[0]} ${selectedDay}`
            : "Select a day to see details"}
        </h2>
        {selectedDay === null ? (
          <p className="text-sm text-neutral-500">Click on a day in the calendar above to view its financial events.</p>
        ) : selectedDayEvents.length === 0 ? (
          <p className="text-sm text-neutral-500">No financial events on this day.</p>
        ) : (
          <ul className="space-y-3">
            {selectedDayEvents.map((event, idx) => (
              <li key={idx} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    event.type === "bill"
                      ? "bg-blue-100 text-blue-700"
                      : event.type === "income"
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                  aria-hidden="true"
                >
                  {event.type === "bill" ? "📄" : event.type === "income" ? "💰" : "🎯"}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-800">{event.name}</p>
                  <p className="text-xs text-neutral-500">
                    {event.type === "bill" ? "Bill Due" : event.type === "income" ? "Expected Income" : "Goal Deadline"}
                  </p>
                </div>
                {event.amount !== undefined && (
                  <span className="text-sm font-semibold text-neutral-900">{formatCurrency(event.amount)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
