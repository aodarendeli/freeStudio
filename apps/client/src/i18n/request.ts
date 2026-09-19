import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import type { Locale } from "@repo/i18n/config";

const messagesLoaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  tr: () => import("@repo/i18n/messages/tr.json"),
  en: () => import("@repo/i18n/messages/en.json"),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const messages = (await messagesLoaders[locale]()).default;

  return { locale, messages };
});
