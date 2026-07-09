import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cycleMonthLabel,
  getDefaultDepartmentId,
  getPastCycles,
  getPerson,
  getPersonResponses,
  getServiceDates,
} from "@/lib/queries";

export default async function PersonHistoryPage({ params }: { params: { personId: string } }) {
  const person = await getPerson(params.personId);
  if (!person) notFound();

  const departmentId = await getDefaultDepartmentId();
  const pastCycles = await getPastCycles(departmentId);

  const rows = await Promise.all(
    pastCycles.map(async (cycle) => {
      const [serviceDates, responses] = await Promise.all([
        getServiceDates(cycle.id),
        getPersonResponses(person.id, cycle.id),
      ]);
      const availableCount = responses.filter((r) => r.is_available).length;
      return {
        cycle,
        totalServiceDates: serviceDates.length,
        respondedCount: responses.length,
        availableCount,
      };
    }),
  );

  return (
    <div>
      <p>
        <Link href="/availability">&larr; Back to current cycle</Link>
      </p>
      <h1>{person.full_name}</h1>
      <p className="muted">
        {person.role === "ic" ? "IC" : "Crew"} ·{" "}
        {person.telegram_handle ? `@${person.telegram_handle}` : "no handle on file"}
      </p>

      <section className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cycle</th>
                <th>Submitted</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ cycle, totalServiceDates, respondedCount, availableCount }) => (
                <tr key={cycle.id}>
                  <td>{cycleMonthLabel(cycle.cycle_month)}</td>
                  <td>
                    {respondedCount === 0
                      ? "Did not submit"
                      : respondedCount < totalServiceDates
                        ? `Partial (${respondedCount}/${totalServiceDates})`
                        : "Full"}
                  </td>
                  <td>{respondedCount > 0 ? `${availableCount}/${respondedCount}` : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No past cycles yet.
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
