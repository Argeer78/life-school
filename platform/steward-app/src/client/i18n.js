/** @type {Set<string>} */
const supportedLocales = new Set(["en", "el"]);
const preferenceKey = "lifeschool.locale";
/** @type {Map<string, Record<string, string>>} */
const catalogCache = new Map();
let activeLocale = "en";
/** @type {Record<string, string>} */
let activeCatalog = {};

export function browserPreference() {
  try {
    const stored = window.localStorage.getItem(preferenceKey);
    return stored !== null && supportedLocales.has(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

/** @param {string} locale */
function storePreference(locale) {
  try {
    window.localStorage.setItem(preferenceKey, locale);
  } catch {
    // The interface still works when browser preference storage is unavailable.
  }
}

/** @param {string} locale */
async function loadCatalog(locale) {
  const cached = catalogCache.get(locale);
  if (cached !== undefined) return cached;

  const response = await fetch(`/i18n/locales/${locale}.json`);
  if (!response.ok) throw new Error("Locale catalog is unavailable.");
  const catalog = await response.json();
  if (typeof catalog !== "object" || catalog === null) {
    throw new TypeError("Locale catalog is malformed.");
  }
  const stringCatalog = /** @type {Record<string, string>} */ (catalog);
  catalogCache.set(locale, stringCatalog);
  return stringCatalog;
}

/** @param {HTMLElement} element */
function parametersFor(element) {
  return Object.fromEntries(
    Object.entries(element.dataset)
      .filter(([name]) => name.startsWith("i18nParam"))
      .map(([name, value]) => [
        name.slice("i18nParam".length).toLowerCase(),
        value ?? "",
      ]),
  );
}

/**
 * @param {string} value
 * @param {Readonly<Record<string, string | number>>} parameters
 */
function interpolate(value, parameters = {}) {
  return Object.entries(parameters).reduce(
    (text, [name, replacement]) =>
      text.replaceAll(`{${name}}`, String(replacement)),
    value,
  );
}

/**
 * @param {string} key
 * @param {Readonly<Record<string, string | number>>} parameters
 */
export function translate(key, parameters = {}) {
  const value = activeCatalog[key];
  return typeof value === "string" ? interpolate(value, parameters) : key;
}

/** @param {Document | Element} root */
export function applyTranslations(root = document) {
  for (const element of root.querySelectorAll("[data-i18n]")) {
    if (!(element instanceof HTMLElement)) continue;
    const key = element.getAttribute("data-i18n");
    if (key !== null) {
      element.textContent = translate(key, parametersFor(element));
    }
  }
  for (const element of root.querySelectorAll("[data-i18n-placeholder]")) {
    const key = element.getAttribute("data-i18n-placeholder");
    if (key !== null && element instanceof HTMLTextAreaElement) {
      element.placeholder = translate(key, parametersFor(element));
    }
  }
  for (const element of root.querySelectorAll("[data-i18n-aria-label]")) {
    if (!(element instanceof HTMLElement)) continue;
    const key = element.getAttribute("data-i18n-aria-label");
    if (key !== null) {
      element.setAttribute(
        "aria-label",
        translate(key, parametersFor(element)),
      );
    }
  }

  for (const button of root.querySelectorAll("[data-locale]")) {
    if (button instanceof HTMLButtonElement) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.locale === activeLocale),
      );
    }
  }
}

/** @param {string} locale */
export async function setLocale(locale) {
  if (!supportedLocales.has(locale)) return;
  activeLocale = locale;
  activeCatalog = await loadCatalog(locale);
  storePreference(locale);
  document.documentElement.lang = locale;
  applyTranslations();
  window.dispatchEvent(
    new CustomEvent("lifeschool:locale-change", {
      detail: { locale },
    }),
  );
}

export async function initializeI18n() {
  activeLocale = browserPreference();
  try {
    activeCatalog = await loadCatalog(activeLocale);
  } catch {
    activeLocale = "en";
    activeCatalog = await loadCatalog("en");
  }
  document.documentElement.lang = activeLocale;

  for (const button of document.querySelectorAll("[data-locale]")) {
    if (button instanceof HTMLButtonElement) {
      button.addEventListener("click", () => {
        void setLocale(button.dataset.locale ?? "en");
      });
    }
  }
  applyTranslations();
  return {
    get locale() {
      return activeLocale;
    },
    setLocale,
    translate,
  };
}
