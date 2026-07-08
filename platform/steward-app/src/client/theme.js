const storageKey = "lifeschool-theme";

function preferredTheme() {
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** @param {"light" | "dark"} theme */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(storageKey, theme);
  const toggles = document.querySelectorAll("[data-theme-toggle]");
  for (const toggle of toggles) {
    if (!(toggle instanceof HTMLButtonElement)) continue;
    const isDark = theme === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.textContent = isDark ? "Light mode" : "Dark mode";
  }
}

const initialTheme = preferredTheme();
applyTheme(initialTheme);

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
