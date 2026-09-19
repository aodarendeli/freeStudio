import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import type { ProjectKey } from "@/lib/projects";

const NAV_ITEMS = [
  {
    href: "/menu-items",
    label: "Menü Yönetimi",
    description: "Site navigasyonu",
    icon: MenuIcon,
  },
  {
    href: "/seo",
    label: "SEO Yönetimi",
    description: "Sayfa meta bilgileri",
    icon: SeoIcon,
  },
];

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function SeoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function initialsOf(label: string) {
  return label.trim().slice(0, 2).toUpperCase() || "?";
}

export function AdminShell({
  active,
  currentProject,
  title,
  description,
  userLabel,
  children,
}: {
  active: "menu-items" | "seo";
  currentProject: ProjectKey;
  title: string;
  description?: string;
  userLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background font-sans">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            F
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Freedarendeli</p>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        <div className="border-b border-border">
          <ProjectSwitcher current={currentProject} />
        </div>

        <nav className="flex flex-col gap-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === `/${active}`;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={`${item.href}?project=${currentProject}`}
                className={
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors " +
                  (isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary")
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="flex flex-col">
                  <span className="font-medium leading-tight">{item.label}</span>
                  <span
                    className={
                      "text-xs leading-tight " +
                      (isActive ? "text-primary-foreground/80" : "text-muted-foreground")
                    }
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 border-t border-border px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {initialsOf(userLabel)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{userLabel}</p>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <header className="border-b border-border px-8 py-5">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </header>

        <main className="px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
