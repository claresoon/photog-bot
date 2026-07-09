import { requireIC } from "@/lib/auth";
import { getDefaultDepartmentId } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { addPerson, regenerateInviteCode, setPersonActive, updatePerson } from "./actions";

async function getAllPeople(departmentId: string) {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("department_id", departmentId)
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export default async function CrewPage() {
  await requireIC();
  const departmentId = await getDefaultDepartmentId();
  const people = await getAllPeople(departmentId);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  return (
    <div>
      <div className="page-header">
        <h1>Crew</h1>
      </div>

      <section className="card">
        <h2>Add person</h2>
        <form action={addPerson} className="form-row">
          <input name="fullName" placeholder="Full name" required />
          <input name="telegramHandle" placeholder="Telegram handle (no @)" />
          <select name="role" defaultValue="crew">
            <option value="crew">Crew</option>
            <option value="ic">IC</option>
          </select>
          <button type="submit">Add</button>
        </form>
      </section>

      <section className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name / handle / role</th>
                <th>Status</th>
                <th>Invite link</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>
                    <form action={updatePerson} className="inline-form">
                      <input type="hidden" name="id" value={person.id} />
                      <input name="fullName" defaultValue={person.full_name} required />
                      <input name="telegramHandle" defaultValue={person.telegram_handle ?? ""} placeholder="handle" />
                      <select name="role" defaultValue={person.role}>
                        <option value="crew">Crew</option>
                        <option value="ic">IC</option>
                      </select>
                      <button type="submit">Save</button>
                    </form>
                  </td>
                  <td>{person.is_active ? "Active" : "Inactive"}</td>
                  <td>
                    {person.telegram_id ? (
                      <span className="muted">Linked</span>
                    ) : (
                      <>
                        {person.invite_code && botUsername && (
                          <code className="invite-link">{`https://t.me/${botUsername}?start=${person.invite_code}`}</code>
                        )}
                        <form action={regenerateInviteCode}>
                          <input type="hidden" name="id" value={person.id} />
                          <button type="submit" className="link-button">
                            {person.invite_code ? "Regenerate" : "Generate"} invite link
                          </button>
                        </form>
                      </>
                    )}
                  </td>
                  <td>
                    <form action={setPersonActive}>
                      <input type="hidden" name="id" value={person.id} />
                      <input type="hidden" name="isActive" value={(!person.is_active).toString()} />
                      <button type="submit" className="link-button">
                        {person.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No one added yet.
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
