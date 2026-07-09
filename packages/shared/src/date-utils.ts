import { CYCLE_DEADLINE_DAY_OF_MONTH, SERVICE_WEEKDAYS } from "./constants.js";

/** First day of the month N months after `from` (defaults to now), at UTC midnight. */
export function firstOfNextMonth(from: Date = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
}

/**
 * Cycle opens the 1st of the month *before* the one being planned for
 * (e.g. cycleMonth = 2026-08-01 → opens = 2026-07-01), matching
 * cycleDeadlineAt below.
 */
export function cycleOpensAt(cycleMonth: Date): Date {
  return new Date(Date.UTC(cycleMonth.getUTCFullYear(), cycleMonth.getUTCMonth() - 1, 1));
}

/**
 * Deadline for a cycle: CYCLE_DEADLINE_DAY_OF_MONTH of the month *before*
 * the one being planned (cycle opens 1st of that month, gives ~2 weeks).
 * e.g. cycleMonth = 2026-08-01 → deadline = 2026-07-15 23:59:59 UTC.
 */
export function cycleDeadlineAt(cycleMonth: Date): Date {
  const priorMonth = new Date(
    Date.UTC(cycleMonth.getUTCFullYear(), cycleMonth.getUTCMonth() - 1, CYCLE_DEADLINE_DAY_OF_MONTH),
  );
  return new Date(
    Date.UTC(
      priorMonth.getUTCFullYear(),
      priorMonth.getUTCMonth(),
      priorMonth.getUTCDate(),
      23,
      59,
      59,
    ),
  );
}

/** All service dates (per SERVICE_WEEKDAYS) within the given month. */
export function serviceDatesForMonth(cycleMonth: Date): Date[] {
  const year = cycleMonth.getUTCFullYear();
  const month = cycleMonth.getUTCMonth();
  const dates: Date[] = [];
  const cursor = new Date(Date.UTC(year, month, 1));
  while (cursor.getUTCMonth() === month) {
    if ((SERVICE_WEEKDAYS as readonly number[]).includes(cursor.getUTCDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function isCycleOpen(deadlineAt: string | Date, now: Date = new Date()): boolean {
  const deadline = typeof deadlineAt === "string" ? new Date(deadlineAt) : deadlineAt;
  return now.getTime() <= deadline.getTime();
}

export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDateHuman(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
