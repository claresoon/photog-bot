import {
  cycleDeadlineAt,
  cycleOpensAt,
  isCycleOpen,
  serviceDatesForMonth,
  toDateOnlyString,
} from "@photog-bot/shared";
import type { AvailabilityCycle, ServiceDate } from "@photog-bot/shared";
import { supabase } from "./supabase.js";

/** The single currently-open cycle for a department, if any (deadline not yet passed). */
export async function getOpenCycle(departmentId: string): Promise<AvailabilityCycle | null> {
  const { data, error } = await supabase
    .from("availability_cycles")
    .select("*")
    .eq("department_id", departmentId)
    .order("cycle_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return isCycleOpen(data.deadline_at) ? data : null;
}

export async function getServiceDates(cycleId: string): Promise<ServiceDate[]> {
  const { data, error } = await supabase
    .from("service_dates")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("service_date");
  if (error) throw error;
  return data ?? [];
}

/** Idempotent: creates the cycle + its service dates if they don't already exist for that month. */
export async function ensureCycleForMonth(
  departmentId: string,
  cycleMonth: Date,
): Promise<AvailabilityCycle> {
  const cycleMonthStr = toDateOnlyString(cycleMonth);

  const { data: existing, error: existingError } = await supabase
    .from("availability_cycles")
    .select("*")
    .eq("department_id", departmentId)
    .eq("cycle_month", cycleMonthStr)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: cycle, error } = await supabase
    .from("availability_cycles")
    .insert({
      department_id: departmentId,
      cycle_month: cycleMonthStr,
      opens_at: cycleOpensAt(cycleMonth).toISOString(),
      deadline_at: cycleDeadlineAt(cycleMonth).toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  const dates = serviceDatesForMonth(cycleMonth);
  if (dates.length) {
    const { error: serviceDatesError } = await supabase
      .from("service_dates")
      .insert(dates.map((d) => ({ cycle_id: cycle.id, service_date: toDateOnlyString(d) })));
    if (serviceDatesError) throw serviceDatesError;
  }

  return cycle;
}
