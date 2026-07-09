import Link from "next/link";
import type { ReactNode } from "react";
import { requireIC } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireIC();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-title">Churchlife Photography Roster</span>
          <nav className="app-nav">
            <Link href="/availability">Availability</Link>
            <Link href="/crew">Crew</Link>
          </nav>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="link-button">
              Log out{session.fullName ? `, ${session.fullName}` : ""}
            </button>
          </form>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
