import english from "./locales/en.json" with { type: "json" };
import greek from "./locales/el.json" with { type: "json" };

export const supportedLocales = ["en", "el"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export type TranslationKey = keyof typeof english;

export const localeCatalogs: Readonly<
  Record<SupportedLocale, Readonly<Record<TranslationKey, string>>>
> = {
  en: english,
  el: greek,
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

export function resolveLocale(value: string | null | undefined): SupportedLocale {
  return value !== undefined && value !== null && isSupportedLocale(value)
    ? value
    : "en";
}

export function translate(
  locale: SupportedLocale,
  key: TranslationKey,
  parameters: Readonly<Record<string, string | number>> = {},
): string {
  return Object.entries(parameters).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    localeCatalogs[locale][key],
  );
}
