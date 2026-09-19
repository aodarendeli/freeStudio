import { getTranslations } from "next-intl/server";
import { Badge } from "@repo/ui/Badge";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { SignIn } from "@/components/SignIn";
import { SignOut } from "@/components/SignOut";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

function initialsOf(name?: string | null, email?: string | null) {
  const source = name ?? email ?? "?";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function Home() {
  const session = await auth();
  const t = await getTranslations("home");
  const tCategories = await getTranslations("categories");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans">
      <main className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Freedarendeli
        </p>
        <h1 className="mt-1 text-xl font-semibold text-foreground">{t("title")}</h1>

        {session?.user ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initialsOf(session.user.name, session.user.email)}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {session.user.name ?? session.user.email}
              </p>
              {session.user.email && session.user.name && (
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              )}
            </div>

            {session.roles.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {session.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            )}

            <Link
              href="/categories"
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              {tCategories("title")}
            </Link>
            <SignOut />
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">{t("loginPrompt")}</p>
            <SignIn />
          </div>
        )}

        <div className="mt-8 border-t border-border pt-4">
          <ThemeSwitcher />
        </div>
      </main>
    </div>
  );
}
