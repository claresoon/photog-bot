import { redirect } from "next/navigation";
import { getSession } from "./session";

/** Guards a page/action/route to signed-in ICs only; redirects to /login otherwise. */
export async function requireIC() {
  const session = await getSession();
  if (!session.personId || session.role !== "ic") {
    redirect("/login");
  }
  return session;
}
