import { NextResponse } from "next/server";
import { formatDateHuman } from "@photog-bot/shared";
import { requireIC } from "@/lib/auth";
import { getActiveCrew, getCurrentCycle, getDefaultDepartmentId, getResponsesForCycle, getServiceDates } from "@/lib/queries";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  await requireIC();

  const departmentId = await getDefaultDepartmentId();
  const cycle = await getCurrentCycle(departmentId);
  if (!cycle) {
    return NextResponse.json({ error: "No cycle to export" }, { status: 404 });
  }

  const [serviceDates, crew, responses] = await Promise.all([
    getServiceDates(cycle.id),
    getActiveCrew(departmentId, "crew"),
    getResponsesForCycle(cycle.id),
  ]);

  const responseMap = new Map(responses.map((r) => [`${r.personId}:${r.serviceDateId}`, r]));

  const header = ["Crew", ...serviceDates.map((sd) => formatDateHuman(sd.service_date))];
  const rows = crew.map((person) => [
    person.full_name,
    ...serviceDates.map((sd) => {
      const response = responseMap.get(`${person.id}:${sd.id}`);
      return response === undefined ? "No response" : response.isAvailable ? "Available" : "Unavailable";
    }),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="availability-${cycle.cycle_month}.csv"`,
    },
  });
}
