import type { AvailabilityCycle, Person, Role, ServiceDate } from "@photog-bot/shared";
import { supabase } from "./supabase";

/** MVP has a single department; grabs the first one. Not hardcoded further up the stack (see SPEC.md §2). */
export async function getDefaultDepartmentId(): Promise<string> {
  const { data, error } = await supabase
    .from("departments")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error) throw error;
  return data.id;
}

export async function getCurrentCycle(departmentId: string): Promise<AvailabilityCycle | null> {
  const { data, error } = await supabase
    .from("availability_cycles")
    .select("*")
    .eq("department_id", departmentId)
    .order("cycle_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPastCycles(departmentId: string): Promise<AvailabilityCycle[]> {
  const { data, error } = await supabase
    .from("availability_cycles")
    .select("*")
    .eq("department_id", departmentId)
    .lt("deadline_at", new Date().toISOString())
    .order("cycle_month", { ascending: false });
  if (error) throw error;
  return data ?? [];
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

export async function getActiveCrew(departmentId: string, role?: Role): Promise<Person[]> {
  let query = supabase
    .from("people")
    .select("*")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .order("full_name");
  if (role) query = query.eq("role", role);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPerson(personId: string): Promise<Person | null> {
  const { data, error } = await supabase.from("people").select("*").eq("id", personId).maybeSingle();
  if (error) throw error;
  return data;
}

export interface GridResponse {
  personId: string;
  serviceDateId: string;
  isAvailable: boolean;
  note: string | null;
}

export async function getResponsesForCycle(cycleId: string): Promise<GridResponse[]> {
  const { data, error } = await supabase
    .from("availability_responses")
    .select("person_id, service_date_id, is_available, note")
    .eq("cycle_id", cycleId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    personId: r.person_id,
    serviceDateId: r.service_date_id,
    isAvailable: r.is_available,
    note: r.note,
  }));
}

export async function getPersonResponses(personId: string, cycleId: string) {
  const { data, error } = await supabase
    .from("availability_responses")
    .select("*")
    .eq("person_id", personId)
    .eq("cycle_id", cycleId);
  if (error) throw error;
  return data ?? [];
}

export function cycleMonthLabel(cycleMonth: string): string {
  const [year, month] = cycleMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
