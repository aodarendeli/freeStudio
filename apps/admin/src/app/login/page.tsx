import { signIn } from "@/auth";
import { Button } from "@repo/ui/Button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hasError = params.error !== undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans">
      <main className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Freedarendeli</p>
        <h1 className="mt-1 text-xl font-semibold text-foreground">Admin Panel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Menü ve SEO yönetimi için giriş yapman gerekiyor.
        </p>

        {hasError && (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Giriş başarısız oldu. Bu panele erişmek için admin rolüne sahip olman gerekiyor.
          </p>
        )}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("keycloak", { redirectTo: "/" });
          }}
        >
          <Button type="submit" className="w-full">
            Keycloak ile giriş yap
          </Button>
        </form>
      </main>
    </div>
  );
}
