import Link from "next/link";
import { formatDateHuman } from "@photog-bot/shared";
import {
  cycleMonthLabel,
  getActiveCrew,
  getCurrentCycle,
  getDefaultDepartmentId,
  getResponsesForCycle,
  getServiceDates,
} from "@/lib/queries";

export default async function AvailabilityPage() {
  const departmentId = await getDefaultDepartmentId();
  const cycle = await getCurrentCycle(departmentId);

  if (!cycle) {
    return (
      <div className="empty-state">
        <h1>No cycle yet</h1>
        <p>
          A cycle is created automatically on the 1st of the month, along with a notification to
          crew. Check back then, or trigger the bot&apos;s cycle-open job manually.
        </p>
      </div>
    );
  }

  const [serviceDates, crew, responses] = await Promise.all([
    getServiceDates(cycle.id),
    getActiveCrew(departmentId, "crew"),
    getResponsesForCycle(cycle.id),
  ]);

  const responseMap = new Map(responses.map((r) => [`${r.personId}:${r.serviceDateId}`, r]));
  const isOpen = new Date(cycle.deadline_at).getTime() >= Date.now();

  const nonSubmitters = crew.filter((person) =>
    serviceDates.some((sd) => !responseMap.has(`${person.id}:${sd.id}`)),
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{cycleMonthLabel(cycle.cycle_month)}</h1>
          <p className="muted">
            {isOpen ? "Open" : "Closed"} · deadline {new Date(cycle.deadline_at).toLocaleString()}
          </p>
        </div>
        <a className="button" href="/api/export/csv">
          Export CSV
        </a>
      </div>

      {nonSubmitters.length > 0 && (
        <section className="card">
          <h2>Hasn&apos;t submitted yet ({nonSubmitters.length})</h2>
          <ul className="pill-list">
            {nonSubmitters.map((person) => (
              <li key={person.id}>{person.full_name}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Crew</th>
                {serviceDates.map((sd) => (
                  <th key={sd.id}>{formatDateHuman(sd.service_date)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crew.map((person) => (
                <tr key={person.id}>
                  <td>
                    <Link href={`/availability/${person.id}/history`}>{person.full_name}</Link>
                  </td>
                  {serviceDates.map((sd) => {
                    const response = responseMap.get(`${person.id}:${sd.id}`);
                    const label =
                      response === undefined ? "No response" : response.isAvailable ? "Available" : "Unavailable";
                    const className =
                      response === undefined ? "cell-none" : response.isAvailable ? "cell-yes" : "cell-no";
                    return (
                      <td key={sd.id} className={className} title={response?.note ?? undefined}>
                        {label}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {crew.length === 0 && (
                <tr>
                  <td colSpan={serviceDates.length + 1} className="muted">
                    No active crew yet — add people on the Crew page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
