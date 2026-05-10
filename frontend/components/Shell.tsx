import Link from "next/link";

const items = [
  ["dashboard", "/dashboard", "Dashboard"],
  ["quiz", "/quiz", "Quiz"],
  ["tutor", "/tutor", "Tutor"],
  ["auth", "/auth", "Auth"],
] as const;

export function Shell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Adaptive Prep</strong>
          <span>Learning optimization engine</span>
        </div>
        <nav className="nav" aria-label="Primary">
          {items.map(([key, href, label]) => (
            <Link className={active === key ? "active" : ""} href={href} key={key}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="main">{children}</div>
    </main>
  );
}
