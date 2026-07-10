const endpoint = "/api/analytics";
let initialized = false;

/** @param {string} pathname */
function moduleSlugFromPath(pathname) {
  const match = pathname.match(/^\/courses\/([a-z-]+)(?:\/|$)/);
  return match?.[1] ?? null;
}

/** @param {Record<string, unknown>} payload */
async function sendAnalytics(payload) {
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Ignore analytics network errors. Learning UX must never be blocked.
  }
}

/** @param {string} type @param {Record<string, unknown>} [details] */
export function trackEvent(type, details = {}) {
  void sendAnalytics({ type, ...details });
}

function trackPageVisit() {
  const locale = document.documentElement.lang === "el" ? "el" : "en";
  trackEvent("page_view", {
    path: window.location.pathname,
    locale,
  });
}

function trackModuleStartedForCurrentPage() {
  const moduleSlug = moduleSlugFromPath(window.location.pathname);
  if (moduleSlug === null) return;
  const isModuleRoot = new RegExp(`^/courses/${moduleSlug}/?$`).test(window.location.pathname);
  if (isModuleRoot) {
    trackEvent("module_started", { moduleSlug });
  }
}

function bindModuleStartClickTracking() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const moduleLink = target.closest("a[data-module-start-track]");
    if (!(moduleLink instanceof HTMLAnchorElement)) return;
    const moduleSlug = moduleLink.dataset.moduleStartTrack;
    if (typeof moduleSlug !== "string" || moduleSlug.length === 0) return;
    trackEvent("module_started", { moduleSlug });
  });
}

function bindLessonAndModuleEvents() {
  window.addEventListener("lifeschool:lesson-completed", (event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail = event.detail;
    if (typeof detail !== "object" || detail === null) return;
    const moduleSlug = typeof detail.moduleSlug === "string" ? detail.moduleSlug : "";
    const lessonNumber = typeof detail.lessonNumber === "number" ? detail.lessonNumber : 0;
    const durationMs = typeof detail.durationMs === "number" ? detail.durationMs : 0;
    if (moduleSlug.length === 0 || lessonNumber < 1 || lessonNumber > 6) return;
    trackEvent("lesson_completed", { moduleSlug, lessonNumber });
    trackEvent("lesson_duration", { moduleSlug, lessonNumber, durationMs: Math.max(0, Math.round(durationMs)) });
  });

  window.addEventListener("lifeschool:module-completed", (event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail = event.detail;
    if (typeof detail !== "object" || detail === null) return;
    const moduleSlug = typeof detail.moduleSlug === "string" ? detail.moduleSlug : "";
    if (moduleSlug.length === 0) return;
    trackEvent("module_completed", { moduleSlug });
  });

  window.addEventListener("lifeschool:module-helpful", (event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail = event.detail;
    if (typeof detail !== "object" || detail === null) return;
    const moduleSlug = typeof detail.moduleSlug === "string" ? detail.moduleSlug : "";
    if (moduleSlug.length === 0) return;
    trackEvent("module_helpful", { moduleSlug });
  });
}

function bindLanguageUsageTracking() {
  window.addEventListener("lifeschool:locale-change", (event) => {
    if (!(event instanceof CustomEvent)) return;
    const locale = event.detail?.locale === "el" ? "el" : "en";
    trackEvent("language_usage", { locale });
  });
}

export function initializeInternalAnalytics() {
  if (initialized) return;
  initialized = true;
  trackPageVisit();
  trackModuleStartedForCurrentPage();
  bindModuleStartClickTracking();
  bindLessonAndModuleEvents();
  bindLanguageUsageTracking();
}
