export const DEFAULT_DEPARTMENT_NAME = "Churchlife";

export const ROLES = ["crew", "ic"] as const;
export const REMINDER_TYPES = ["opening", "weekly_nudge"] as const;

// Day of month the availability window closes for the cycle being
// collected. See SPEC.md §14 (open item, defaulted for MVP).
export const CYCLE_DEADLINE_DAY_OF_MONTH = 15;

// Weekday(s) that count as a service date. 0 = Sunday (JS Date#getDay).
// See SPEC.md §14 (open item, defaulted for MVP).
export const SERVICE_WEEKDAYS = [0];
