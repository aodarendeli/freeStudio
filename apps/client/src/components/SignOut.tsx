import { redirect as redirectExternal } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@repo/ui/Button";
import { auth, signOut } from "@/auth";
import { redirect } from "@/i18n/navigation";

export async function SignOut() {
  const session = await auth();
  const idToken = session?.idToken;
  const t = await getTranslations("common");
  const locale = await getLocale();

  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirect: false });

        const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
        const postLogoutRedirectUri = process.env.AUTH_URL ?? "http://localhost:3000";

        if (issuer && idToken) {
          const logoutUrl = new URL(`${issuer}/protocol/openid-connect/logout`);
          logoutUrl.searchParams.set("id_token_hint", idToken);
          logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
          redirectExternal(logoutUrl.toString());
        }

        redirect({ href: "/", locale });
      }}
    >
      <Button type="submit" variant="destructive">
        {t("signOut")}
      </Button>
    </form>
  );
}
