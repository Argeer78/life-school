import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("careers production page", () => {
  it("maps /careers and serves future hiring content", async () => {
    const [serverSource, careers] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/careers.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/careers"');
    expect(serverSource).toContain('"/careers/"');
    expect(serverSource).toContain('"careers.html"');

    expect(careers).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(careers).toContain('rel="canonical" href="https://lifesh.app/careers"');
    expect(careers).toContain('property="og:title" content="Careers | Lifeschool"');
    expect(careers).toContain('name="twitter:card" content="summary_large_image"');
    expect(careers).toContain('"@type": "WebPage"');

    expect(careers).toContain('aria-label="Main navigation"');
    expect(careers).toContain('data-i18n="careers.currentMessageTitle"');
    expect(careers).toContain('data-i18n="careers.currentLine1"');
    expect(careers).toContain('data-i18n="careers.currentLine2"');
    expect(careers).toContain('data-i18n="careers.currentLine3"');
    expect(careers).toContain('data-i18n="careers.futureInterestTitle"');
    expect(careers).toContain('data-i18n="careers.interestEducation"');
    expect(careers).toContain('data-i18n="careers.interestResearch"');
    expect(careers).toContain('data-i18n="careers.interestCurriculum"');
    expect(careers).toContain('data-i18n="careers.interestEngineering"');
    expect(careers).toContain('data-i18n="careers.interestTranslation"');
    expect(careers).toContain('data-i18n="careers.interestAccessibility"');
    expect(careers).toContain('data-i18n="careers.interestDesign"');
    expect(careers).toContain('data-i18n="careers.ctaButton"');

    expect(careers).toContain('data-theme-toggle');
    expect(careers).toContain('data-locale="en"');
    expect(careers).toContain('data-locale="el"');
  });

  it("provides careers locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navCareers",
      "careers.documentTitle",
      "careers.currentMessageTitle",
      "careers.currentLine1",
      "careers.currentLine2",
      "careers.currentLine3",
      "careers.futureInterestTitle",
      "careers.interestEducation",
      "careers.interestResearch",
      "careers.interestCurriculum",
      "careers.interestEngineering",
      "careers.interestTranslation",
      "careers.interestAccessibility",
      "careers.interestDesign",
      "careers.ctaButton",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
