import { getTranslations } from "next-intl/server";
import { Button } from "@repo/ui/Button";
import { signIn } from "@/auth";

export async function SignIn() {
  const t = await getTranslations("common");

  return (
    <form
      action={async () => {
        "use server";
        await signIn("keycloak");
      }}
    >
      <Button type="submit">{t("signIn")}</Button>
    </form>
  );
}
