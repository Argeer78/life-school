import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("legal production pages", () => {
  it("keeps privacy and terms pages with SEO, accessibility, and legal disclosures", async () => {
    const [privacy, terms] = await Promise.all([
      readFile(new URL("../../src/client/privacy.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/terms.html", import.meta.url), "utf8"),
    ]);

    for (const page of [privacy, terms]) {
      expect(page).toContain('name="viewport" content="width=device-width, initial-scale=1"');
      expect(page).toContain('name="description"');
      expect(page).toContain('rel="canonical"');
      expect(page).toContain('aria-label="Main navigation"');
      expect(page).toContain('aria-label="Site links"');
      expect(page).toContain('href="/about"');
      expect(page).toContain('href="/privacy"');
      expect(page).toContain('href="/terms"');
      expect(page).toContain('href="/contact"');
    }

    expect(privacy).toContain('data-i18n="privacy.sessionStorageTitle"');
    expect(privacy).toContain('data-i18n="privacy.languagePreferenceTitle"');
    expect(privacy).toContain('data-i18n="privacy.noHistoryTitle"');
    expect(privacy).toContain('data-i18n="privacy.openAiTitle"');
    expect(privacy).toContain('data-i18n="privacy.contactProcessingTitle"');
    expect(privacy).toContain('data-i18n="privacy.cookiesTitle"');

    expect(terms).toContain('data-i18n="terms.storageTitle"');
    expect(terms).toContain('data-i18n="terms.openAiTitle"');
    expect(terms).toContain('data-i18n="terms.contactProcessingTitle"');
    expect(terms).toContain('data-i18n="terms.cookiesTitle"');
  });

  it("implements cookie banner choice without analytics or advertising cookies", async () => {
    const [theme, styles] = await Promise.all([
      readFile(new URL("../../src/client/theme.js", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/styles.css", import.meta.url), "utf8"),
    ]);

    expect(theme).toContain('const cookieChoiceKey = "lifeschool.cookie.choice"');
    expect(theme).toContain("ensureCookieBanner");
    expect(theme).toContain('data-cookie-choice="accepted"');
    expect(theme).toContain('data-cookie-choice="declined"');
    expect(theme).toContain('window.localStorage.setItem(cookieChoiceKey, value)');
    expect(theme).not.toMatch(/gtag|segment|mixpanel|amplitude|hotjar|facebook|clarity|telemetry/i);
    expect(styles).toContain(".cookie-banner");
    expect(styles).toContain(".cookie-banner-actions");
  });

  it("keeps about/contact legal footer links complete", async () => {
    const [about, contact] = await Promise.all([
      readFile(new URL("../../src/client/about.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/contact.html", import.meta.url), "utf8"),
    ]);

    for (const page of [about, contact]) {
      expect(page).toContain('href="/about"');
      expect(page).toContain('href="/privacy"');
      expect(page).toContain('href="/terms"');
      expect(page).toContain('href="/contact"');
    }
  });

  it("keeps representative pages PWA-ready with theme runtime and viewport accessibility", async () => {
    const [home, courses, lesson, learn] = await Promise.all([
      readFile(new URL("../../src/client/index.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/courses.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/lesson.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/learn.html", import.meta.url), "utf8"),
    ]);

    for (const page of [home, courses, lesson, learn]) {
      expect(page).toContain('name="viewport" content="width=device-width, initial-scale=1"');
      expect(page).toContain('name="color-scheme" content="light dark"');
      expect(page).toContain('src="/theme.js"');
    }
  });
});
