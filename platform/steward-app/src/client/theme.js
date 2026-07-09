const storageKey = "lifeschool-theme";

const uiCopy = {
  en: {
    themeDark: "Dark mode",
    themeLight: "Light mode",
    feedback: "Report an issue / Send feedback",
  },
  el: {
    themeDark: "Σκοτεινή λειτουργία",
    themeLight: "Φωτεινή λειτουργία",
    feedback: "Αναφορά προβλήματος / Σχόλια",
  },
};

function activeLocale() {
  return document.documentElement.lang === "el" ? "el" : "en";
}

function copyForLocale() {
  return uiCopy[activeLocale()];
}

function ensureFavicon() {
  const existing = document.querySelector('link[rel="icon"]');
  if (existing instanceof HTMLLinkElement) return;
  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/svg+xml";
  icon.href = "/favicon.svg";
  document.head.append(icon);
}

function ensureFeedbackButton() {
  if (document.querySelector(".feedback-fab") instanceof HTMLElement) return;

  const button = document.createElement("a");
  button.className = "feedback-fab";
  button.href = "/contact";
  button.textContent = copyForLocale().feedback;
  button.setAttribute("aria-label", "Report an issue or send feedback");
  document.body.append(button);
}

function updateFeedbackButtonText() {
  const button = document.querySelector(".feedback-fab");
  if (!(button instanceof HTMLAnchorElement)) return;
  const copy = copyForLocale();
  button.textContent = copy.feedback;
  button.setAttribute("aria-label", copy.feedback);
}

function preferredTheme() {
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** @param {"light" | "dark"} theme */
function applyTheme(theme) {
  const copy = copyForLocale();
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(storageKey, theme);
  const toggles = document.querySelectorAll("[data-theme-toggle]");
  for (const toggle of toggles) {
    if (!(toggle instanceof HTMLButtonElement)) continue;
    const isDark = theme === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.textContent = isDark ? copy.themeLight : copy.themeDark;
  }
}

const initialTheme = preferredTheme();
ensureFavicon();
ensureFeedbackButton();
updateFeedbackButtonText();
applyTheme(initialTheme);

window.addEventListener("lifeschool:locale-change", () => {
  updateFeedbackButtonText();
  const currentTheme = document.documentElement.dataset.theme === "dark"
    ? "dark"
    : "light";
  applyTheme(currentTheme);
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("[data-theme-toggle]");
  if (!(button instanceof HTMLButtonElement)) return;
  const current = document.documentElement.dataset.theme === "dark"
    ? "dark"
    : "light";
  applyTheme(current === "dark" ? "light" : "dark");
});
