const storageKey = "lifeschool-theme";
const cookieChoiceKey = "lifeschool.cookie.choice";
const pwaDismissKey = "lifeschool.pwa.dismissed";
const feedbackStartedAt = Date.now();

/**
 * @typedef {Event & {
 *   prompt: () => Promise<void>,
 *   userChoice: Promise<{ outcome: "accepted" | "dismissed", platform: string }>
 * }} LifeschoolBeforeInstallPromptEvent
 */

const uiCopy = {
  en: {
    themeDark: "Dark mode",
    themeLight: "Light mode",
    feedback: "Send feedback",
    feedbackTitle: "Share feedback",
    feedbackMessage: "Message",
    feedbackCategory: "Category",
    feedbackEmail: "Optional email",
    feedbackSubmit: "Send",
    feedbackCancel: "Cancel",
    feedbackSuccess: "Feedback sent. Thank you for helping improve Lifeschool.",
    feedbackError: "Feedback could not be sent right now. Please try again.",
    feedbackRateLimited: "Too many feedback submissions. Please wait and try again.",
    cookieTitle: "Cookie and storage choice",
    cookieBody:
      "Lifeschool uses storage for session continuity, language preference, and your cookie choice only. No analytics and no advertising cookies.",
    cookieAccept: "Accept",
    cookieDecline: "Decline",
    pwaInstallTitle: "Install Lifeschool app",
    pwaInstallBody: "Install for faster launch, offline lessons you have already visited, and a full-screen experience.",
    pwaInstallNow: "Install",
    pwaInstallLater: "Later",
    pwaIosBody: "Add Lifeschool to your Home Screen from the browser Share menu for an app-like experience.",
    pwaUpdateTitle: "Update available",
    pwaUpdateBody: "A new Lifeschool version is ready.",
    pwaUpdateNow: "Update now",
  },
  el: {
    themeDark: "Σκοτεινή λειτουργία",
    themeLight: "Φωτεινή λειτουργία",
    feedback: "Σχόλια",
    feedbackTitle: "Στείλε σχόλιο",
    feedbackMessage: "Μήνυμα",
    feedbackCategory: "Κατηγορία",
    feedbackEmail: "Email (προαιρετικό)",
    feedbackSubmit: "Αποστολή",
    feedbackCancel: "Ακύρωση",
    feedbackSuccess: "Το σχόλιο στάλθηκε. Ευχαριστούμε.",
    feedbackError: "Το σχόλιο δεν στάλθηκε τώρα. Δοκίμασε ξανά.",
    feedbackRateLimited: "Πολλά σχόλια σε σύντομο χρόνο. Δοκίμασε ξανά αργότερα.",
    cookieTitle: "Επιλογή για cookies και αποθήκευση",
    cookieBody:
      "Το Lifeschool χρησιμοποιεί αποθήκευση μόνο για συνέχεια συνεδρίας, προτίμηση γλώσσας και την επιλογή σου για cookies. Χωρίς αναλυτικά και χωρίς διαφημιστικά cookies.",
    cookieAccept: "Αποδοχή",
    cookieDecline: "Απόρριψη",
    pwaInstallTitle: "Εγκατάσταση εφαρμογής Lifeschool",
    pwaInstallBody: "Εγκατάστησε την εφαρμογή για ταχύτερο άνοιγμα, πρόσβαση χωρίς δίκτυο σε μαθήματα που έχεις ήδη δει και εμπειρία πλήρους οθόνης.",
    pwaInstallNow: "Εγκατάσταση",
    pwaInstallLater: "Αργότερα",
    pwaIosBody: "Πρόσθεσε το Lifeschool στην Αρχική οθόνη από το μενού Κοινοποίηση του προγράμματος για εμπειρία εφαρμογής.",
    pwaUpdateTitle: "Διαθέσιμη ενημέρωση",
    pwaUpdateBody: "Μια νέα έκδοση Lifeschool είναι έτοιμη.",
    pwaUpdateNow: "Ενημέρωση τώρα",
  },
};

/** @type {LifeschoolBeforeInstallPromptEvent | null} */
let deferredInstallPrompt = null;
/** @type {ServiceWorkerRegistration | null} */
let pwaRegistration = null;

function isStandaloneMode() {
  const standaloneNav = /** @type {Navigator & { standalone?: boolean }} */ (window.navigator);
  return window.matchMedia("(display-mode: standalone)").matches ||
    standaloneNav.standalone === true;
}

/** @param {string} name @param {string} value */
function ensureNamedMeta(name, value) {
  /** @type {HTMLMetaElement | null} */
  let meta = /** @type {HTMLMetaElement | null} */ (
    document.querySelector(`meta[name='${name}']`)
  );
  if (!(meta instanceof HTMLMetaElement)) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.append(meta);
  }
  meta.content = value;
}

function ensurePwaHead() {
  /** @type {HTMLLinkElement | null} */
  let manifest = /** @type {HTMLLinkElement | null} */ (
    document.querySelector("link[rel='manifest']")
  );
  if (!(manifest instanceof HTMLLinkElement)) {
    manifest = document.createElement("link");
    manifest.rel = "manifest";
    document.head.append(manifest);
  }
  manifest.href = "/manifest.webmanifest";

  /** @type {HTMLLinkElement | null} */
  let appleIcon = /** @type {HTMLLinkElement | null} */ (
    document.querySelector("link[rel='apple-touch-icon']")
  );
  if (!(appleIcon instanceof HTMLLinkElement)) {
    appleIcon = document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    appleIcon.sizes = "180x180";
    document.head.append(appleIcon);
  }
  appleIcon.href = "/pwa/apple-touch-icon-180.png";

  /** @type {HTMLLinkElement | null} */
  let splash = /** @type {HTMLLinkElement | null} */ (
    document.querySelector("link[rel='apple-touch-startup-image']")
  );
  if (!(splash instanceof HTMLLinkElement)) {
    splash = document.createElement("link");
    splash.rel = "apple-touch-startup-image";
    document.head.append(splash);
  }
  splash.href = "/pwa/apple-splash-2048x2732.png";

  ensureNamedMeta("mobile-web-app-capable", "yes");
  ensureNamedMeta("apple-mobile-web-app-capable", "yes");
  ensureNamedMeta("apple-mobile-web-app-status-bar-style", "default");
  ensureNamedMeta("apple-mobile-web-app-title", "Lifeschool");
  ensureNamedMeta("msapplication-TileColor", "#1e3a8a");
}

/** @param {"light" | "dark"} theme */
function applyThemeColor(theme) {
  ensureNamedMeta("theme-color", theme === "dark" ? "#08101f" : "#f6f7fa");
}

function pwaDismissed() {
  try {
    return window.localStorage.getItem(pwaDismissKey) === "1";
  } catch {
    return false;
  }
}

function rememberPwaDismissal() {
  try {
    window.localStorage.setItem(pwaDismissKey, "1");
  } catch {
    // Continue gracefully when storage is unavailable.
  }
}

function removePwaInstallBanner() {
  const banner = document.querySelector(".pwa-install-banner");
  if (banner instanceof HTMLElement) {
    banner.remove();
  }
}

function removePwaUpdateBanner() {
  const banner = document.querySelector(".pwa-update-banner");
  if (banner instanceof HTMLElement) {
    banner.remove();
  }
}

function updatePwaBannerText() {
  const copy = copyForLocale();
  const install = document.querySelector(".pwa-install-banner");
  if (install instanceof HTMLElement) {
    const title = install.querySelector(".pwa-title");
    const body = install.querySelector(".pwa-body");
    const installButton = install.querySelector(".pwa-install-now");
    const laterButton = install.querySelector(".pwa-install-later");
    if (title instanceof HTMLElement) title.textContent = copy.pwaInstallTitle;
    if (body instanceof HTMLElement) {
      body.textContent = deferredInstallPrompt === null
        ? copy.pwaIosBody
        : copy.pwaInstallBody;
    }
    if (installButton instanceof HTMLButtonElement) {
      installButton.textContent = deferredInstallPrompt === null
        ? copy.pwaInstallLater
        : copy.pwaInstallNow;
    }
    if (laterButton instanceof HTMLButtonElement) {
      laterButton.textContent = copy.pwaInstallLater;
    }
  }

  const update = document.querySelector(".pwa-update-banner");
  if (update instanceof HTMLElement) {
    const title = update.querySelector(".pwa-title");
    const body = update.querySelector(".pwa-body");
    const now = update.querySelector(".pwa-update-now");
    if (title instanceof HTMLElement) title.textContent = copy.pwaUpdateTitle;
    if (body instanceof HTMLElement) body.textContent = copy.pwaUpdateBody;
    if (now instanceof HTMLButtonElement) now.textContent = copy.pwaUpdateNow;
  }
}

function ensurePwaInstallBanner() {
  if (isStandaloneMode() || pwaDismissed()) return;
  if (document.querySelector(".pwa-install-banner") instanceof HTMLElement) return;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  if (deferredInstallPrompt === null && !isIos) return;

  const copy = copyForLocale();
  const banner = document.createElement("section");
  banner.className = "pwa-install-banner";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.innerHTML = `<div class="pwa-banner-content">
      <p class="pwa-title"></p>
      <p class="pwa-body"></p>
    </div>
    <div class="pwa-banner-actions">
      <button type="button" class="pwa-install-now"></button>
      <button type="button" class="pwa-install-later"></button>
    </div>`;

  const installNow = banner.querySelector(".pwa-install-now");
  const installLater = banner.querySelector(".pwa-install-later");

  if (installNow instanceof HTMLButtonElement) {
    installNow.addEventListener("click", async () => {
      if (deferredInstallPrompt === null) {
        rememberPwaDismissal();
        removePwaInstallBanner();
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      rememberPwaDismissal();
      removePwaInstallBanner();
    });
  }
  if (installLater instanceof HTMLButtonElement) {
    installLater.addEventListener("click", () => {
      rememberPwaDismissal();
      removePwaInstallBanner();
    });
  }

  document.body.append(banner);
  updatePwaBannerText();
}

function ensurePwaUpdateBanner() {
  if (!(pwaRegistration?.waiting instanceof ServiceWorker)) return;
  if (document.querySelector(".pwa-update-banner") instanceof HTMLElement) return;
  const banner = document.createElement("section");
  banner.className = "pwa-update-banner";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.innerHTML = `<div class="pwa-banner-content">
      <p class="pwa-title"></p>
      <p class="pwa-body"></p>
    </div>
    <div class="pwa-banner-actions">
      <button type="button" class="pwa-update-now"></button>
    </div>`;

  const updateNow = banner.querySelector(".pwa-update-now");
  if (updateNow instanceof HTMLButtonElement) {
    updateNow.addEventListener("click", () => {
      pwaRegistration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
  }

  document.body.append(banner);
  updatePwaBannerText();
}

async function registerPwaRuntime() {
  if (!("serviceWorker" in window.navigator)) return;
  try {
    pwaRegistration = await window.navigator.serviceWorker.register("/sw.js");
    if (pwaRegistration.waiting instanceof ServiceWorker) {
      ensurePwaUpdateBanner();
    }
    pwaRegistration.addEventListener("updatefound", () => {
      const installing = pwaRegistration?.installing;
      if (!(installing instanceof ServiceWorker)) return;
      installing.addEventListener("statechange", () => {
        if (
          installing.state === "installed" &&
          window.navigator.serviceWorker.controller instanceof ServiceWorker
        ) {
          ensurePwaUpdateBanner();
        }
      });
    });

    let refreshed = false;
    window.navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });
  } catch {
    // Continue with core web experience when PWA registration is unavailable.
  }
}

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

  const button = document.createElement("button");
  button.type = "button";
  button.className = "feedback-fab";
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-controls", "feedback-modal");
  button.textContent = copyForLocale().feedback;
  button.setAttribute("aria-label", copyForLocale().feedback);
  button.addEventListener("click", () => {
    const dialog = document.querySelector("#feedback-modal");
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (!dialog.open) {
      dialog.showModal();
    }
  });
  document.body.append(button);
  moveFeedbackIntoLandmark();
}

function moveFeedbackIntoLandmark() {
  const button = document.querySelector(".feedback-fab");
  const landmark = document.querySelector("main");
  if (!(button instanceof HTMLButtonElement)) return;
  if (!(landmark instanceof HTMLElement)) return;
  if (button.parentElement === landmark) return;
  landmark.append(button);
}

function ensureFeedbackDialog() {
  if (document.querySelector("#feedback-modal") instanceof HTMLDialogElement) return;
  const dialog = document.createElement("dialog");
  dialog.id = "feedback-modal";
  dialog.className = "feedback-modal";
  dialog.innerHTML = `<form method="dialog" class="feedback-modal-shell" id="feedback-form" novalidate>
      <h2 class="feedback-title"></h2>
      <label>
        <span class="feedback-label feedback-category-label"></span>
        <select name="category" required>
          <option value="">Select category</option>
          <option>Suggest Improvement</option>
          <option>Report Bug</option>
          <option>Suggest Lesson</option>
          <option>General Feedback</option>
        </select>
      </label>
      <label>
        <span class="feedback-label feedback-message-label"></span>
        <textarea name="message" rows="6" maxlength="5000" required></textarea>
      </label>
      <label>
        <span class="feedback-label feedback-email-label"></span>
        <input name="email" type="email" maxlength="320" autocomplete="email" />
      </label>
      <p class="feedback-status" role="status" aria-live="polite"></p>
      <div class="feedback-actions">
        <button type="submit" class="feedback-submit"></button>
        <button type="button" class="feedback-cancel"></button>
      </div>
    </form>`;
  document.body.append(dialog);
  updateFeedbackDialogText();
  registerFeedbackDialogHandlers(dialog);
}

/** @param {FormData} formData */
function feedbackPayload(formData) {
  const width = window.visualViewport?.width ?? window.innerWidth;
  const height = window.visualViewport?.height ?? window.innerHeight;
  return {
    category: String(formData.get("category") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    page: window.location.pathname,
    language: document.documentElement.lang || "en",
    browser: window.navigator.userAgent,
    viewport: `${Math.round(width)}x${Math.round(height)}`,
    startedAt: feedbackStartedAt,
  };
}

/** @param {{category: string, message: string, email: string}} payload */
function validFeedback(payload) {
  if (payload.category.length === 0) return false;
  if (payload.message.length < 10) return false;
  if (payload.email.length === 0) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);
}

/** @param {unknown} value */
function feedbackErrorCode(value) {
  if (typeof value !== "object" || value === null) return "REQUEST_FAILED";
  if (!("error" in value) || typeof value.error !== "object" || value.error === null) {
    return "REQUEST_FAILED";
  }
  return "code" in value.error && typeof value.error.code === "string"
    ? value.error.code
    : "REQUEST_FAILED";
}

/** @param {HTMLFormElement} form @param {boolean} loading */
function setFeedbackLoading(form, loading) {
  const submit = form.querySelector(".feedback-submit");
  if (submit instanceof HTMLButtonElement) {
    submit.disabled = loading;
  }
}

/** @param {HTMLFormElement} form @param {string} message @param {"muted" | "success" | "error"} [tone] */
function setFeedbackStatus(form, message, tone = "muted") {
  const status = form.querySelector(".feedback-status");
  if (!(status instanceof HTMLElement)) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

/** @param {HTMLDialogElement} dialog */
function registerFeedbackDialogHandlers(dialog) {
  const form = dialog.querySelector("#feedback-form");
  const cancel = dialog.querySelector(".feedback-cancel");
  if (!(form instanceof HTMLFormElement) || !(cancel instanceof HTMLButtonElement)) return;

  cancel.addEventListener("click", () => {
    dialog.close();
    setFeedbackStatus(form, "");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = feedbackPayload(new FormData(form));
    if (!validFeedback(payload)) {
      setFeedbackStatus(form, copyForLocale().feedbackError, "error");
      return;
    }
    setFeedbackLoading(form, true);
    setFeedbackStatus(form, "Sending feedback...", "muted");
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(feedbackErrorCode(body));
        }
        form.reset();
        setFeedbackStatus(form, copyForLocale().feedbackSuccess, "success");
      })
      .catch((error) => {
        if (error instanceof Error && error.message === "RATE_LIMITED") {
          setFeedbackStatus(form, copyForLocale().feedbackRateLimited, "error");
          return;
        }
        if (
          error instanceof Error &&
          (error.message === "SPAM_DETECTED" || error.message === "INVALID_COMMUNICATION_REQUEST")
        ) {
          setFeedbackStatus(form, copyForLocale().feedbackError, "error");
          return;
        }
        setFeedbackStatus(form, copyForLocale().feedbackError, "error");
      })
      .finally(() => {
        setFeedbackLoading(form, false);
      });
  });
}

function updateFeedbackDialogText() {
  const copy = copyForLocale();
  const dialog = document.querySelector("#feedback-modal");
  if (!(dialog instanceof HTMLDialogElement)) return;
  const title = dialog.querySelector(".feedback-title");
  const category = dialog.querySelector(".feedback-category-label");
  const message = dialog.querySelector(".feedback-message-label");
  const email = dialog.querySelector(".feedback-email-label");
  const submit = dialog.querySelector(".feedback-submit");
  const cancel = dialog.querySelector(".feedback-cancel");
  if (title instanceof HTMLElement) title.textContent = copy.feedbackTitle;
  if (category instanceof HTMLElement) category.textContent = copy.feedbackCategory;
  if (message instanceof HTMLElement) message.textContent = copy.feedbackMessage;
  if (email instanceof HTMLElement) email.textContent = copy.feedbackEmail;
  if (submit instanceof HTMLButtonElement) submit.textContent = copy.feedbackSubmit;
  if (cancel instanceof HTMLButtonElement) cancel.textContent = copy.feedbackCancel;
}

function cookieChoice() {
  try {
    const stored = window.localStorage.getItem(cookieChoiceKey);
    return stored === "accepted" || stored === "declined" ? stored : null;
  } catch {
    return null;
  }
}

/** @param {"accepted" | "declined"} value */
function rememberCookieChoice(value) {
  try {
    window.localStorage.setItem(cookieChoiceKey, value);
  } catch {
    // If local storage is unavailable, banner remains present for the session.
  }
}

function removeCookieBanner() {
  const banner = document.querySelector(".cookie-banner");
  if (banner instanceof HTMLElement) {
    banner.remove();
  }
}

function updateCookieBannerText() {
  const banner = document.querySelector(".cookie-banner");
  if (!(banner instanceof HTMLElement)) return;
  const copy = copyForLocale();
  const title = banner.querySelector(".cookie-banner-title");
  const body = banner.querySelector(".cookie-banner-body");
  const accept = banner.querySelector("[data-cookie-choice='accepted']");
  const decline = banner.querySelector("[data-cookie-choice='declined']");
  if (title instanceof HTMLElement) title.textContent = copy.cookieTitle;
  if (body instanceof HTMLElement) body.textContent = copy.cookieBody;
  if (accept instanceof HTMLButtonElement) accept.textContent = copy.cookieAccept;
  if (decline instanceof HTMLButtonElement) decline.textContent = copy.cookieDecline;
}

function ensureCookieBanner() {
  if (cookieChoice() !== null) return;
  if (document.querySelector(".cookie-banner") instanceof HTMLElement) return;

  const copy = copyForLocale();
  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-modal", "false");
  banner.setAttribute("aria-live", "polite");
  banner.setAttribute("aria-label", copy.cookieTitle);
  banner.innerHTML = `<div class="cookie-banner-content">
      <p class="cookie-banner-title"></p>
      <p class="cookie-banner-body"></p>
    </div>
    <div class="cookie-banner-actions">
      <button type="button" data-cookie-choice="accepted"></button>
      <button type="button" data-cookie-choice="declined" class="secondary-cookie-action"></button>
    </div>`;

  /** @param {"accepted" | "declined"} choice */
  const applyChoice = (choice) => {
    rememberCookieChoice(choice);
    removeCookieBanner();
  };

  const accept = banner.querySelector("[data-cookie-choice='accepted']");
  const decline = banner.querySelector("[data-cookie-choice='declined']");
  if (accept instanceof HTMLButtonElement) {
    accept.addEventListener("click", () => applyChoice("accepted"));
  }
  if (decline instanceof HTMLButtonElement) {
    decline.addEventListener("click", () => applyChoice("declined"));
  }

  document.body.append(banner);
  updateCookieBannerText();
}

function updateFeedbackButtonText() {
  const button = document.querySelector(".feedback-fab");
  if (!(button instanceof HTMLButtonElement)) return;
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
  applyThemeColor(theme);
  const toggles = document.querySelectorAll("[data-theme-toggle]");
  for (const toggle of toggles) {
    if (!(toggle instanceof HTMLButtonElement)) continue;
    const isDark = theme === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    const nextThemeLabel = isDark ? copy.themeLight : copy.themeDark;
    toggle.textContent = nextThemeLabel;
    toggle.setAttribute("aria-label", nextThemeLabel);
  }
}

const initialTheme = preferredTheme();
ensureFavicon();
ensurePwaHead();
ensureFeedbackButton();
ensureFeedbackDialog();
moveFeedbackIntoLandmark();
const feedbackObserver = new MutationObserver(() => moveFeedbackIntoLandmark());
feedbackObserver.observe(document.body, { childList: true, subtree: true });
ensureCookieBanner();
updateFeedbackButtonText();
applyTheme(initialTheme);
void registerPwaRuntime();
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = /** @type {LifeschoolBeforeInstallPromptEvent} */ (event);
  ensurePwaInstallBanner();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  removePwaInstallBanner();
});
ensurePwaInstallBanner();

window.addEventListener("lifeschool:locale-change", () => {
  updateFeedbackButtonText();
  updateFeedbackDialogText();
  updateCookieBannerText();
  updatePwaBannerText();
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
